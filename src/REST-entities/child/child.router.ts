import { Router } from "express";
import Joi from "joi";
import validate from "../../helpers/function-helpers/validate";
import { authorize } from "../../auth/auth.controller";
import { addChild } from "./child.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import { Gender } from "../../helpers/typescript-helpers/enums";

const addChildSchema = Joi.object({
  name: Joi.string().required(),
  gender: Joi.string().valid(Gender.MALE, Gender.FEMALE).required(),
});

const router = Router();

router.post(
  "/",
  tryCatchWrapper(authorize),
  validate(addChildSchema),
  tryCatchWrapper(addChild)
);

export default router;
