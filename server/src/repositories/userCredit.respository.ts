import { User } from "../models/user.model";

export class UserCreditRepository {
  /**
   * Add credits to user wallet
   */
  async addCredits(userId: string, amount: number) {
    return User.findByIdAndUpdate(
      userId,
      {
        $inc: { credits: amount },
      },
      { new: true }
    );
  }

  /**
   * Deduct credits (used by middleware later)
   */
  async deductCredits(userId: string, amount: number) {
    return User.findOneAndUpdate(
      {
        _id: userId,
        credits: { $gte: amount }, // ensure enough credits
      },
      {
        $inc: {
          credits: -amount,
          usedCredits: amount,
        },
      },
      { new: true }
    );
  }

  /**
   * Get user credits
   */
  async getCredits(userId: string) {
    return User.findById(userId).select("email credits usedCredits");
  }
}
