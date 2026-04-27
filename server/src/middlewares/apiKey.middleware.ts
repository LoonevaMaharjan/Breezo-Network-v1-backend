import { Request, Response, NextFunction } from "express";
import { ApiKeyRepository } from "../repositories/apiKey.repository";
import { ApiKeyService } from "../service/apiKey.service";

// simple instance (no DI)
const service = new ApiKeyService(new ApiKeyRepository());

export interface ApiKey {
  id: string;
  key: string;
  userId: string;
  expiresAt: Date;
  isActive: boolean;
}

// extend Express Request safely
export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

export const apiKeyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const headerKey = req.header("x-api-key") || " ";

    if (!headerKey) {
       res.status(401).json({
        success: false,
        message: "API key required",
      });
    }

    const apiKey = await service.validate(headerKey);

    if (!apiKey) {
       res.status(403).json({
        success: false,
        message: "Invalid or expired API key",
      });
    }

    req.apiKey = apiKey;

     next();
  } catch (error) {
    console.error("API Key Middleware Error:", error);

     res.status(500).json({
      success: false,
      message: "Internal server error in API key validation",
    });
  }
};
