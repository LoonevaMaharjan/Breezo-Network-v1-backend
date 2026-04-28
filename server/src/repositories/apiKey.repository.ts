import { ApiKey } from "../models/apiKey.model";

export class ApiKeyRepository {


  // ➕ CREATE

  async create(data: any) {
    return ApiKey.create(data);
  }


  // 🔍 FIND BY KEY (string key)

  async findByKey(key: string) {
    return ApiKey.findOne({ key });
  }


  // 🔍 FIND BY ID (Mongo _id)

  async findById(id: string) {
    return ApiKey.findById(id); // ✅ FIXED
  }


  //  FIND BY USER

  async findByUser(userId: string) {
    return ApiKey.find({ userId });
  }


  //  DEACTIVATE

  async deactivate(id: string) {
    return ApiKey.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true } //  return updated doc
    );
  }


  // 💰 ADD CREDITS

  async addCredits(id: string, amount: number) {
    return ApiKey.findByIdAndUpdate(
      id,
      { $inc: { credits: amount } }, //  add (not overwrite)
      { new: true }
    );
  }


  // ⚡ CONSUME CREDIT

  async consumeCredit(id: string) {
    return ApiKey.findOneAndUpdate(
      { _id: id, credits: { $gt: 0 } }, // ✅ ensure credit exists
      {
        $inc: {
          credits: -1,
          usedCredits: 1,
          usedCount: 1,
        },
      },
      { new: true }
    );
  }
}
