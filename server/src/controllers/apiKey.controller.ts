import { Request, Response, NextFunction } from "express";
import { IApiKeyService } from "../service/apiKey.service";
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
  constructor(private apiKeyService: IApiKeyService) {}

  /**
   * POST /api-keys
   */
  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id; // from auth middleware
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
   * GET /api-keys
   */
  getMyKeys = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

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
