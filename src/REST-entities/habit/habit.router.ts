import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import validate from "../../helpers/function-helpers/validate";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
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
  rewardPerDay: Joi.number().required().min(1),
});

const editHabitSchema = Joi.object({
  name: Joi.string(),
  rewardPerDay: Joi.number().min(1),
}).min(1);

const addHabitIdSchema = Joi.object({
  childId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'childId'. Must be a MongoDB ObjectId",
        });
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
        return helpers.message({
          custom: "Invalid 'habitId'. Must be a MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const dateHabitSchema = Joi.object({
  date: Joi.string()
    .custom((value, helpers) => {
      const dateRegex = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/;
      const isValidDate = dateRegex.test(value);
      if (!isValidDate) {
        return helpers.message({
          custom: "Invalid 'date'. Please, use YYYY-MM-DD string format",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.get("/", authorize, tryCatchWrapper(getHabits));
router.post(
  "/:childId",
  tryCatchWrapper(authorize),
  validate(addHabitIdSchema, "params"),
  validate(addHabitSchema),
  tryCatchWrapper(addHabit)
);
router.patch(
  "/:habitId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteHabitIdSchema, "params"),
  validate(editHabitSchema),
  tryCatchWrapper(editHabit)
);
router.delete(
  "/:habitId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteHabitIdSchema, "params"),
  tryCatchWrapper(deleteHabit)
);
router.patch(
  "/confirm/:habitId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteHabitIdSchema, "params"),
  validate(dateHabitSchema),
  tryCatchWrapper(habitDayConfirmed)
);
router.patch(
  "/cancel/:habitId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteHabitIdSchema, "params"),
  validate(dateHabitSchema),
  tryCatchWrapper(habitDayCanceled)
);

export default router;
