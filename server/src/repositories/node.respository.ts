import { Node } from "../models/node.model";
import { NodeLatest } from "../models/nodelatest.model";
import { SensorHistory } from "../models/sensorhistory.model";


export class NodeRepository {

    async upsertNode(nodeId: string, ownerEmail: string) {
        return Node.findOneAndUpdate(
            { nodeId },
            { ownerEmail },
            { upsert: true, new: true }
        );
    }

    async upsertNodeLatest(data: any, rewardIncrement: number) {
        const { nodeId } = data;

        return NodeLatest.findOneAndUpdate(
            { nodeId },
            {
                ...data,
                $inc: { reward: rewardIncrement },
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
    }

    async createSensorHistory(data: any) {
        return SensorHistory.create(data);
    }

    async getNodesByEmail(email: string) {
        return NodeLatest.find({ ownerEmail: email });
    }
}
