import { Response, NextFunction } from "express";
import { ApiKeyService } from "../service/apiKey.service";
import { ApiKeyRepository } from "../repositories/apiKey.repository";
import { ApiKeyRequest } from "./apiKey.middleware";

// =========================
// SERVICE INSTANCE
// =========================
const apiKeyService = new ApiKeyService(new ApiKeyRepository());

/**
 * =========================
 * USAGE MIDDLEWARE
 * - Runs AFTER response is sent
 * - Increments API key usage safely
 * =========================
 */
export const usageMiddleware = (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): void => {
  res.on("finish", () => {
    const apiKey = req.apiKey;

    //  no api key attached
    if (!apiKey) return;

    //  async fire-and-forget (DO NOT block response)
    setImmediate(async () => {
      try {
        await apiKeyService.increment(apiKey._id.toString());
      } catch (err) {
        console.error(" Usage increment failed:", err);
      }
    });
  });

  next();
};
