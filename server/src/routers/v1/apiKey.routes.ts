import { Router } from "express";
import { ApiKeyController } from "../../controllers/apiKey.controller";
import { ApiKeyService } from "../../service/apiKey.service";
import { ApiKeyRepository } from "../../repositories/apiKey.repository";
import { isAuthenticated } from "../../middlewares/isAuth.middleware";

const apiKeyRouter = Router();

// DI setup
const apiKeyRepository = new ApiKeyRepository();
const apiKeyService = new ApiKeyService(apiKeyRepository);
const apiKeyController = new ApiKeyController(apiKeyService);

// protected routes (user must be logged in)
apiKeyRouter.use(isAuthenticated);

// routes
apiKeyRouter.post("/", apiKeyController.create);
apiKeyRouter.post("/api-keys/purchase", apiKeyController.addCredits);


apiKeyRouter.get("/", apiKeyController.getMyKeys);

apiKeyRouter.delete("/:id", apiKeyController.deactivate);

export default apiKeyRouter;
