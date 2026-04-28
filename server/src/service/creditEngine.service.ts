import { User } from "../models/user.model";

export class CreditEngineService {
  /**
   * 🔥 Atomic check + deduct
   */
  async charge(userId: string, cost: number = 1) {
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        credits: { $gte: cost }, // ✅ ensure enough balance
      },
      {
        $inc: {
          credits: -cost,
          usedCredits: cost,
        },
      },
      { new: true }
    );

    if (!user) {
      return {
        allowed: false,
        credits: 0,
      };
    }

    return {
      allowed: true,
      credits: user.credits,
    };
  }

  /**
   * Add credits (buy)
   */
  async addCredits(userId: string, amount: number) {
    return User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true }
    );
  }
}
