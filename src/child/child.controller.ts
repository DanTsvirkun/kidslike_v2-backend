import { Request, Response } from "express";
import { Document } from "mongoose";
import { IChild, IParent } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addChild = async (req: Request, res: Response) => {
  const newChild: IChild = req.body;
  const parent = await UserModel.findOne({_id: (req.user as Document)._id});
  (parent as IParent).children.push(newChild as IChild);
  const updatedParent = await (parent as IParent).save()
  return res.status(201).send(updatedParent.children.slice(-1)[0]);
};
