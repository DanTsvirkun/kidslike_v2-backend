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
  habitDayConfirmed,
  habitDayCanceled,
  getHabits,
} from "./habit.controller";

const addHabitSchema = Joi.object({
  name: Joi.string().required(),
  rewardPerDay: Joi.number().required(),
});

const editHabitSchema = Joi.object({
  name: Joi.string(),
  rewardPerDay: Joi.number(),
}).min(1);

const addHabitIdSchema = Joi.object({
  childId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.error("Invalid child id. Must be MongoDB object id");
      }
      return value;
    })
    .required(),
});

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

router.get("/", authorize, tryCatchWrapper(getHabits));
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
  "/confirm/:habitId",
  authorize,
  validate(editOrDeleteHabitIdSchema, "params"),
  tryCatchWrapper(habitDayConfirmed)
);
router.patch(
  "/cancel/:habitId",
  authorize,
  validate(editOrDeleteHabitIdSchema, "params"),
  tryCatchWrapper(habitDayCanceled)
);

export default router;
