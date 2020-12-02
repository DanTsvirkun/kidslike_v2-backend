import { Request, Response, NextFunction } from "express";
import { DateTime } from "luxon";
import { Document, Types } from "mongoose";
import {
  IParent,
  IChild,
  IHabit,
  IHabitDays,
  IParentPopulated,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import HabitModel from "./habit.model";
import ChildModel from "../child/child.model";
import UserModel from "../user/user.model";
import { TaskStatus } from "../../helpers/typescript-helpers/enums";

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
      isCompleted: TaskStatus.UNKNOWN,
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
  return res.status(201).send({
    days: (habit as IHabit).days,
    name: (habit as IHabit).name,
    rewardPerDay: (habit as IHabit).rewardPerDay,
    childId: (habit as IHabit).childId,
    id: (habit as IHabit).id,
  });
};

export const editHabit = async (req: Request, res: Response) => {
  const parent = req.user;
  const habitToEdit = await HabitModel.findById(req.params.habitId);
  if (!habitToEdit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (habitToEdit as IHabit).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const newHabit: IHabit = { ...habitToEdit.toObject(), ...req.body };
  await HabitModel.findByIdAndUpdate(req.params.habitId, newHabit, {
    // @ts-ignore
    overwrite: true,
  });
  return res.status(200).send({
    days: (newHabit as IHabit).days,
    name: (newHabit as IHabit).name,
    rewardPerDay: (newHabit as IHabit).rewardPerDay,
    childId: (newHabit as IHabit).childId,
    id: (newHabit as IHabit)._id,
  });
};

export const deleteHabit = async (req: Request, res: Response) => {
  const parent = req.user;
  const habitToDelete = await HabitModel.findById(req.params.habitId);
  if (!habitToDelete) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (habitToDelete as IHabit).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const deletedHabit = await HabitModel.findByIdAndDelete(req.params.habitId);
  await ChildModel.findByIdAndUpdate((deletedHabit as IHabit).childId, {
    $pull: { habits: Types.ObjectId((deletedHabit as IHabit)._id) },
  });
  return res.status(204).end();
};

export const habitDayConfirmed = async (req: Request, res: Response) => {
  const parent = req.user;
  const habitToEdit = await HabitModel.findById(req.params.habitId);
  if (!habitToEdit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (habitToEdit as IHabit).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const childToUpdate = await ChildModel.findById(
    (habitToEdit as IHabit).childId
  );
  const date = DateTime.local().toLocaleString();
  const completedDay = (habitToEdit as IHabit).days.find(
    (day) => day.date === date
  );
  if (completedDay) {
    if (completedDay.isCompleted === TaskStatus.CONFIRMED) {
      return res
        .status(403)
        .send({ message: "This day has already been confirmed" });
    }
    if (completedDay.isCompleted === TaskStatus.CANCELED) {
      return res
        .status(403)
        .send({ message: "This day has already been canceled" });
    }
  } else {
    return res
      .status(400)
      .send({ message: "Today's day doesn't exist on provided habit" });
  }
  const updatedHabit = await HabitModel.findOneAndUpdate(
    { _id: req.params.habitId, "days.date": date },
    { $set: { "days.$.isCompleted": TaskStatus.CONFIRMED } },
    { new: true }
  );
  let updatedRewards: number;
  if (
    (updatedHabit as IHabit).days.every(
      (day) => day.isCompleted === TaskStatus.CONFIRMED
    )
  ) {
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
  return res.status(200).send({
    updatedHabit: {
      days: (updatedHabit as IHabit).days,
      name: (updatedHabit as IHabit).name,
      rewardPerDay: (updatedHabit as IHabit).rewardPerDay,
      childId: (updatedHabit as IHabit).childId,
      id: (updatedHabit as IHabit)._id,
    },
    updatedRewards,
  });
};

export const habitDayCanceled = async (req: Request, res: Response) => {
  const parent = req.user;
  const habitToEdit = await HabitModel.findById(req.params.habitId);
  if (!habitToEdit) {
    return res.status(404).send({ message: "Habit not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (habitToEdit as IHabit).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const date = DateTime.local().toLocaleString();
  const completedDay = (habitToEdit as IHabit).days.find(
    (day) => day.date === date
  );
  if (completedDay) {
    if (completedDay.isCompleted === TaskStatus.CANCELED) {
      return res
        .status(403)
        .send({ message: "This day has already been canceled" });
    }
    if (completedDay.isCompleted === TaskStatus.CONFIRMED) {
      return res
        .status(403)
        .send({ message: "This day has already been confirmed" });
    }
  } else {
    return res
      .status(400)
      .send({ message: "Today's day doesn't exist on provided habit" });
  }
  const updatedHabit = await HabitModel.findOneAndUpdate(
    { _id: req.params.habitId, "days.date": date },
    { $set: { "days.$.isCompleted": TaskStatus.CANCELED } },
    { new: true }
  );
  return res.status(200).send({
    days: (updatedHabit as IHabit).days,
    name: (updatedHabit as IHabit).name,
    rewardPerDay: (updatedHabit as IHabit).rewardPerDay,
    childId: (updatedHabit as IHabit).childId,
    id: (updatedHabit as IHabit)._id,
  });
};

export const getHabits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const parent = req.user;
  return UserModel.findOne(parent as IParent)
    .populate({
      path: "children",
      model: ChildModel,
      populate: [{ path: "habits", model: HabitModel }],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      const dataToEdit = (data as IParentPopulated).children.map(
        (child) => (child as IChildPopulated).habits
      );
      const dataToSend = dataToEdit.map((childArray) => {
        return childArray.map((childHabit) => ({
          days: (childHabit as IHabit).days,
          name: (childHabit as IHabit).name,
          rewardPerDay: (childHabit as IHabit).rewardPerDay,
          childId: (childHabit as IHabit).childId,
          id: (childHabit as IHabit)._id,
        }));
      });
      return res.status(200).send(dataToSend);
    });
};
