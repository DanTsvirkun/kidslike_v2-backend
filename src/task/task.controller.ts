import { Request, Response } from "express";
import { Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { IParent } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addTask = async (req: Request, res: Response) => {
  const task = req.body;
  const taskId = uuid();
  const childToUPdate = (req.user as IParent).children.find(
    (child) => child.id === req.params.childId
  );
  if (!childToUPdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  await UserModel.update({"_id": (req.user as Document)._id, "children.id": req.params.childId}, {
    $push: { "children.$.tasks": { ...task, isCompleted: false, id: taskId } },
  });
  return res.status(201).send({ ...task, id: taskId });
};
