import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import bs58 from "bs58";
import crypto from "crypto";
import nacl from "tweetnacl";

import { SolanaClient } from "../blockchain/solana.client";
import logger from "../config/logger.config";
import { SensorHistory } from "../models/sensorhistory.model";
import { NodeRepository } from "../repositories/node.repository";
import { NodeLatestRepository } from "../repositories/nodeLatest.repository";
import { getIO } from "../socket";

export class NodeService {
  constructor(
    private nodeRepo: NodeRepository,
    private nodeLatestRepo: NodeLatestRepository,
    private solana: SolanaClient
  ) {}

  // =========================
  // INGEST DATA (ESP32)
  // =========================
  async ingestData(data: any) {
    const { nodeId, payload } = data;

    if (!nodeId || !payload) {
      throw new Error("Missing required fields");
    }

    const node = await this.nodeRepo.findByNodeId(nodeId);
    if (!node || !node.isLinked) {
      throw new Error("Node not linked");
    }

    const { temperature, humidity, pm25, pm10, aqi, aqiLevel, location } =
      payload;

    const reward = this.calculateReward(pm25);

    const nodeLatest = await this.nodeLatestRepo.upsertNodeLatest(
      {
        nodeId,
        ownerEmail: node.ownerEmail,
        temperature,
        humidity,
        pm25,
        pm10,
        aqi,
        aqiLevel,
        location,
      },
      reward
    );

    // WebSocket emit
    getIO().emit("node:update", {
      nodeId,
      lat: location?.lat,
      lng: location?.lng,
      temperature,
      humidity,
      pm25,
      pm10,
      aqi,
      aqiLevel,
      reward,
    });

    // History log
    SensorHistory.create({
      nodeId,
      ownerEmail: node.ownerEmail,
      temperature,
      humidity,
      pm25,
      pm10,
      aqi,
      aqiLevel,
      location,
    }).catch((err) => logger.error("SensorHistory error:", err));

    // =========================
    // SOLANA SYNC TRIGGER
    // =========================
    const totalReward = Number(nodeLatest.reward);

    if (
      totalReward >= 10 &&
      !nodeLatest.syncing &&
      node.ownerWallet &&
      node.nodeAccount
    ) {
      await this.nodeLatestRepo.markSyncing(nodeId);

      this.syncToSolanaAsync(
        nodeLatest,
        node.ownerWallet,
        node.nodeAccount
      ).catch((err) => logger.error("Solana sync error:", err));
    }

    return nodeLatest;
  }

  // =========================
  // CREATE NODE ON CHAIN
  // =========================
  async createNodeOnChain(devicePublicKey: string, wallet: string) {
    const program = this.solana.program as any;
    const nodeKeypair = anchor.web3.Keypair.generate();

    try {
      const accounts = {
        nodeAccount: nodeKeypair.publicKey,
        owner: new anchor.web3.PublicKey(wallet),
        authority: this.solana.wallet.publicKey,
        devicePublicKey: new anchor.web3.PublicKey(devicePublicKey),
        systemProgram: anchor.web3.SystemProgram.programId,
      };

      await program.methods
        .initNode()
        .accounts(accounts)
        .signers([nodeKeypair])
        .rpc();

      return nodeKeypair.publicKey.toString();
    } catch (err) {
      logger.error("createNodeOnChain failed:", err);
      throw new Error("Blockchain init failed");
    }
  }

  // =========================
  // SYNC TO SOLANA
  // =========================
 // syncToSolana in node.service.ts
async syncToSolana(
  nodeLatest: any,
  _ownerWallet: string,
  nodeAccountStr: string
) {
  const program = this.solana.program as any;

  const amountBN = new BN(
    Math.floor(Number(nodeLatest.reward) * 1e9)
  );

  const nodeAccountPubkey = new anchor.web3.PublicKey(nodeAccountStr);

  logger.info(`Syncing ${nodeLatest.reward} → ${nodeAccountStr}`);

  const tx = await program.methods
    .addReward(amountBN)
    .accounts({
      nodeAccount: nodeAccountPubkey,
      authority: this.solana.wallet.publicKey,
      backend: this.solana.wallet.publicKey,  // ← ADD THIS
    })
    .rpc();

  logger.info(`Reward synced TX: ${tx}`);
}

  // =========================
  // SYNC WRAPPER
  // =========================
  async syncToSolanaAsync(
    nodeLatest: any,
    ownerWallet: string,
    nodeAccount: string
  ) {
    try {
      await this.syncToSolana(nodeLatest, ownerWallet, nodeAccount);
      await this.nodeLatestRepo.resetReward(nodeLatest.nodeId);
    } catch (err) {
      logger.error("syncToSolanaAsync error:", err);
    } finally {
      await this.nodeLatestRepo.clearSyncFlag(nodeLatest.nodeId);
    }
  }

  // =========================
  // CLAIM PREP (FRONTEND)
  // =========================
  async claimReward(nodeId: string, user: any) {
    const node = await this.nodeRepo.findByNodeId(nodeId);

    if (!node || node.ownerEmail !== user.email || !node.nodeAccount) {
      throw new Error("Unauthorized");
    }

    const nodeLatest = await this.nodeLatestRepo.findNodeLatest(nodeId);

    if (!nodeLatest || Number(nodeLatest.reward) <= 0) {
      throw new Error("No reward available");
    }

    return {
      nodeAccount: node.nodeAccount,
      ownerWallet: node.ownerWallet,
      programId: this.solana.program.programId.toString(),
    };
  }

  // =========================
  // LINK DEVICE
  // =========================
  async requestLink(devicePublicKey: string) {
    const node = await this.nodeRepo.findByPublicKey(devicePublicKey);

    if (!node) throw new Error("Device not registered");

    const challenge = crypto.randomBytes(32).toString("hex");

    await this.nodeRepo.setChallenge(devicePublicKey, challenge);

    return { devicePublicKey, challenge };
  }

  async verifyLink(data: {
    devicePublicKey: string;
    signature: string;
    email: string;
    wallet: string;
  }) {
    const node = await this.nodeRepo.findByPublicKey(data.devicePublicKey);

    if (!node || !node.linkChallenge)
      throw new Error("Invalid link request");

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(node.linkChallenge),
      bs58.decode(data.signature),
      bs58.decode(data.devicePublicKey)
    );

    if (!isValid) throw new Error("Invalid signature");

    const nodeAccount = await this.createNodeOnChain(
      data.devicePublicKey,
      data.wallet
    );

    return this.nodeRepo.linkNode(
      data.devicePublicKey,
      data.email,
      data.wallet,
      nodeAccount
    );
  }

  // =========================
  // CREATE DB NODE
  // =========================
  async createNode(data: any) {
    const existing = await this.nodeRepo.findByNodeId(data.nodeId);
    if (existing) throw new Error("Node already exists");

    const node = await this.nodeRepo.createNode(
      data.nodeId,
      data.devicePublicKey,
      data.ownerEmail,
      data.ownerWallet
    );

    await this.nodeLatestRepo.upsertNodeLatest(
      {
        nodeId: data.nodeId,
        ownerEmail: data.ownerEmail,
        temperature: 0,
        humidity: 0,
        pm25: 0,
        pm10: 0,
        aqi: 0,
        aqiLevel: "UNKNOWN",
        location: { lat: 0, lng: 0 },
      },
      0
    );

    return node;
  }

  // =========================
  // DASHBOARD
  // =========================
  async getUserDashboard(email: string, wallet: string) {
    return this.nodeLatestRepo.getNodeByEmailAndWallet(email, wallet);
  }

  // =========================
  // REWARD LOGIC
  // =========================
  calculateReward(pm25: number): number {
    return 2;
  }
}
