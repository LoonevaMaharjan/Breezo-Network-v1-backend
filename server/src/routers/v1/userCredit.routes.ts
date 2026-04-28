import express from "express";
import { isAuthenticated } from "../../middlewares/isAuth.middleware";
import { UserCreditController } from "../../controllers/userCredit.controller";
import { UserCreditService } from "../../service/userCredit.service";
import { UserCreditRepository } from "../../repositories/userCredit.respository";


const userCreditRouter = express.Router();

const repo = new UserCreditRepository();
const service = new UserCreditService(repo);
const controller = new UserCreditController(service);

userCreditRouter.post("/add", isAuthenticated, controller.addCredits);
userCreditRouter.get("/me", isAuthenticated, controller.getBalance);

export default userCreditRouter;
