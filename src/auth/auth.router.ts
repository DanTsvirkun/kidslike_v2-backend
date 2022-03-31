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
  email: Joi.string().min(3).max(254).required(),
  password: Joi.string().min(8).max(100).required(),
  username: Joi.string().min(2).max(100).required(),
});

const signInSchema = Joi.object({
  email: Joi.string().min(3).max(254).required(),
  password: Joi.string().min(8).max(100).required(),
});

const refreshTokensSchema = Joi.object({
  sid: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'sid'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post("/register", validate(signUpSchema), tryCatchWrapper(register));
router.post("/login", validate(signInSchema), tryCatchWrapper(login));
router.post("/logout", tryCatchWrapper(authorize), tryCatchWrapper(logout));
router.post(
  "/refresh",
  validate(refreshTokensSchema),
  tryCatchWrapper(refreshTokens)
);
router.get("/google", tryCatchWrapper(googleAuth));
router.get("/google-redirect", tryCatchWrapper(googleRedirect));
router.get("/facebook", tryCatchWrapper(facebookAuth));
router.get("/facebook-redirect", tryCatchWrapper(facebookRedirect));

export default router;
