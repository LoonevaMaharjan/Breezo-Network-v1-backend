import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/isAuth.middleware";
import { NodeService } from "../service/node.service";

export class NodeController {
  constructor(private nodeService: NodeService) {}

  /**
 *  CREATE NODE (REGISTER DEVICE)
 */
createNode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nodeId, devicePublicKey, ownerEmail, ownerWallet } = req.body;

    if (!nodeId || !devicePublicKey || !ownerEmail || !ownerWallet) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    const result = await this.nodeService.createNode({
      nodeId,
      devicePublicKey,
      ownerEmail,
      ownerWallet,
    });

    res.status(201).json({
      success: true,
      message: "Node created successfully",
      data: result,
    });
    return; // ✅ important

  } catch (error) {
    next(error);
  }
};



  /**
   *  ESP32 INGESTION
   */
  ingest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("1. ingest hit", req.body);

    const result = await this.nodeService.ingestData(req.body);

    console.log("2. ingestData done", result);

    res.status(200).json({
      success: true,
      message: "Data ingested successfully",
      data: result,
    });

    console.log("3. response sent");
  } catch (error) {
    console.error("ingest error:", error);
    next(error);
  }
};

  /**
   *  DASHBOARD
   */
  dashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const email = req.user?.email;

      if (!email) {
         res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await this.nodeService.getUserDashboard(email);

       res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   *  REQUEST LINK
   */
  requestLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { publicKey } = req.body;

      if (!publicKey) {
         res.status(400).json({
          success: false,
          message: "publicKey required",
        });
      }

      const result = await this.nodeService.requestLink(publicKey);

       res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   *  VERIFY LINK
   */
  verifyLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
         res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
        return
      }

      const result = await this.nodeService.verifyLink({
        ...req.body,
        email: user.email,
        wallet: user.wallet,
      });

       res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   *  CLAIM REWARD
   */
  claimReward = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { nodeId } = req.body;
      const user = req.user;

      if (!user) {
         res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!nodeId) {
         res.status(400).json({
          success: false,
          message: "nodeId required",
        });
      }

      const result = await this.nodeService.claimReward(nodeId, user);

       res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
