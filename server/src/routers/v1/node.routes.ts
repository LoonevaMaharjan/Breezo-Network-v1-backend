import { Router } from "express";
import { NodeController } from "../../controllers/node.controller";
import { NodeRepository } from "../../repositories/node.repository";
import { NodeService } from "../../service/node.service";
import { isAuthenticated } from "../../middlewares/isAuth.middleware";
import { NodeLatestRepository } from "../../repositories/nodeLatest.repository";
import { SolanaClient } from "../../blockchain/solana.client";

const router = Router();

/**

 *  DEPENDENCY INJECTION

 */
const nodeRepo = new NodeRepository();
const nodeLatestRepo = new NodeLatestRepository();
const solana = new SolanaClient();

const service = new NodeService(nodeRepo, nodeLatestRepo, solana);
const controller = new NodeController(service);

router.post("/create", isAuthenticated, controller.createNode);

/**

 * DEVICE ROUTES (ESP32)

 * secure ingestion with signature verification
 */
router.post("/ingest", controller.ingest);

/**

 *  USER DASHBOARD

 * user sees all nodes + rewards
 */
router.post("/dashboard", isAuthenticated, controller.dashboard);

/**

 *  NODE LINKING FLOW

 * 1️⃣ request challenge
 * 2️⃣ verify + link node
 */
router.post("/link/request", isAuthenticated, controller.requestLink);
router.post("/link/verify", isAuthenticated, controller.verifyLink);

/**

 *  REWARD SYSTEM

 * claim on-chain reward
 */
router.post("/reward/claim", isAuthenticated, controller.claimReward);

export default router;
