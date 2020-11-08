import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";
import {
  addHabit,
  deleteHabit,
  editHabit,
  habitDaySuccessful,
} from "./habit.controller";

const addHabitSchema = Joi.object({
  name: Joi.string().required(),
  rewardPerDay: Joi.number().required(),
});

const addHabitIdSchema = Joi.object({
  childId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.error("Invalid habit id. Must be MongoDB object id");
      }
      return value;
    })
    .required(),
});

const editHabitSchema = Joi.object({
  name: Joi.string(),
  rewardPerDay: Joi.number(),
}).min(1);

const editOrDeleteHabitIdSchema = Joi.object({
  habitId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.error("Invalid habit id. Must be MongoDB object id");
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addHabitIdSchema, "params"),
  validate(addHabitSchema),
  tryCatchWrapper(addHabit)
);
router.patch(
  "/:habitId",
  authorize,
  validate(editOrDeleteHabitIdSchema, "params"),
  validate(editHabitSchema),
  tryCatchWrapper(editHabit)
);
router.delete(
  "/:habitId",
  authorize,
  validate(editOrDeleteHabitIdSchema, "params"),
  tryCatchWrapper(deleteHabit)
);
router.patch(
  "/successful/:habitId",
  authorize,
  validate(editOrDeleteHabitIdSchema, "params"),
  tryCatchWrapper(habitDaySuccessful)
);

export default router;
