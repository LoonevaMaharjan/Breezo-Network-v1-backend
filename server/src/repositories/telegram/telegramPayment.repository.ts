import {
  TelegramPayment,
  ITelegramPayment,
} from "../../models/telegram/telegramPayment.model";

export class TelegramPaymentRepository {
  /**
   * Create a new payment record
   */
  async create(data: {
    paymentId: string;
    userId: string;
    amount: number;

    //  REQUIRED
    memo: string;
    walletAddress: string;
    tokenMint: string;

    status?: "pending" | "success" | "failed";
    expiresAt?: Date;
  }): Promise<ITelegramPayment> {
    return TelegramPayment.create({
      ...data,
      status: data.status || "pending",
      expiresAt:
        data.expiresAt || new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });
  }

  /**
   * Find payment by paymentId (memo)
   */
  async findByPaymentId(paymentId: string): Promise<ITelegramPayment | null> {
    return TelegramPayment.findOne({ paymentId });
  }

  /**
   * Find payment by Solana transaction signature
   */
  async findBySignature(
    txSignature: string
  ): Promise<ITelegramPayment | null> {
    return TelegramPayment.findOne({ txSignature });
  }

  /**
   * Prevent duplicate pending payments
   */
  async findPendingByUserId(
    userId: string
  ): Promise<ITelegramPayment | null> {
    return TelegramPayment.findOne({
      userId,
      status: "pending",
    });
  }

  /**
   * Get all pending payments (used by poller)
   */
  async findPending(): Promise<ITelegramPayment[]> {
    return TelegramPayment.find({
      status: "pending",
      expiresAt: { $gt: new Date() }, // ⏱️ only valid payments
    });
  }

  /**
   * Mark payment as SUCCESS
   */
  async markSuccess(
    paymentId: string,
    txSignature: string
  ): Promise<ITelegramPayment | null> {
    return TelegramPayment.findOneAndUpdate(
      { paymentId },
      {
        $set: {
          status: "success",
          txSignature,
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Mark payment as FAILED
   */
  async markFailed(paymentId: string): Promise<void> {
    await TelegramPayment.updateOne(
      { paymentId },
      {
        $set: {
          status: "failed",
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Expire old pending payments (use in cron/poller)
   */
async expireOldPayments(): Promise<void> {
  await TelegramPayment.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "failed" } }
  );
}
}
