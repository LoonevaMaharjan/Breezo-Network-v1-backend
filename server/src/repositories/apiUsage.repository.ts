import { ApiUsage } from "../models/apiUsage.model";

export interface IApiUsageRepository {
  create(data: {
    userId: string;
    apiKey: string;
    endpoint: string;
    method: string;
    ip?: string;
  }): Promise<any>;

  findByUser(userId: string): Promise<any[]>;

  findByApiKey(apiKey: string): Promise<any[]>;

  countByApiKey(apiKey: string): Promise<number>;

  getStatsByApiKey(apiKey: string): Promise<any>;
}

export class ApiUsageRepository implements IApiUsageRepository {
  /**
   * Create usage record
   */
  async create(data: {
    userId: string;
    apiKey: string;
    endpoint: string;
    method: string;
    ip?: string;
  }) {
    return ApiUsage.create(data);
  }

  /**
   * Get all usage for a user
   */
  async findByUser(userId: string) {
    return ApiUsage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  /**
   * Get usage by API key
   */
  async findByApiKey(apiKey: string) {
    return ApiUsage.find({ apiKey })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  /**
   * Count total requests for a key
   */
  async countByApiKey(apiKey: string) {
    return ApiUsage.countDocuments({ apiKey });
  }

  /**
   * Aggregated stats (🔥 important for dashboard)
   */
  async getStatsByApiKey(apiKey: string) {
    return ApiUsage.aggregate([
      {
        $match: { apiKey },
      },
      {
        $group: {
          _id: "$endpoint",
          totalRequests: { $sum: 1 },
        },
      },
      {
        $sort: { totalRequests: -1 },
      },
    ]);
  }
}
