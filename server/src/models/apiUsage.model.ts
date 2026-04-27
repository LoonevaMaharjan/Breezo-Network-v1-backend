import mongoose from "mongoose";

const ApiUsageSchema = new mongoose.Schema(
  {
    userId: mongoose.Types.ObjectId,
    apiKey: String,
    endpoint: String,
    method: String,
    ip: String,
  },
  { timestamps: true }
);

export const ApiUsage = mongoose.model("ApiUsage", ApiUsageSchema);
