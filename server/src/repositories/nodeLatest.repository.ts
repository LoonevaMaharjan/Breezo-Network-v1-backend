import { NodeLatest } from "../models/nodelatest.model";

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
                    lastSeen: new Date()
                },
                $inc: {
                    reward: rewardIncrement
                }
            },
            {
                upsert: true,
                new: true
            }
        );
    }

    /**
     * 📊 GET ALL NODES (MAP VIEW)
     */
    async getAllNodesForMap() {
        return NodeLatest.find({}, {
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
            updatedAt: 1
        });
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
         NodeLatest.updateOne(
            { nodeId },
            { syncing: true }
        );
        return
    }

    /**
     * 🔓 CLEAR SYNC FLAG
     */
    async clearSyncFlag(nodeId: string) {
        return NodeLatest.updateOne(
            { nodeId },
            { syncing: false }
        );
    }

    /**
     * 💰 RESET REWARD AFTER ONCHAIN SYNC
     */
    async resetReward(nodeId: string) {
        return NodeLatest.findOneAndUpdate(
            { nodeId },
            { reward: 0 },
            { new: true }
        );
    }

    /**
     * 📡 GET USER NODES (DASHBOARD)
     */
    async getNodesByEmail(email: string) {
        return NodeLatest.find({ ownerEmail: email });
    }

    /**
     * ⚡ UPDATE ONLY SENSOR DATA (optional fast path)
     */
    async updateSensorData(nodeId: string, data: any) {
        return NodeLatest.findOneAndUpdate(
            { nodeId },
            {
                $set: {
                    ...data,
                    lastSeen: new Date()
                }
            },
            { new: true }
        );
    }
}
