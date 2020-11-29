import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import validate from "../../helpers/function-helpers/validate";
import { authorize } from "../../auth/auth.controller";
import tryCatchWrapper from "../../helpers/function-helpers/try-catch-wrapper";
import {
  addGift,
  editGift,
  deleteGift,
  buyGift,
  getGifts,
  resetGift,
} from "./gift.controller";
import { multerMid } from "../../helpers/function-helpers/multer-config";

const addGiftSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required().min(1),
});

const editGiftSchema = Joi.object({
  name: Joi.string(),
  price: Joi.number().min(1),
});

const addGiftIdSchema = Joi.object({
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

const editOrDeleteGiftIdSchema = Joi.object({
  giftId: Joi.string()
    .custom((value, helpers) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      if (!isValidObjectId) {
        return helpers.message({
          custom: "Invalid 'giftId'. Must be MongoDB ObjectId",
        });
      }
      return value;
    })
    .required(),
});

const router = Router();

router.get("/", authorize, tryCatchWrapper(getGifts));
router.post(
  "/:childId",
  authorize,
  multerMid.single("file"),
  validate(addGiftIdSchema, "params"),
  validate(addGiftSchema),
  tryCatchWrapper(addGift)
);
router.patch(
  "/:giftId",
  authorize,
  multerMid.single("file"),
  validate(editOrDeleteGiftIdSchema, "params"),
  validate(editGiftSchema),
  tryCatchWrapper(editGift)
);
router.delete(
  "/:giftId",
  authorize,
  validate(editOrDeleteGiftIdSchema, "params"),
  tryCatchWrapper(deleteGift)
);
router.patch(
  "/buy/:giftId",
  authorize,
  validate(editOrDeleteGiftIdSchema, "params"),
  tryCatchWrapper(buyGift)
);
router.patch(
  "/reset/:giftId",
  authorize,
  validate(editOrDeleteGiftIdSchema, "params"),
  tryCatchWrapper(resetGift)
);

export default router;
