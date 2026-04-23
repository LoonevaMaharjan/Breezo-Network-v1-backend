
import bcrypt from "bcrypt";
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../utils/errors/app.error";
import { SignUpDTO, LoginDTO } from "../dto/auth.dto";
import { IUserRepository } from "../repositories/user.repository";
import { generateToken } from "../utils/jwt/token.utils";




export interface IAuthService {
    signUp(data: SignUpDTO): Promise<any>;
    login(data: LoginDTO): Promise<any>;
    getUserById(id: string): Promise<any>;
}

export class AuthService implements IAuthService {
    constructor(private userRepository: IUserRepository) {}

    async signUp(data: SignUpDTO) {
        const { fullName, email, password, role } = data;

        const existingUser = await this.userRepository.findByEmail(email);

        if (existingUser) {
            throw new ConflictError("Email already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.userRepository.createUser({
            fullName,
            email,
            password: hashedPassword,
            role,
        });

        const token = generateToken({
            userId: user._id,
            email: user.email,
            role: user.role,
        });

        return {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token,
        };
    }

    async login(data: LoginDTO) {
        const { email, password } = data;

        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const token = generateToken({
            userId: user._id,
            email: user.email,
            role: user.role,
        });

        return {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            token,
        };
    }

    async getUserById(id: string) {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new NotFoundError("User not found");
        }

        return {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
        };
    }
}

