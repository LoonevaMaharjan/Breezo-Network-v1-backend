import { Response, NextFunction } from "express";
import { IWeatherService } from "../service/weather.service";
import { ApiKeyRequest } from "../middlewares/apiKey.middleware";

export class WeatherController {
  constructor(private service: IWeatherService) {}

  current = async (
    req: ApiKeyRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { nodeId } = req.params;

      const result = await this.service.getCurrent(nodeId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  nearby = async (
    req: ApiKeyRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { lat, lng } = req.query;

      const result = await this.service.getNearby(
        Number(lat),
        Number(lng)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  history = async (
    req: ApiKeyRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { nodeId } = req.params;
      const { from, to } = req.query;

      const result = await this.service.getHistory(
        nodeId,
        new Date(from as string),
        new Date(to as string)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}
