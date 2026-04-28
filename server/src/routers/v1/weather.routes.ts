import { Router } from "express";
import { WeatherController } from "../../controllers/weather.controller";
import { SensorRepository } from "../../repositories/sensor.repository";
import { WeatherService } from "../../service/weather.service";
import { validateQueryParams } from "../../validators";
import { weatherCurrentSchema, weatherNearbySchema, weatherHistorySchema } from "../../validators/weather.validatior";


const weatherRouter = Router();

const controller = new WeatherController(
  new WeatherService(new SensorRepository())
);

// =========================
// CURRENT WEATHER
// =========================
weatherRouter.get(
  "/current",
  validateQueryParams(weatherCurrentSchema),
  controller.current
);

// =========================
// NEARBY WEATHER
// =========================
weatherRouter.get(
  "/nearby",
  validateQueryParams(weatherNearbySchema),
  controller.nearby
);

// =========================
// HISTORY WEATHER
// =========================
weatherRouter.get(
  "/history",
  validateQueryParams(weatherHistorySchema),
  controller.history
);

export default weatherRouter;
