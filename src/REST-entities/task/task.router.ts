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
  getFinishedTasks,
} from "./task.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";

const addTaskSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  reward: Joi.number().required().min(1).max(10000),
  daysToComplete: Joi.number().min(1).max(10000),
});

const editTaskSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  reward: Joi.number().min(1).max(10000),
  daysToComplete: Joi.number().min(1).max(10000),
}).min(1);

const addOrGetTaskIdSchema = Joi.object({
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

const editOrDeleteTaskIdSchema = Joi.object({
  taskId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'taskId'. Must be a MongoDB ObjectId",
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
  tryCatchWrapper(authorize),
  validate(addOrGetTaskIdSchema, "params"),
  validate(addTaskSchema),
  tryCatchWrapper(addTask)
);
router
  .route("/:taskId")
  .patch(
    tryCatchWrapper(authorize),
    validate(editOrDeleteTaskIdSchema, "params"),
    validate(editTaskSchema),
    tryCatchWrapper(editTask)
  )
  .delete(
    tryCatchWrapper(authorize),
    validate(editOrDeleteTaskIdSchema, "params"),
    tryCatchWrapper(deleteTask)
  );
router.patch(
  "/confirm/:taskId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(confirmTask)
);
router.patch(
  "/cancel/:taskId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(cancelTask)
);
router.patch(
  "/reset/:taskId",
  tryCatchWrapper(authorize),
  validate(editOrDeleteTaskIdSchema, "params"),
  tryCatchWrapper(resetTask)
);
router.get(
  "/finished/:childId",
  tryCatchWrapper(authorize),
  validate(addOrGetTaskIdSchema, "params"),
  tryCatchWrapper(getFinishedTasks)
);

export default router;
