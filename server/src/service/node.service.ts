import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";
import BN from "bn.js";
import nacl from "tweetnacl";
import crypto from "crypto";
import { SolanaClient } from "../blockchain/solana.client";
import { NodeRepository } from "../repositories/node.repository";
import { NodeLatestRepository } from "../repositories/nodeLatest.repository";
import logger from "../config/logger.config";
import { SensorHistory } from "../models/sensorhistory.model";

export class NodeService {
  constructor(
    private nodeRepo: NodeRepository,
    private nodeLatestRepo: NodeLatestRepository,
    private solana: SolanaClient,
  ) {}

  
  // 📡 INGEST DATA (ESP32)
  
async ingestData(data: any) {
  const { nodeId, signature, payload, timestamp } = data;

  // 1. Fetch Node
  const node = await this.nodeRepo.findByNodeId(nodeId);
  if (!node || !node.isLinked) {
    throw new Error("Node not linked");
  }

  // 2. Replay Protection (Stale Check)
  // Window set to 60 seconds. timestamp must be a number.
  if (!timestamp || Date.now() - Number(timestamp) > 60_000) {
    throw new Error("Stale request");
  }

  // 3. Verify Identity Signature
  // We sign a fixed string combined with the nodeId for stability
  const message = `auth-node-${nodeId}`;

  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    bs58.decode(signature),
    bs58.decode(node.devicePublicKey)
  );

  if (!isValid) {
    throw new Error("Invalid device signature");
  }

  // 4. Extract Data & Calculate Rewards
  const { temperature, humidity, pm25, pm10, aqi, aqiLevel, location } = payload;
  const reward = this.calculateReward(pm25);

  // 5. Update Latest State
  const nodeLatest = await this.nodeLatestRepo.upsertNodeLatest(
    { nodeId, ownerEmail: node.ownerEmail, temperature, humidity, pm25, pm10, aqi, aqiLevel, location },
    reward
  );

  // 6. Async Sync to Solana
  if (
    nodeLatest.reward >= 10 &&
    !nodeLatest.syncing &&
    node.ownerWallet &&
    node.nodeAccount
  ) {
    await this.nodeLatestRepo.markSyncing(nodeId);
    this.syncToSolanaAsync(nodeLatest, node.ownerWallet, node.nodeAccount);
  }

  // 7. Save to History
  await SensorHistory.create({
    nodeId,
    ownerEmail: node.ownerEmail,
    temperature,
    humidity,
    pm25,
    pm10,
    aqi,
    aqiLevel,
    location,
  });

  return nodeLatest;
}

  
  // 🔗 REQUEST LINK
  
  async requestLink(devicePublicKey: string) {
    const node = await this.nodeRepo.findByPublicKey(devicePublicKey);

    if (!node) {
      throw new Error("Device not registered");
    }

    const challenge = crypto.randomBytes(32).toString("hex");
    await this.nodeRepo.setChallenge(devicePublicKey, challenge);

    return { devicePublicKey, challenge };
  }

  
  // 🔐 VERIFY LINK + CREATE ONCHAIN NODE
  
  async verifyLink(data: {
    devicePublicKey: string;
    signature: string;
    email: string;
    wallet: string;
  }) {
    if (!data.devicePublicKey || !data.signature || !data.email || !data.wallet) {
      throw new Error(
        `Missing fields — devicePublicKey: ${data.devicePublicKey}, signature: ${!!data.signature}, email: ${data.email}, wallet: ${data.wallet}`
      );
    }

    const node = await this.nodeRepo.findByPublicKey(data.devicePublicKey);

    if (!node || !node.linkChallenge) {
      throw new Error("Invalid link request");
    }

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(node.linkChallenge),
      bs58.decode(data.signature),
      bs58.decode(data.devicePublicKey),
    );

    if (!isValid) {
      throw new Error("Invalid signature");
    }

    const nodeAccount = await this.createNodeOnChain(
      data.devicePublicKey,
      data.wallet,
    );

    return this.nodeRepo.linkNode(
      data.devicePublicKey,
      data.email,
      data.wallet,
      nodeAccount,
    );
  }

  
  // 🧱 CREATE SOLANA NODE ACCOUNT

async createNodeOnChain(devicePublicKey: string, wallet: string) {
  const program = this.solana.program as any;

  // 🔍 log every account before passing to Anchor
  const nodeKeypair = anchor.web3.Keypair.generate();

  const accounts = {
    nodeAccount:     nodeKeypair.publicKey,
    owner:           new anchor.web3.PublicKey(wallet),
    authority:       this.solana.wallet.publicKey,
    devicePublicKey: new anchor.web3.PublicKey(devicePublicKey),
    systemProgram:   anchor.web3.SystemProgram.programId,
  };

  console.log("=== accounts ===");
  Object.entries(accounts).forEach(([k, v]) => console.log(k, "→", v?.toString()));

  // 🔍 log what Anchor sees in the IDL
  const ix = program.idl.instructions.find((i: any) => i.name === "initNode");
  console.log("=== IDL initNode ===", JSON.stringify(ix, null, 2));

  await program.methods
    .initNode()
    .accounts(accounts)
    .signers([nodeKeypair])
    .rpc();

  return nodeKeypair.publicKey.toString();
}

  // 🔄 SYNC TO SOLANA (fire and forget wrapper)

  async syncToSolanaAsync(
    nodeLatest: any,
    ownerWallet: string,
    nodeAccount: string,
  ) {
    try {
      await this.syncToSolana(nodeLatest, ownerWallet, nodeAccount);
      await this.nodeLatestRepo.resetReward(nodeLatest.nodeId);
    } catch (err) {
      logger.error("Solana sync failed:", err);
    } finally {
      await this.nodeLatestRepo.clearSyncFlag(nodeLatest.nodeId);
    }
  }


  // ⛓️ SYNC TO SOLANA (actual on-chain call)

  async syncToSolana(
    nodeLatest: any,
    ownerWallet: string,
    nodeAccount: string,
  ) {
    if (!nodeAccount) {
      throw new Error("nodeAccount is missing");
    }

    const program = this.solana.program as any;

    // verify on-chain owner matches
    const onchainNode = await program.account.nodeAccount.fetch(nodeAccount);

    if (onchainNode.owner.toString() !== ownerWallet) {
      throw new Error("On-chain owner mismatch");
    }

    await program.methods
      .addReward(new BN(Math.floor(nodeLatest.reward * 1e9)))
      .accounts({
        nodeAccount: nodeAccount,                          // ✅ matches IDL field name
        authority:   this.solana.wallet.publicKey,
      })
      .rpc();
  }


  //  CLAIM REWARD

  async claimReward(nodeId: string, user: any) {
    const node = await this.nodeRepo.findByNodeId(nodeId);

    if (!node) {
      throw new Error("Node not found");
    }

    if (node.ownerEmail !== user.email) {
      throw new Error("Unauthorized");
    }

    if (!node.nodeAccount) {
      throw new Error("Node not linked on-chain");
    }

    const nodeLatest = await this.nodeLatestRepo.findNodeLatest(nodeId);

    if (!nodeLatest || nodeLatest.reward <= 0) {
      throw new Error("No reward available");
    }

    const program = this.solana.program as any;

    //  claimReward requires owner to sign — must be called from frontend
    // Backend cannot sign on behalf of user wallet
    await program.methods
      .claimReward()
      .accounts({
        nodeAccount:   node.nodeAccount,                  // ✅ matches IDL field name
        owner:         new anchor.web3.PublicKey(node.ownerWallet!),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await this.nodeLatestRepo.resetReward(nodeId);

    return { success: true };
  }


  // 🧠 REWARD ENGINE
  
  calculateReward(pm25: number): number {
    if (pm25 > 300) return 0;
    if (pm25 < 50)  return 0.02;
    if (pm25 < 100) return 0.01;
    return 0.005;
  }

  
  // 📊 DASHBOARD
  
  async getUserDashboard(email: string) {
    return this.nodeLatestRepo.getNodesByEmail(email);
  }

  
  // 🧱 CREATE NODE (OFFCHAIN + INIT LATEST RECORD)
  
  async createNode(data: {
    nodeId: string;
    devicePublicKey: string;
    ownerEmail: string;
    ownerWallet: string;
  }) {
    const { nodeId, devicePublicKey, ownerEmail, ownerWallet } = data;

    const existing = await this.nodeRepo.findByNodeId(nodeId);

    if (existing) {
      throw new Error("Node already exists");
    }

    const node = await this.nodeRepo.createNode(
      nodeId,
      devicePublicKey,
      ownerEmail,
      ownerWallet,
    );

    await this.nodeLatestRepo.upsertNodeLatest(
      {
        nodeId,
        ownerEmail,
        temperature: 0,
        humidity:    0,
        pm25:        0,
        pm10:        0,
        aqi:         0,
        aqiLevel:    "UNKNOWN",
        location:    { lat: 0, lng: 0 },
      },
      0,
    );

    return node;
  }
}
