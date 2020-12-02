import { Request, Response } from "express";
import {
  IParent,
  IParentPopulated,
  IChild,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import ChildModel from "./child.model";

export const addChild = async (req: Request, res: Response) => {
  const newChild = await ChildModel.create(req.body);
  const parent = req.user;
  (parent as IParentPopulated).children.push(newChild as IChildPopulated);
  await (parent as IParent).save();
  return res.status(201).send({
    rewards: (newChild as IChild).rewards,
    habits: (newChild as IChild).habits,
    tasks: (newChild as IChild).tasks,
    gifts: (newChild as IChild).gifts,
    name: (newChild as IChild).name,
    gender: (newChild as IChild).gender,
    id: (newChild as IChild)._id,
  });
};
