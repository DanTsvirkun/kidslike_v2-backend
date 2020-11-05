import { Router } from "express";
import Joi from "joi";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";
import { addHabit } from "./habit.controller";

const addHabitSchema = Joi.object({
  name: Joi.string().required(),
  rewardPerDay: Joi.number().required(),
});

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addHabitSchema),
  tryCatchWrapper(addHabit)
);

export default router;
