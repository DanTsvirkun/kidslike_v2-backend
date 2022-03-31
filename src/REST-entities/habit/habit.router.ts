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
  name: Joi.string().min(2).max(100).required(),
  rewardPerDay: Joi.number().required().min(1).max(10000),
});

const editHabitSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  rewardPerDay: Joi.number().min(1).max(10000),
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
      const dateRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/;
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
router
  .route("/:habitId")
  .patch(
    tryCatchWrapper(authorize),
    validate(editOrDeleteHabitIdSchema, "params"),
    validate(editHabitSchema),
    tryCatchWrapper(editHabit)
  )
  .delete(
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
