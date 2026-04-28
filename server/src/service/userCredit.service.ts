import { UserCreditRepository } from "../repositories/userCredit.respository";


export class UserCreditService {
  constructor(private repo: UserCreditRepository) {}

  /**
   * BUY CREDITS
   */
  async addCredits(userId: string, amount: number) {
    const user = await this.repo.addCredits(userId, amount);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      email: user.email,
      credits: user.credits,
    };
  }

  /**
   * CHECK + DEDUCT (used in middleware)
   */
  async charge(userId: string, amount: number) {
    const user = await this.repo.deductCredits(userId, amount);

    if (!user) {
      return {
        allowed: false,
      };
    }

    return {
      allowed: true,
      credits: user.credits,
    };
  }

  /**
   * GET BALANCE
   */
  async getBalance(userId: string) {
    const user = await this.repo.getCredits(userId);

    if (!user) throw new Error("User not found");

    return user;
  }
}
