import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { IParent, IChild } from "../typescript-helpers/interfaces";

export const addGift = async (req: Request, res: Response) => {
  const parent = req.user;
  const gift = { ...req.body, isPurchased: false, id: uuid() };
  let childToUpdateIndex: number;
  const childToUpdate = (parent as IParent).children.find((child, index) => {
    childToUpdateIndex = index;
    return ((child as unknown) as IChild)._id.toString() === req.params.childId;
  });
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  // @ts-ignore
  (parent as IParent).children[childToUpdateIndex].gifts.push(gift);
  await (parent as IParent).save();
  return res.status(201).send(gift);
};
