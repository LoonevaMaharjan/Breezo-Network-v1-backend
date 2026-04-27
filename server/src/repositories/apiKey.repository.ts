import { ApiKey } from "../models/apiKey.model";

export interface IApiKeyRepository {
  create(data: {
    userId: string;
    key: string;
    name?: string;
  }): Promise<any>;

  findByKey(key: string): Promise<any | null>;

  findByUser(userId: string): Promise<any[]>;

  deactivate(id: string): Promise<any | null>;

  incrementUsage(key: string): Promise<void>;

}

export class ApiKeyRepository implements IApiKeyRepository {


  /**
   * Create new API key
   */
  async create(data: {
    userId: string;
    key: string;
    name?: string;
  }) {
    return ApiKey.create({
      userId: data.userId,
      key: data.key,
      name: data.name,
    });
  }

  /**
   * Find API key by key string
   */
  async findByKey(key: string) {
    return ApiKey.findOne({ key, isActive: true }).lean();
  }

  /**
   * Get all keys of a user
   */
  async findByUser(userId: string) {
    return ApiKey.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Deactivate API key
   */
  async deactivate(id: string) {
    return ApiKey.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Increment usage count
   */
  async incrementUsage(key: string): Promise<void> {
    await ApiKey.updateOne(
      { key },
      { $inc: { usedCount: 1 } }
    );
  }
}
