import { ApiKeyRepository } from "../repositories/apiKey.repository";
import { generateApiKey } from "../utils/keygen.utils";

export class ApiKeyService {
  constructor(private repo: ApiKeyRepository) {}

  // =========================
  // 🔑 CREATE NEW API KEY
  // =========================
  async create(userId: string, name: string) {
    const key = generateApiKey();

    return this.repo.create({
      userId,
      key,
      name,
      credits: 0,
      usedCredits: 0,
      usedCount: 0,
      isActive: true,
    });
  }

  // =========================
  // 🔍 VALIDATE API KEY
  // =========================
  async validate(key: string) {
    const apiKey = await this.repo.findByKey(key);

    if (!apiKey || !apiKey.isActive) return null;

    if (apiKey.credits <= 0) return null;

    return apiKey;
  }

  // =========================
  // 📉 CONSUME CREDIT
  // =========================
  async increment(apiKeyId: string) {
    return this.repo.consumeCredit(apiKeyId);
  }

  // =========================
  // 💰 ADD CREDIT
  // =========================
  async addCredits(userId: string, apiKeyId: string, amount: number) {
    const key = await this.repo.findById(apiKeyId);

    if (!key) throw new Error("API key not found");

    if (key.userId.toString() !== userId) {
      throw new Error("Unauthorized");
    }

    return this.repo.addCredits(apiKeyId, amount);
  }

  // =========================
  // 📄 GET USER KEYS
  // =========================
  async getByUser(userId: string) {
    return this.repo.findByUser(userId);
  }

  // =========================
  // ❌ DEACTIVATE
  // =========================
  async deactivate(apiKeyId: string) {
    return this.repo.deactivate(apiKeyId);
  }
}
