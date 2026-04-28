import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    key: {
      type: String,
      unique: true,
      required: true,
    },

    name: {
      type: String,
      default: "default-key",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // =========================
    // 💰 CREDIT SYSTEM
    // =========================
    credits: {
      type: Number,
      default: 0,
    },

    usedCredits: {
      type: Number,
      default: 0,
    },

    // =========================
    // 📊 USAGE TRACKING
    // =========================
    usedCount: {
      type: Number,
      default: 0,
    },

    // =========================
    // 🧾 PLAN SYSTEM
    // =========================
    plan: {
      type: String,
      enum: ["free", "basic", "pro", "enterprise"],
      default: "free",
    },

    resetAt: {
      type: Date,
      default: () => new Date(Date.now() + 86400000), // 24h
    },
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model("ApiKey", ApiKeySchema);
