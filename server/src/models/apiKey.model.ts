import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    key: { type: String, unique: true },

    name: String,

    isActive: { type: Boolean, default: true },

    requestLimit: { type: Number, default: 10000 },

    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model("ApiKey", ApiKeySchema);
