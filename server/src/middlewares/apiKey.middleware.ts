import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/isAuth.middleware";

import { ApiKeyRepository } from "../repositories/apiKey.repository";
import { ApiKeyService } from "../service/apiKey.service";
import { CreditEngineService } from "../service/creditEngine.service";


const apiKeyService = new ApiKeyService(new ApiKeyRepository());
const creditEngine = new CreditEngineService();


export interface ApiKeyRequest extends AuthRequest {
  apiKey?: any;
  remainingCredits?: number;
}


export const apiKeyMiddleware = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = req.header("x-api-key");


    if (!key) {
      return res.status(401).json({
        success: false,
        message: "API key required",
      });
    }

    // 🔍 validate API key
    const apiKey = await apiKeyService.validate(key);

    if (!apiKey) {
      return res.status(403).json({
        success: false,
        message: "Invalid or inactive API key",
      });
    }

    // 💰 charge user credits (GLOBAL USER WALLET LOGIC)
    const result = await creditEngine.charge(apiKey.userId.toString(), 1);

    if (!result.allowed) {
      return res.status(402).json({
        success: false,
        message: "Insufficient credits",
        remainingCredits: result.credits,
      });
    }

    // ✅ attach to request (SAFE + TYPED)
    req.apiKey = apiKey;
    req.user = req.user || {};
    req.user.userId = apiKey.userId.toString();
    req.remainingCredits = result.credits;

    next();
  } catch (err) {
    next(err);
  }
};
