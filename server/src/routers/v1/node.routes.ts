import { Router } from "express";
import { NodeController } from "../../controllers/node.controller";
import { NodeRepository } from "../../repositories/node.repository";
import { NodeService } from "../../service/node.service";
import { validateRequestBody } from "../../validators";
import { nodeDataSchema } from "../../validators/node.validator";
import { isAuthenticated } from "../../middlewares/isAuth.middleware";

const nodeRouter = Router();

const nodeRepository = new NodeRepository();
const nodeService = new NodeService(nodeRepository);
const nodeController = new NodeController(nodeService);

/**
 * Device → send data
 */
nodeRouter.post(
  "/ingest",
  validateRequestBody(nodeDataSchema),
  nodeController.ingest,
);

/**
 * User → dashboard
 */
nodeRouter.get("/dashboard",isAuthenticated , nodeController.dashboard);

export default nodeRouter;
