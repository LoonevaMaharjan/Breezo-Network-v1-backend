import { Router } from "express";
import { WeatherController } from "../../controllers/weather.controller";
import { SensorRepository } from "../../repositories/sensor.repository";
import { WeatherService } from "../../service/weather.service";
// import { apiKeyMiddleware } from "../../middlewares/apiKey.middleware";
import { usageMiddleware } from "../../middlewares/usage.middleware";
import { apiKeyMiddleware } from "../../middlewares/apiKey.middleware";

const weatherRouter = Router();

// dependencies (DI)
const sensorRepository = new SensorRepository();
const weatherService = new WeatherService(sensorRepository);
const weatherController = new WeatherController(weatherService);

// apply API key + usage tracking
weatherRouter.use(usageMiddleware);
weatherRouter.use(apiKeyMiddleware);

// routes
weatherRouter.get("/current", weatherController.current);

weatherRouter.get("/nearby", weatherController.nearby);

weatherRouter.get("/history", weatherController.history);

export default weatherRouter;
