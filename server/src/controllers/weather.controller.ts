import { Request, Response, NextFunction } from "express";
import { IWeatherService } from "../service/weather.service";

export interface IWeatherController {
  current(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  nearby(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;

  history(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

export class WeatherController implements IWeatherController {
  constructor(private weatherService: IWeatherService) {}

  /**
   * GET /weather/current?nodeId=xxx
   */
  current = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { nodeId } = req.query;

      if (!nodeId) {
        res.status(400).json({
          success: false,
          message: "nodeId is required",
        });
        return;
      }

      const result = await this.weatherService.getCurrent(
        String(nodeId)
      );

      res.status(200).json({
        success: true,
        message: "Current weather fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /weather/nearby?lat=..&lng=..
   */
  nearby = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        res.status(400).json({
          success: false,
          message: "lat and lng are required",
        });
        return;
      }

      const result = await this.weatherService.getNearby(
        Number(lat),
        Number(lng)
      );

      res.status(200).json({
        success: true,
        message: "Nearby sensor fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /weather/history?nodeId=xxx&from=...&to=...
   */
  history = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { nodeId, from, to } = req.query;

      if (!nodeId || !from || !to) {
        res.status(400).json({
          success: false,
          message: "nodeId, from and to are required",
        });
        return;
      }

      const result = await this.weatherService.getHistory(
        String(nodeId),
        new Date(String(from)),
        new Date(String(to))
      );

      res.status(200).json({
        success: true,
        message: "Weather history fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
