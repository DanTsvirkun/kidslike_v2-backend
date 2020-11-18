import { Request, Response } from "express";
import { IParent } from "../../helpers/typescript-helpers/interfaces";
import { MongoDBObjectId } from "../../helpers/typescript-helpers/types";
import ChildModel from "./child.model";

export const addChild = async (req: Request, res: Response) => {
  const newChild = await ChildModel.create(req.body);
  const parent = req.user;
  (parent as IParent).children.push((newChild as unknown) as MongoDBObjectId);
  await (parent as IParent).save();
  return res.status(201).send(newChild);
};
