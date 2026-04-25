// This file contains all the basic configuration logic for the app server to work
import dotenv from 'dotenv';

type ServerConfig = {
    PORT: number
    MONGO_URI:string
    REWARD_INCREMENT:number,
    JWT_SECRET:string
    PRIVATE_KEY:string
    PROGRAM_ID:string
}

function loadEnv() {
    dotenv.config();
    console.log(`Environment variables loaded`);
}

loadEnv();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3001,
    MONGO_URI:process.env.MONGO_URI || "mongo://localhost:27017",
    REWARD_INCREMENT:Number(process.env.REWARD_INCREMENT) ||0.01,
    JWT_SECRET:process.env.JWT_SECRET || " ",
    PRIVATE_KEY:process.env.PRIVATE_KEY || " ",
    PROGRAM_ID:process.env.PROGRAM_ID || "5ygRCA7pF2h7GeGxP9RaiNQNTNb5J5GnB9XSzxh75gVw"
};
