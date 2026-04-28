import { Request, Response, NextFunction } from "express";
import { ApiKeyService } from "../service/apiKey.service";
import { AuthRequest } from "../middlewares/isAuth.middleware";

export interface IApiKeyController {
  create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  getMyKeys(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  deactivate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

export class ApiKeyController implements IApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  /**
   * POST /api-keys
   */
  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId; // from auth middleware
      const { name } = req.body;


      const result = await this.apiKeyService.create(
        userId,
        name
      );

      res.status(201).json({
        success: true,
        message: "API key created successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  /**
 * POST /api-keys/purchase
 */
addCredits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { apiKeyId, amount } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (!apiKeyId) {
      res.status(400).json({
        success: false,
        message: "apiKeyId is required",
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "amount must be greater than 0",
      });
      return;
    }

    // =========================
    // SERVICE CALL
    // =========================
    const result = await this.apiKeyService.addCredits(
      userId,
      apiKeyId,
      amount
    );

    // =========================
    // RESPONSE
    // =========================
    res.status(200).json({
      success: true,
      message: "Credits added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


  /**
   * GET /api-keys
   */
  getMyKeys = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;

      const result = await this.apiKeyService.getByUser(userId);

      res.status(200).json({
        success: true,
        message: "API keys fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api-keys/:id
   */
  deactivate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.apiKeyService.deactivate(id);

      res.status(200).json({
        success: true,
        message: "API key deactivated",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
