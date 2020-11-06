import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Document } from "mongoose";
import { IParent, IChild } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addHabit = async (req: Request, res: Response) => {
  const parent = req.user;
  const habit = { ...req.body, daysCompleted: 0, id: uuid() };
  const childToUpdate = (parent as IParent).children.find(
    (child) => child._id.toString() === req.params.childId
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  // ((parent as IParent).children.find(
  //   (child) => child._id.toString() === req.params.childId
  // ) as IChild).habits.push({
  //   ...habit,
  //   daysCompleted: 0,
  //   id: habitId,
  // });
  const updatedParent = await (parent as IParent).save();
  // await UserModel.update(
  //   { _id: (req.user as Document)._id, "children.id": req.params.childId },
  //   {
  //     $push: {
  //       "children.$.habits": {
  //         ...habit,
  //         daysCompleted: 0,
  //         id: habitId,
  //       },
  //     },
  //   }
  // );
  return res.status(201).send(updatedParent.children.slice(-1)[0]);
};

export const editHabit = async (req: Request, res: Response) => {
  const currentUser = req.user;
  const childToEdit = (currentUser as IParent).children.find(
    (child) => child.id === req.params.childId
  );
  const habitToEdit = (childToEdit as IChild).habits.find(
    (habit) => habit.id === req.params.habitId
  );
  const newHabit = { ...habitToEdit, ...req.body };
  await UserModel.updateOne(
    {
      _id: (req.user as Document)._id,
      children: {
        $elemMatch: {
          id: req.params.childId,
          "habits.id": req.params.habitId,
        },
      },
    },
    {
      $set: {
        "children.$[childId].habits.$[habit].name": newHabit.name,
      },
    },
    {
      arrayFilters: [
        { "childId.id": req.params.childId },
        { "habit.id": req.params.habitId },
      ],
    }
  );
};
