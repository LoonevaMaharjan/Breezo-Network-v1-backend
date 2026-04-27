import { IApiUsageRepository } from "../repositories/apiUsage.repository";

export interface IApiUsageService {
  logUsage(data: {
    userId: string;
    apiKey: string;
    endpoint: string;
    method: string;
    ip?: string;
  }): Promise<void>;

  getUserUsage(userId: string): Promise<any[]>;

  getKeyUsage(apiKey: string): Promise<any[]>;

  getKeyStats(apiKey: string): Promise<any>;
}

export class ApiUsageService implements IApiUsageService {
  constructor(private usageRepo: IApiUsageRepository) {}

  async logUsage(data: {
    userId: string;
    apiKey: string;
    endpoint: string;
    method: string;
    ip?: string;
  }) {
    await this.usageRepo.create(data);
  }

  async getUserUsage(userId: string) {
    return this.usageRepo.findByUser(userId);
  }

  async getKeyUsage(apiKey: string) {
    return this.usageRepo.findByApiKey(apiKey);
  }

  async getKeyStats(apiKey: string) {
    return this.usageRepo.getStatsByApiKey(apiKey);
  }
}
