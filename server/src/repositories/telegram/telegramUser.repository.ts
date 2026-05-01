import { ITelegramUser, TelegramUser } from "../../models/telegram/telegramUser.model";


export class TelegramUserRepository {
  async findByTelegramId(telegramId: string): Promise<ITelegramUser | null> {
    return TelegramUser.findOne({ telegramId });
  }

  async create(data: { telegramId: string; username?: string }): Promise<ITelegramUser> {
    return TelegramUser.create({
      telegramId: data.telegramId,
      username: data.username,
      isPremium: false,
      remainingRequests: 0,
      totalMessagesUsed: 0,
      dailyUsage: 0,
    });
  }

  async updateLocation(telegramId: string, lat: number, lng: number): Promise<void> {
    await TelegramUser.updateOne({ telegramId }, { $set: { "location.lat": lat, "location.lng": lng } });
  }

  async incrementUsage(telegramId: string): Promise<void> {
    await TelegramUser.updateOne({ telegramId }, { $inc: { totalMessagesUsed: 1 } });
  }

  async incrementDailyUsage(telegramId: string, resetDay: boolean): Promise<void> {
    const update: any = { $inc: { dailyUsage: 1 } };
    if (resetDay) {
      update.$set = { dailyUsage: 1, lastDailyReset: new Date() };
      delete update.$inc;
    }
    await TelegramUser.updateOne({ telegramId }, update);
  }

  async decrementRequests(telegramId: string): Promise<void> {
    await TelegramUser.updateOne({ telegramId }, { $inc: { remainingRequests: -1 } });
  }

  async upgradeToPremium(telegramId: string, requests: number): Promise<void> {
    await TelegramUser.updateOne(
      { telegramId },
      { $set: { isPremium: true }, $inc: { remainingRequests: requests } }
    );
  }
}
