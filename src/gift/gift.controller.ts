import { Request, Response } from "express";
import { Types } from "mongoose";
import GiftModel from "./gift.model";
import { uploadImage } from "../function-helpers/multer-config";
import { IParent, IChild, IGift } from "../typescript-helpers/interfaces";
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
  if (!(req.body.price >= 1)) {
    return res
      .status(400)
      .send({ message: "Price must be greater or equal to 1" });
  }
  const giftImage = req.file;
  if (req.fileValidationError) {
    return res.status(415).send({ message: req.fileValidationError });
  }
  const imageUrl = await uploadImage(giftImage);
  const gift = await GiftModel.create({
    ...req.body,
    isPurchased: false,
    imageUrl,
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { gifts: gift },
  });
  return res.status(201).send(gift);
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
  if ((req.body.price || req.body.price === 0) && !(req.body.price >= 1)) {
    return res
      .status(400)
      .send({ message: "Price must be greater or equal to 1" });
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
  return res.status(200).send(newGift);
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
    return res.status(200).send({ updatedRewards, purchasedGift });
  }
  return res
    .status(409)
    .send({ message: "Not enough rewards for gaining this gift" });
};

export const getGifts = async (req: Request, res: Response) => {
  const parent = req.user;
  return UserModel.findOne(parent as IParent)
    .populate({
      path: "children",
      model: ChildModel,
      populate: [{ path: "gifts", model: GiftModel }],
    })
    .exec((err, data) =>
      res
        .status(200)
        .send(
          (data as IParent).children.map(
            (child) => ((child as unknown) as IChild).gifts
          )
        )
    );
};
