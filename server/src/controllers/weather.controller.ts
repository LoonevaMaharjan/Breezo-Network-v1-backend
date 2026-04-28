import { Request, Response, NextFunction } from "express";
import { IWeatherService } from "../service/weather.service";

interface TypedRequest<T> extends Request {
  validatedQuery?: T;
}

export class WeatherController {
  constructor(private service: IWeatherService) {}

  current = async (
    req: TypedRequest<{ nodeId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { nodeId } = req.validatedQuery!;

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
    req: TypedRequest<{ lat: number; lng: number }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { lat, lng } = req.validatedQuery!;

      const result = await this.service.getNearby(lat, lng);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  history = async (
    req: TypedRequest<{ nodeId: string; from: string; to: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { nodeId, from, to } = req.validatedQuery!;

      const result = await this.service.getHistory(
        nodeId,
        new Date(from),
        new Date(to)
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
