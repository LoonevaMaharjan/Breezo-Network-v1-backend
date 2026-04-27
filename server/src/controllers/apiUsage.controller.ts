import { Request, Response, NextFunction } from "express";
import { IApiUsageService } from "../service/apiUsage.service";
import { AuthRequest } from "../middlewares/isAuth.middleware";
export interface IApiUsageController {
  getMyUsage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  getKeyUsage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  getKeyStats(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

export class ApiUsageController implements IApiUsageController {
  constructor(private usageService: IApiUsageService) {}

  /**
   * GET /usage
   */
  getMyUsage = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      const result = await this.usageService.getUserUsage(userId);

      res.status(200).json({
        success: true,
        message: "Usage fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /usage/:apiKey
   */
  getKeyUsage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { apiKey } = req.params;

      const result = await this.usageService.getKeyUsage(apiKey);

      res.status(200).json({
        success: true,
        message: "API key usage fetched",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /usage/:apiKey/stats
   */
  getKeyStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { apiKey } = req.params;

      const result = await this.usageService.getKeyStats(apiKey);

      res.status(200).json({
        success: true,
        message: "Usage stats fetched",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
