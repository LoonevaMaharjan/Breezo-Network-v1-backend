import { NodeLatest } from "../models/nodelatest.model";


export class NodeLatestRepository {

    /**
     * Get all nodes for public map
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
            updatedAt: 1
        });
    }

    /**
     * Get single node (optional)
     */
    async getNodeById(nodeId: string) {
        return NodeLatest.findOne({ nodeId });
    }
}
