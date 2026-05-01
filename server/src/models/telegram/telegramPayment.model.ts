import mongoose, { Document } from "mongoose";

export interface ITelegramPayment extends Document {
  paymentId: string;
  userId: string;
  amount: number;

  status: "pending" | "success" | "failed";

  // 🔥 Blockchain fields
  memo: string;
  walletAddress: string;
  tokenMint: string;

  // 🔍 Verification
  txSignature?: string;

  // ⏱️ lifecycle
  expiresAt?: Date;
  paidAt?: Date;
}

const TelegramPaymentSchema = new mongoose.Schema<ITelegramPayment>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },

    userId: { type: String, required: true, index: true },

    amount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },

    // 🔥 REQUIRED for Solana verification
    memo: { type: String, required: true, index: true },

    walletAddress: { type: String, required: true },

    tokenMint: { type: String, required: true },

    // 🔐 unique transaction (prevents replay)
    txSignature: { type: String, unique: true, sparse: true },

    // ⏱️ expiry (important)
    expiresAt: { type: Date, index: true },

    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const TelegramPayment = mongoose.model<ITelegramPayment>(
  "TelegramPayment",
  TelegramPaymentSchema
);
