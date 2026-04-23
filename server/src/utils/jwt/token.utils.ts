import jwt from "jsonwebtoken";
import { InternalServerError } from "../errors/app.error";


export const generateToken = (payload: object) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new InternalServerError("JWT secret missing");
    }

    return jwt.sign(payload, secret, {
        expiresIn: "1y",
    });
};
