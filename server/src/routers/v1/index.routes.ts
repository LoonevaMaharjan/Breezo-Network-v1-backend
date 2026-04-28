import express from "express";

import pingRouter from "./ping.routes";
import authRouter from "./auth.routes";
import nodeRouter from "./node.routes";
import nodeMapRouter from "./nodeMap.routes";
import withdrawRouter from "./withdraw.routes";

// ✅ NEW IMPORTS
import weatherRouter from "./weather.routes";
import apiKeyRouter from "./apiKey.routes";
import usageRouter from "./apiUsage.routes";
import userCreditRouter from "./userCredit.routes";

const v1Router = express.Router();

// core routes
v1Router.use("/ping", pingRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/node", nodeRouter);
v1Router.use("/map", nodeMapRouter);
v1Router.use("/withdraw", withdrawRouter);


v1Router.use("/weather", weatherRouter);   // public (API key based)
v1Router.use("/api-keys", apiKeyRouter);   // user dashboard
v1Router.use("/usage", usageRouter);
v1Router.use("/credit", userCreditRouter);         // analytics

export default v1Router;
