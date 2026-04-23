
import { NodeDataDTO } from "../dto/node.dto";
import { NodeRepository } from "../repositories/node.respository";

const REWARD_INCREMENT = 0.001;

export class NodeService {

    constructor(private nodeRepo: NodeRepository) {}

    async ingestData(data: NodeDataDTO) {
        const {
            nodeId,
            ownerEmail,
            temperature,
            humidity,
            pm25,
            pm10,
            aqi,
            aqiLevel,
            location
        } = data;

        // 1. Ensure node exists
        await this.nodeRepo.upsertNode(nodeId, ownerEmail);

        // 2. Update NodeLatest
        const nodeLatest = await this.nodeRepo.upsertNodeLatest(
            {
                nodeId,
                ownerEmail,
                temperature,
                humidity,
                pm25,
                pm10,
                aqi,
                aqiLevel,
                location
            },
            REWARD_INCREMENT
        );

        // 3. Store history
        await this.nodeRepo.createSensorHistory({
            nodeId,
            temperature,
            humidity,
            pm25,
            pm10,
            aqi
        });

        return nodeLatest;
    }

    async getUserDashboard(email: string) {
        const nodes = await this.nodeRepo.getNodesByEmail(email);

        const totalReward = nodes.reduce(
            (sum, n) => sum + (n.reward || 0),
            0
        );

        return {
            nodes,
            totalReward
        };
    }
}
