import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import { addTask, deleteTask, editTask, confirmTask } from "./task.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";

const addTaskSchema = Joi.object({
  name: Joi.string().required(),
  reward: Joi.number().required(),
  daysToComplete: Joi.number(),
});

const editTaskSchema = Joi.object({
  name: Joi.string(),
  reward: Joi.number(),
  daysToComplete: Joi.number(),
}).min(1);

const editOrDeleteTaskIdSchema = Joi.object({
  taskId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.error("Invalid task id. Must be MongoDB object id");
      }
      return value;
    })
    .required(),
});

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addTaskSchema),
  tryCatchWrapper(addTask)
);
router.patch(
  "/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  validate(editTaskSchema),
  tryCatchWrapper(editTask)
);
router.delete(
  "/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(deleteTask)
);
router.patch(
  "/complete/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(confirmTask)
);

export default router;
