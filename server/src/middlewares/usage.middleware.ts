import { Request, Response, NextFunction } from "express";
import { ApiUsage } from "../models/apiUsage.model";
import { ApiKeyService } from "../service/apiKey.service";
import { ApiKeyRepository } from "../repositories/apiKey.repository";

// simple instance (no DI)
const apiKeyService = new ApiKeyService(new ApiKeyRepository());

export const usageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on("finish", () => {
    // run async safely without blocking event loop
    setImmediate(async () => {
      try {
        const apiKey = (req as any).apiKey;

        if (!apiKey) return;

        // safety check
        if (!apiKey.userId || !apiKey.key) return;

        // log usage
        await ApiUsage.create({
          userId: apiKey.userId,
          apiKey: apiKey.key,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
        });

        // increment counter
        await apiKeyService.increment(apiKey.key);
      } catch (err) {
        console.error("Usage middleware error:", err);
      }
    });
  });

  next();
};
