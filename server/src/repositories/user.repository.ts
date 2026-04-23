import { IUser, User } from "../models/user.model";


export interface IUserRepository {
    findByEmail(email: string): Promise<IUser | null>;
    findById(id: string): Promise<IUser | null>;
    createUser(data: Partial<IUser>): Promise<IUser>;
}


export class UserRepository implements IUserRepository {
    async findByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email });
    }

    async findById(id: string): Promise<IUser | null> {
        return User.findById(id);
    }

    async createUser(data: Partial<IUser>): Promise<IUser> {
        return User.create(data);
    }
}

