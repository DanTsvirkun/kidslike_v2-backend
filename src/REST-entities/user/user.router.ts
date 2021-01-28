import { Router } from "express";
import Joi from "joi";
import validate from "../../helpers/function-helpers/validate";
import { authorize } from "./../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import { getAllInfo, clearAllInfo } from "./user.controller";

const clearAllInfoSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const router = Router();

router
  .route("/")
  .get(tryCatchWrapper(authorize), tryCatchWrapper(getAllInfo))
  .delete(validate(clearAllInfoSchema), tryCatchWrapper(clearAllInfo));

export default router;
