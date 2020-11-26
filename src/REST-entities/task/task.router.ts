import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import validate from "../../helpers/function-helpers/validate";
import { authorize } from "../../auth/auth.controller";
import {
  addTask,
  deleteTask,
  editTask,
  confirmTask,
  cancelTask,
  getTasks,
  resetTask,
} from "./task.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";

const addTaskSchema = Joi.object({
  name: Joi.string().required(),
  reward: Joi.number().required().min(1),
  daysToComplete: Joi.number().min(1),
});

const editTaskSchema = Joi.object({
  name: Joi.string(),
  reward: Joi.number().min(1),
  daysToComplete: Joi.number().min(1),
}).min(1);

const addTaskIdSchema = Joi.object({
  childId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'childId'. Must be MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const editOrDeleteTaskIdSchema = Joi.object({
  taskId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'taskId'. Must be MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.get("/", authorize, tryCatchWrapper(getTasks));
router.post(
  "/:childId",
  authorize,
  validate(addTaskIdSchema, "params"),
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
  "/confirm/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(confirmTask)
);
router.patch(
  "/cancel/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(cancelTask)
);
router.patch(
  "/reset/:taskId",
  authorize,
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(resetTask)
);

export default router;
