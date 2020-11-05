import { Router } from "express";
import Joi from "joi";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import { addChild } from "./child.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";

const addGiftSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  imageUrl: Joi.string().required(),
  isPurchased: Joi.boolean().required(),
  childId: Joi.string().required(),
});

const addChildSchema = Joi.object({
  name: Joi.string().required(),
  gender: Joi.string().valid("male", "female").required(),
});

const router = Router();

router.post(
  "/",
  authorize,
  validate(addChildSchema),
  tryCatchWrapper(addChild)
);

export default router;
