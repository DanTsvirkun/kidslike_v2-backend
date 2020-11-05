import { Router } from "express";
import Joi from "joi";
import validate from "../function-helpers/validate";
import { authorize } from "../auth/auth.controller";
import { addTask } from "./task.controller";
import tryCatchWrapper from "../function-helpers/try-catch-wrapper";

export const addTaskSchema = Joi.object({
  name: Joi.string().required(),
  reward: Joi.number().required(),
  daysToComplete: Joi.number(),
});

const router = Router();

router.post(
  "/:childId",
  authorize,
  validate(addTaskSchema),
  tryCatchWrapper(addTask)
);

export default router;
