import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Document } from "mongoose";
import { IParent } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addGift = async (req: Request, res: Response) => {
  const gift = req.body;
  const giftId = uuid();
  const childToUPdate = (req.user as IParent).children.find(
    (child) => child.id === req.params.childId
  );
  if (!childToUPdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  await UserModel.update(
    { _id: (req.user as Document)._id, "children.id": req.params.childId },
    {
      $push: {
        "children.$.gifts": {
          ...gift,
          isPurchased: false,
          id: giftId,
        },
      },
    }
  );
  return res.status(201).send({ ...gift, daysCompleted: 0, id: giftId });
};
