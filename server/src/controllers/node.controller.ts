import { Request, Response, NextFunction } from "express";
import { NodeService } from "../service/node.service";


export class NodeController {
    constructor(private nodeService: NodeService) {}

    /**
     * ESP32 → send sensor data
     */
    ingest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.nodeService.ingestData(req.body);

             res.status(200).json({
                success: true,
                message: "Data ingested successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * USER DASHBOARD
     */
    dashboard = async (req: any, res: Response, next: NextFunction) => {
        try {
            const email ="everest@test.com" // from JWT middleware

            const result = await this.nodeService.getUserDashboard(email);

             res.status(200).json({
                success: true,
                message: "Dashboard fetched successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}
