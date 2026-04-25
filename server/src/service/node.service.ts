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

  /**
   * 📡 INGEST DATA (ESP32)
   * Validates device data and triggers reward sync if threshold met
   */
  async ingestData(data: any) {
    const { nodeId, signature, payload, timestamp } = data;

    if (!nodeId || !signature || !payload || !timestamp) {
      throw new Error("Missing required fields");
    }

    const node = await this.nodeRepo.findByNodeId(nodeId);
    if (!node || !node.isLinked) {
      throw new Error("Node not linked");
    }

    // Replay protection (60s window)
    if (Date.now() - Number(timestamp) > 60_000) {
      throw new Error("Stale request");
    }

    // Signature verification
    const message = `auth-node-${nodeId}`;
    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(node.devicePublicKey)
    );

    if (!isValid) {
      throw new Error("Invalid device signature");
    }

    const { temperature, humidity, pm25, pm10, aqi, aqiLevel, location } = payload;
    const reward = this.calculateReward(pm25);

    // Update state in DB
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

    // Async history log
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

    // 🔄 SOLANA REWARD SYNC
    // Use Number() to ensure reward is compared correctly
    const currentTotalReward = Number(nodeLatest.reward);

    if (
      currentTotalReward >= 10 &&
      !nodeLatest.syncing &&
      node.ownerWallet &&
      node.nodeAccount
    ) {
      await this.nodeLatestRepo.markSyncing(nodeId);

      // Fire and forget Solana transaction
      this.syncToSolanaAsync(
        nodeLatest,
        node.ownerWallet,
        node.nodeAccount
      ).catch((err) => logger.error("Solana async logic error:", err));
    }

    return nodeLatest;
  }

  /**
   * 🧱 CREATE SOLANA NODE ACCOUNT
   * Called during verifyLink to initialize the on-chain storage
   */
  async createNodeOnChain(devicePublicKey: string, wallet: string) {
    const program = this.solana.program as any;
    const nodeKeypair = anchor.web3.Keypair.generate();

    try {
      const accounts = {
        nodeAccount: nodeKeypair.publicKey,
        owner: new anchor.web3.PublicKey(wallet),
        authority: this.solana.wallet.publicKey, // Backend is the authority
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
      logger.error("Failed to initialize node on-chain:", err);
      throw new Error("Blockchain initialization failed");
    }
  }

  /**
   * 🔄 SYNC TO SOLANA (Actual logic)
   */
  async syncToSolana(nodeLatest: any, ownerWallet: string, nodeAccountStr: string) {
    const program = this.solana.program as any;

    // Convert reward to lamports (9 decimals)
    const amountBN = new BN(Math.floor(Number(nodeLatest.reward) * 1e9));
    const nodeAccountPubkey = new anchor.web3.PublicKey(nodeAccountStr);

    logger.info(`Syncing ${nodeLatest.reward} rewards to ${nodeAccountStr}...`);

    const tx = await program.methods
      .addReward(amountBN)
      .accounts({
        nodeAccount: nodeAccountPubkey,
        authority: this.solana.wallet.publicKey, // Must be the signer stored in Rust's node.authority
      })
      .rpc();

    logger.info(`Solana reward added successfully. TX: ${tx}`);
  }

  /**
   * 🔄 SYNC WRAPPER
   */
  async syncToSolanaAsync(nodeLatest: any, ownerWallet: string, nodeAccount: string) {
    try {
      await this.syncToSolana(nodeLatest, ownerWallet, nodeAccount);
      await this.nodeLatestRepo.resetReward(nodeLatest.nodeId);
    } catch (err) {
      logger.error(`Sync failed for node ${nodeLatest.nodeId}:`, err);
    } finally {
      await this.nodeLatestRepo.clearSyncFlag(nodeLatest.nodeId);
    }
  }

  /**
   * 🔐 CLAIM REWARD (DATA PREP)
   * Note: This must be finalized by the frontend because the user must sign
   */
  async claimReward(nodeId: string, user: any) {
    const node = await this.nodeRepo.findByNodeId(nodeId);
    if (!node || node.ownerEmail !== user.email || !node.nodeAccount) {
      throw new Error("Unauthorized or node not ready");
    }

    const nodeLatest = await this.nodeLatestRepo.findNodeLatest(nodeId);
    if (!nodeLatest || Number(nodeLatest.reward) <= 0) {
      throw new Error("No reward available in DB to sync");
    }

    // This part should technically trigger the claim.
    // WARNING: This will fail if called from backend because 'owner' is a Signer in Rust.
    // Use this method to return the necessary data to the frontend instead.
    return {
      nodeAccount: node.nodeAccount,
      ownerWallet: node.ownerWallet,
      programId: this.solana.program.programId.toString(),
    };
  }

  // --- Utility & Existing Methods ---

  calculateReward(pm25: number): number {
    return 10; // Fixed reward as per your logic
  }

  async requestLink(devicePublicKey: string) {
    const node = await this.nodeRepo.findByPublicKey(devicePublicKey);
    if (!node) throw new Error("Device not registered");
    const challenge = crypto.randomBytes(32).toString("hex");
    await this.nodeRepo.setChallenge(devicePublicKey, challenge);
    return { devicePublicKey, challenge };
  }

  async verifyLink(data: { devicePublicKey: string; signature: string; email: string; wallet: string }) {
    const node = await this.nodeRepo.findByPublicKey(data.devicePublicKey);
    if (!node || !node.linkChallenge) throw new Error("Invalid link request");

    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(node.linkChallenge),
      bs58.decode(data.signature),
      bs58.decode(data.devicePublicKey)
    );

    if (!isValid) throw new Error("Invalid signature");

    const nodeAccount = await this.createNodeOnChain(data.devicePublicKey, data.wallet);
    return this.nodeRepo.linkNode(data.devicePublicKey, data.email, data.wallet, nodeAccount);
  }

  async createNode(data: any) {
    const { nodeId, devicePublicKey, ownerEmail, ownerWallet } = data;
    const existing = await this.nodeRepo.findByNodeId(nodeId);
    if (existing) throw new Error("Node already exists");

    const node = await this.nodeRepo.createNode(nodeId, devicePublicKey, ownerEmail, ownerWallet);
    await this.nodeLatestRepo.upsertNodeLatest({
      nodeId, ownerEmail, temperature: 0, humidity: 0, pm25: 0, pm10: 0, aqi: 0, aqiLevel: "UNKNOWN", location: { lat: 0, lng: 0 }
    }, 0);
    return node;
  }

  async getUserDashboard(email: string) {
    return this.nodeLatestRepo.getNodesByEmail(email);
  }
}
