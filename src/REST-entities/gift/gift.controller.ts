import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import GiftModel from "./gift.model";
import { uploadImage } from "../../helpers/function-helpers/multer-config";
import {
  IParent,
  IChild,
  IGift,
  IParentPopulated,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import ChildModel from "../child/child.model";
import UserModel from "../user/user.model";

export const addGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === req.params.childId
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const giftImage = req.file;
  if (req.fileValidationError) {
    return res.status(415).send({ message: req.fileValidationError });
  }
  const imageUrl = await uploadImage(giftImage);
  const gift = await GiftModel.create({
    ...req.body,
    imageUrl,
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { gifts: gift },
  });
  return res.status(201).send({
    name: (gift as IGift).name,
    price: (gift as IGift).price,
    isPurchased: (gift as IGift).isPurchased,
    imageUrl: (gift as IGift).imageUrl,
    childId: (gift as IGift).childId,
    id: (gift as IGift)._id,
  });
};

export const editGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const giftToEdit = await GiftModel.findById(req.params.giftId);
  if (!giftToEdit) {
    return res.status(404).send({ message: "Gift not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) => childId.toString() === (giftToEdit as IGift).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (!req.file && !req.body.name && !req.body.price) {
    return res.status(400).send({ message: "At least one field is required" });
  }
  let imageUrl = (giftToEdit as IGift).imageUrl;
  const giftImage = req.file;
  if (req.fileValidationError) {
    return res.status(415).send({ message: req.fileValidationError });
  }
  if (giftImage) {
    // @ts-ignore
    imageUrl = await uploadImage(req.file);
  }
  const newGift: IGift = { ...giftToEdit.toObject(), ...req.body, imageUrl };
  await GiftModel.findByIdAndUpdate(req.params.giftId, newGift, {
    // @ts-ignore
    overwrite: true,
  });
  return res.status(200).send({
    name: (newGift as IGift).name,
    price: (newGift as IGift).price,
    isPurchased: (newGift as IGift).isPurchased,
    imageUrl: (newGift as IGift).imageUrl,
    childId: (newGift as IGift).childId,
    id: (newGift as IGift)._id,
  });
};

export const deleteGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const giftToDelete = await GiftModel.findById(req.params.giftId);
  if (!giftToDelete) {
    return res.status(404).send({ message: "Gift not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (giftToDelete as IGift).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const deletedGift = await GiftModel.findByIdAndDelete(req.params.giftId);
  await ChildModel.findByIdAndUpdate((deletedGift as IGift).childId, {
    $pull: { gifts: Types.ObjectId((deletedGift as IGift)._id) },
  });
  return res.status(204).end();
};

export const buyGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const giftToBuy = await GiftModel.findById(req.params.giftId);
  if (!giftToBuy) {
    return res.status(404).send({ message: "Gift not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === (giftToBuy as IGift).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const childToUpdate = await ChildModel.findById(childToUpdateId);
  if ((giftToBuy as IGift).isPurchased) {
    return res
      .status(403)
      .send({ message: "This gift has already been purchased" });
  }
  if ((childToUpdate as IChild).rewards >= (giftToBuy as IGift).price) {
    const updatedRewards =
      (childToUpdate as IChild).rewards - (giftToBuy as IGift).price;
    const purchasedGift = await GiftModel.findByIdAndUpdate(
      giftToBuy._id,
      {
        $set: { isPurchased: true },
      },
      { new: true }
    );
    await ChildModel.findByIdAndUpdate(childToUpdateId, {
      $set: { rewards: updatedRewards },
    });
    return res.status(200).send({
      updatedRewards,
      purchasedGift: {
        name: (purchasedGift as IGift).name,
        price: (purchasedGift as IGift).price,
        isPurchased: (purchasedGift as IGift).isPurchased,
        imageUrl: (purchasedGift as IGift).imageUrl,
        childId: (purchasedGift as IGift).childId,
        id: (purchasedGift as IGift)._id,
      },
    });
  }
  return res
    .status(409)
    .send({ message: "Not enough rewards for gaining this gift" });
};

export const getGifts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const parent = req.user;
  return UserModel.findOne(parent as IParent)
    .populate({
      path: "children",
      model: ChildModel,
      populate: [{ path: "gifts", model: GiftModel }],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      const dataToEdit = (data as IParentPopulated).children.map(
        (child) => (child as IChildPopulated).gifts
      );
      const dataToSend = dataToEdit.map((childArray) => {
        return childArray.map((childGift) => ({
          name: (childGift as IGift).name,
          price: (childGift as IGift).price,
          isPurchased: (childGift as IGift).isPurchased,
          imageUrl: (childGift as IGift).imageUrl,
          childId: (childGift as IGift).childId,
          id: (childGift as IGift)._id,
        }));
      });
      return res.status(200).send(dataToSend);
    });
};

export const resetGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const giftToReset = await GiftModel.findById(req.params.giftId);
  if (!giftToReset) {
    return res.status(404).send({ message: "Gift not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (giftToReset as IGift).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (!(giftToReset as IGift).isPurchased) {
    return res
      .status(403)
      .send({ message: "This gift has been already reset" });
  }
  (giftToReset as IGift).isPurchased = false;
  await giftToReset.save();
  res.status(200).send({
    name: (giftToReset as IGift).name,
    price: (giftToReset as IGift).price,
    isPurchased: (giftToReset as IGift).isPurchased,
    imageUrl: (giftToReset as IGift).imageUrl,
    childId: (giftToReset as IGift).childId,
    id: (giftToReset as IGift)._id,
  });
};
