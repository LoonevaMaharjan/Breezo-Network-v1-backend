import { IApiKeyRepository } from "../repositories/apiKey.repository";
import { generateApiKey } from "../utils/keygen.utils";

export interface IApiKeyService {
  create(userId: string, name: string): Promise<any>;
  validate(key: string): Promise<any | null>;
  increment(key: string): Promise<void>;
  getByUser(userId: string): Promise<any[]>;
  deactivate(id: string): Promise<any>;
}

export class ApiKeyService implements IApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository
  ) {}

  /**
   * Create new API key
   */
  async create(userId: string, name: string) {
    const key = generateApiKey();

    return this.apiKeyRepository.create({
      userId,
      key,
      name,
    });
  }

  /**
   * Validate API key
   */
 async validate(key: string) {
  const apiKey = await this.apiKeyRepository.findByKey(key);

  if (!apiKey) {
    return null;
  }

  const isLimitExceeded = apiKey.usedCount >= apiKey.requestLimit;

  if (isLimitExceeded) {
    return null;
  }

  return apiKey;
}


  /**
   * Increment usage count
   */
  async increment(key: string) {
    await this.apiKeyRepository.incrementUsage(key);
  }

  /**
   * Get all keys of a user
   */
  async getByUser(userId: string) {
    return this.apiKeyRepository.findByUser(userId);
  }

  /**
   * Deactivate API key
   */
  async deactivate(id: string) {
    return this.apiKeyRepository.deactivate(id);
  }
}
