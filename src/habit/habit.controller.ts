import { Request, Response } from "express";
import { DateTime } from "luxon";
import { Document, Types } from "mongoose";
import {
  IParent,
  IChild,
  IHabit,
  IHabitDays,
} from "../typescript-helpers/interfaces";
import { HabitModel } from "./habit.model";
import { ChildModel } from "../child/child.model";

export const addHabit = async (req: Request, res: Response) => {
  const parent = req.user;
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === req.params.childId
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const habitDays: IHabitDays[] = [];
  const date = DateTime.local();
  for (let i = 0; i < 10; i++) {
    habitDays.push({
      date: date.plus({ days: i }).toLocaleString(),
      isCompleted: false,
    });
  }
  const habit = await HabitModel.create({
    ...req.body,
    days: habitDays,
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { habits: habit },
  });
  return res.status(201).send(habit);
};

export const editHabit = async (req: Request, res: Response) => {
  const habitToEdit = await HabitModel.findById(req.params.habitId);
  if (!habitToEdit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const newHabit: IHabit = { ...habitToEdit.toObject(), ...req.body };
  await HabitModel.findByIdAndUpdate(req.params.habitId, newHabit, {
    // @ts-ignore
    overwrite: true,
  });
  return res.status(200).send(newHabit);
};

export const deleteHabit = async (req: Request, res: Response) => {
  const deletedHabit = await HabitModel.findByIdAndDelete(req.params.habitId);
  if (!deletedHabit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  await ChildModel.findByIdAndUpdate((deletedHabit as IHabit).childId, {
    $pull: { habits: Types.ObjectId(deletedHabit._id) },
  });
  return res.status(204).end();
};

export const habitDaySuccessful = async (req: Request, res: Response) => {
  const habitToEdit = await HabitModel.findById(req.params.habitId);
  if (!habitToEdit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const childToUpdate = await ChildModel.findById(
    (habitToEdit as IHabit).childId
  );
  const date = DateTime.local().toLocaleString();
  const completedDay = (habitToEdit as IHabit).days.find(
    (day) => day.date === date
  );
  if (completedDay) {
    if (completedDay.isCompleted === true) {
      return res
        .status(403)
        .send({ message: "This day has been already completed" });
    }
  } else {
    return res
      .status(400)
      .send({ message: "Today's day doesn't exist on provided habit" });
  }
  const updatedHabit = await HabitModel.findOneAndUpdate(
    { _id: req.params.habitId, "days.date": date },
    { $set: { "days.$.isCompleted": true } },
    { new: true }
  );
  let updatedRewards: number;
  if ((updatedHabit as IHabit).days.every((day) => day.isCompleted === true)) {
    updatedRewards =
      (childToUpdate as IChild).rewards +
      (habitToEdit as IHabit).rewardPerDay +
      (habitToEdit as IHabit).rewardPerDay * 10 * 0.5;
    await ChildModel.findByIdAndUpdate((childToUpdate as Document)._id, {
      $set: {
        rewards: updatedRewards,
      },
    });
  } else {
    updatedRewards =
      (childToUpdate as IChild).rewards + (habitToEdit as IHabit).rewardPerDay;
    await ChildModel.findByIdAndUpdate((childToUpdate as Document)._id, {
      $set: { rewards: updatedRewards },
    });
  }
  return res.status(201).send({ updatedHabit, updatedRewards });
};
