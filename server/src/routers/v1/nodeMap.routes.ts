import { Router } from "express";
import { NodeLatestRepository } from "../../repositories/nodeLatest.repository";
import { NodeMapService } from "../../service/nodeMap.service";
import { NodeMapController } from "../../controllers/nodeMap.controller";


const nodeMapRouter = Router();

/**
 * Dependency Injection (no container)
 */
const nodeRepo = new NodeLatestRepository();
const nodeService = new NodeMapService(nodeRepo);
const nodeController = new NodeMapController(nodeService);

/**
 * PUBLIC MAP ROUTE
 */
nodeMapRouter.get("/nodes", nodeController.getMapNodes);

export default nodeMapRouter;
