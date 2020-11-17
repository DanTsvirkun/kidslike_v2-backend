import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import tryCatchWrapper from "../helpers/function-helpers/try-catch-wrapper";
import {
  register,
  login,
  googleAuth,
  googleRedirect,
  facebookAuth,
  facebookRedirect,
  refreshTokens,
  logout,
  authorize,
} from "./auth.controller";
import validate from "../helpers/function-helpers/validate";

const signUpSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  username: Joi.string().required(),
});

const signInSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshTokensSchema = Joi.object({
  sid: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.error("Invalid session id. Must be MongoDB object id");
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post("/register", validate(signUpSchema), tryCatchWrapper(register));
router.post("/login", validate(signInSchema), tryCatchWrapper(login));
router.post("/logout", authorize, tryCatchWrapper(logout));
router.get(
  "/refresh",
  validate(refreshTokensSchema),
  tryCatchWrapper(refreshTokens)
);
router.get("/google", tryCatchWrapper(googleAuth));
router.get("/google-redirect", tryCatchWrapper(googleRedirect));
router.get("/facebook", tryCatchWrapper(facebookAuth));
router.get("/facebook-redirect", tryCatchWrapper(facebookRedirect));

export default router;
