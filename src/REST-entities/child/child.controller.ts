import { Request, Response } from "express";
import {
  IParentPopulated,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import ChildModel from "./child.model";

export const addChild = async (req: Request, res: Response) => {
  const newChild = await ChildModel.create({ ...req.body, rewards: 0 });
  const parent = req.user;
  (parent as IParentPopulated).children.push(newChild as IChildPopulated);
  await (parent as IParentPopulated).save();
  return res.status(201).send({
    rewards: newChild.rewards,
    habits: newChild.habits,
    tasks: newChild.tasks,
    gifts: newChild.gifts,
    name: newChild.name,
    gender: newChild.gender,
    id: newChild._id,
  });
};
