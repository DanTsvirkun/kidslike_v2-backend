import { Router } from "express";
import Joi from "joi";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";
import { addHabit, editHabit } from "./habit.controller";

const addHabitSchema = Joi.object({
  name: Joi.string().required(),
  rewardPerDay: Joi.number().required(),
});

const editHabitSchema = Joi.object({
  name: Joi.string(),
  rewardPerDay: Joi.number()
}).min(1)

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addHabitSchema),
  tryCatchWrapper(addHabit)
);
router.patch("/:childId/:habitId", authorize, validate(editHabitSchema), tryCatchWrapper(editHabit))

export default router;
