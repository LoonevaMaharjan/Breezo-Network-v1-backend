import { NodeLatest } from "../models/nodelatest.model";
import { Node } from "../models/node.model";

export class NodeLatestRepository {

    /**
     * 🔄 UPSERT SENSOR DATA + REWARD
     */
    async upsertNodeLatest(data: any, rewardIncrement: number) {
        const { nodeId } = data;

        return NodeLatest.findOneAndUpdate(
            { nodeId },
            {
                $set: {
                    ...data,
                    lastSeen: new Date(),
                },
                $inc: {
                    reward: rewardIncrement,
                },
            },
            {
                upsert: true,
                new: true,
            }
        );
    }

    /**
     * 📊 GET ALL NODES (MAP VIEW)
     */
    async getAllNodesForMap() {
        return NodeLatest.find(
            {},
            {
                nodeId: 1,
                ownerEmail: 1,
                temperature: 1,
                humidity: 1,
                pm25: 1,
                pm10: 1,
                aqi: 1,
                aqiLevel: 1,
                reward: 1,
                location: 1,
                lastSeen: 1,
                updatedAt: 1,
            }
        );
    }

    /**
     * 🔍 FIND SINGLE NODE STATE
     */
    async findNodeLatest(nodeId: string) {
        return NodeLatest.findOne({ nodeId });
    }

    /**
     * 🔐 MARK SYNCING (avoid duplicate Solana calls)
     */
    async markSyncing(nodeId: string) {
        return NodeLatest.updateOne(
            { nodeId },
            { $set: { syncing: true } }
        );
    }

    /**
     * 🔓 CLEAR SYNC FLAG
     */
    async clearSyncFlag(nodeId: string) {
        return NodeLatest.updateOne(
            { nodeId },
            { $set: { syncing: false } }
        );
    }

    /**
     * 💰 RESET REWARD AFTER ONCHAIN SYNC
     */
    async resetReward(nodeId: string) {
        return NodeLatest.findOneAndUpdate(
            { nodeId },
            { $set: { reward: 0 } },
            { new: true }
        );
    }

    /**
     * 📡 GET USER NODES (DASHBOARD - EMAIL + WALLET SAFE)
     */
async getNodeByEmailAndWallet(ownerEmail: string, ownerWallet: string) {

  // 1. VERIFY OWNERSHIP FROM NODE REGISTRY
  const node = await Node.findOne({
    ownerEmail,
    ownerWallet,
    isLinked: true,
  });

  if (!node) return [];

  // 2. FETCH LIVE DATA
  const liveNodes = await NodeLatest.find({ nodeId: node.nodeId });

  // 3. FORMAT — include nodeAccount + ownerWallet from Node registry
  return liveNodes.map((n) => ({
    nodeId: n.nodeId,
    location: n.location || null,

    temperature: n.temperature,
    humidity:    n.humidity,

    pm25:     n.pm25,
    pm10:     n.pm10,
    aqi:      n.aqi,
    aqiLevel: n.aqiLevel,

    reward:   n.reward,
    syncing:  n.syncing,
    lastSeen: n.lastSeen,

    // ✅ THESE WERE MISSING — required for on-chain fetch + claim
    nodeAccount:      node.nodeAccount,
    ownerWallet:      node.ownerWallet,
    devicePublicKey:  node.devicePublicKey,
  }));
}

    /**
     * ⚡ UPDATE ONLY SENSOR DATA (FAST PATH)
     */
    async updateSensorData(nodeId: string, data: any) {
        return NodeLatest.findOneAndUpdate(
            { nodeId },
            {
                $set: {
                    ...data,
                    lastSeen: new Date(),
                },
            },
            { new: true }
        );
    }
}
