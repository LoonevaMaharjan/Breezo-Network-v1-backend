import { Request, Response } from "express";
import { ApiKeyService } from "../service/apiKey.service";
import { ApiKeyRepository } from "../repositories/apiKey.repository";

const apiKeyService = new ApiKeyService(new ApiKeyRepository());

interface PurchaseCreditsBody {
  apiKeyId: string;
  amount: number;
}

/**
 * =========================
 * Controller
 * =========================
 */
export const purchaseCredits = async (
  req: Request<{}, {}, PurchaseCreditsBody>,
  res: Response
): Promise<void> => {
  try {
    const { apiKeyId, amount } = req.body;

    // =========================
    // VALIDATION (basic safety)
    // =========================
    if (!apiKeyId || typeof apiKeyId !== "string") {
      res.status(400).json({
        success: false,
        message: "apiKeyId is required",
      });
      return;
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "amount must be a positive number",
      });
      return;
    }

    // =========================
    // SERVICE CALL
    // =========================
    const result = await apiKeyService.addCredits(apiKeyId, amount);

    res.status(200).json({
      success: true,
      message: "Credits added successfully",
      data: result,
    });
  } catch (err) {
    console.error("Purchase error:", err);

    res.status(500).json({
      success: false,
      message: "Purchase failed",
    });
  }
};
