import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Document } from "mongoose";
import { IParent } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addHabit = async (req: Request, res: Response) => {
  const habit = req.body;
  const habitId = uuid();
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
        "children.$.habits": {
          ...habit,
          daysCompleted: 0,
          id: habitId,
        },
      },
    }
  );
  return res.status(201).send({ ...habit, daysCompleted: 0, id: habitId });
};
