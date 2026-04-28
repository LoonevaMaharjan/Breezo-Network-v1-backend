import { apiEvents } from "../utils/events";
import { ApiUsage } from "../models/apiUsage.model";
import { ApiKeyService } from "./apiKey.service";
import { ApiKeyRepository } from "../repositories/apiKey.repository";

const apiKeyService = new ApiKeyService(new ApiKeyRepository());

export function initApiUsageListener() {
  apiEvents.on("api.used", async ({ apiKey, req }) => {
    try {
      // log request
      await ApiUsage.create({
        userId: apiKey.userId,
        apiKey: apiKey.key,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      // increment usage
      await apiKeyService.increment(apiKey._id); // ✅ FIXED (use ID)
    } catch (err) {
      console.error("API usage listener error:", err);
    }
  });
}
