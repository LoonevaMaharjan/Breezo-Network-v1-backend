import { Router } from "express";
import { AuthController } from "../../controllers/auth.controller";
import { UserRepository } from "../../repositories/user.repository";
import { AuthService } from "../../service/auth.service";
import { validateRequestBody } from "../../validators";
import { signUpSchema, loginSchema } from "../../validators/auth.validator";


const authRouter = Router();

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// routes
authRouter.post(
    "/signup",
    validateRequestBody(signUpSchema),
    authController.signUp
);

authRouter.post(
    "/login",
    validateRequestBody(loginSchema),
    authController.login
);

export default authRouter;
