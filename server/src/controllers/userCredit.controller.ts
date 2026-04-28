import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/isAuth.middleware";
import { UserCreditService } from "../service/userCredit.service";

export interface IUserCreditController {
  addCredits(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  getBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

export class UserCreditController implements IUserCreditController {
  constructor(private creditService: UserCreditService) {}

  /**
   * POST /credits/add
   */
  addCredits = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { amount } = req.body;

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

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
        return;
      }

      // =========================
      // SERVICE
      // =========================
      const result = await this.creditService.addCredits(userId, amount);

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
   * GET /credits/me
   */
  getBalance = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return;
      }

      const result = await this.creditService.getBalance(userId);

      res.status(200).json({
        success: true,
        message: "Balance fetched",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
