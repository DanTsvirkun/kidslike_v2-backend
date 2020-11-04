import { Router } from "express";
import Joi from "joi";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";
import { register, login } from "./auth.controller";
import validate from "../function-helpers/validate";

const router = Router();

const signUpSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  username: Joi.string().required(),
});

const signInSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

router.post("/register", validate(signUpSchema), tryCatchWrapper(register));
router.post("/login", validate(signInSchema), tryCatchWrapper(login));

export default router;
