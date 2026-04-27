import { SensorHistory } from "../models/sensorhistory.model";

export class SensorRepository {
  /**
   * Latest record of a node
   */
  async getLatestByNode(nodeId: string) {
    return SensorHistory.findOne({ nodeId })
      .sort({ timestamp: -1 }) 
      .lean();
  }

  /**
   * Time-series data of a node
   */
  async getHistory(
    nodeId: string,
    from: Date,
    to: Date
  ) {
    return SensorHistory.find({
      nodeId,
      timestamp: { $gte: from, $lte: to },
    })
      .sort({ timestamp: 1 })
      .lean();
  }

  /**
   * Latest data of ALL nodes (one per node)
   */
  async getAllLatestPerNode() {
    return SensorHistory.aggregate([
      { $sort: { timestamp: -1 } }, // newest first
      {
        $group: {
          _id: "$nodeId",
          latest: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latest" },
      },
    ]);
  }
}
