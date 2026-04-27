import { Router } from "express";
import { ApiUsageController } from "../../controllers/apiUsage.controller";
import { ApiUsageService } from "../../service/apiUsage.service";
import { ApiUsageRepository } from "../../repositories/apiUsage.repository";
import { isAuthenticated } from "../../middlewares/isAuth.middleware";

const usageRouter = Router();

// DI setup
const usageRepository = new ApiUsageRepository();
const usageService = new ApiUsageService(usageRepository);
const usageController = new ApiUsageController(usageService);

// protected
usageRouter.use(isAuthenticated);

// routes
usageRouter.get("/", usageController.getMyUsage);

usageRouter.get("/:apiKey", usageController.getKeyUsage);

usageRouter.get("/:apiKey/stats", usageController.getKeyStats);

export default usageRouter;
