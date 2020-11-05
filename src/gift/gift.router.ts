import { Router } from "express";
import Joi from "joi";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";
import { addGift } from "./gift.controller";

const addGiftSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
});

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addGiftSchema),
  tryCatchWrapper(addGift)
);

export default router;
