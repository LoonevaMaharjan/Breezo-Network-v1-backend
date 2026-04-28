import express from "express";
import cors from "cors";

import { serverConfig } from "./config";
import v1Router from "./routers/v1/index.routes";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import logger from "./config/logger.config";
import { connectDB } from "./db/db";
import { initSocket } from "./socket";
import { initApiUsageListener } from "./service/apiUsage.listener";




// initialize event system


const app = express();

/**
 * =========================
 * Core Middlewares
 * =========================
 */
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

initApiUsageListener();

/**
 * =========================
 * API Routes
 * =========================
 */
app.use("/api/v1", v1Router);

/**
 * =========================
 * 404 Handler (IMPORTANT)
 * =========================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * =========================
 * Error Handlers
 * =========================
 */
app.use(appErrorHandler);
app.use(genericErrorHandler);

/**
 * =========================
 * Start Server Safely
 * =========================
 */
const startServer = async () => {
  try {
    await connectDB();
    logger.info("MongoDB connected successfully");

    const server = initSocket(app);

    server.listen(serverConfig.PORT, () => {
      logger.info(
        `Server is running on http://localhost:${serverConfig.PORT}`
      );
      logger.info("Press Ctrl+C to stop the server.");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
