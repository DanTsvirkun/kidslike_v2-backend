import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import {
  IParent,
  IChild,
  IHabit,
  ITask,
  IGift,
  IParentPopulated,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import UserModel from "./user.model";
import ChildModel from "../child/child.model";
import HabitModel from "../habit/habit.model";
import TaskModel from "../task/task.model";
import GiftModel from "../gift/gift.model";

export const clearAllInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res
      .status(403)
      .send({ message: `User with ${email} email doesn't exist` });
  }
  const isPasswordCorrect = await bcrypt.compare(
    password,
    (user as IParent).passwordHash
  );
  if (!isPasswordCorrect) {
    return res.status(403).send({ message: "Password is wrong" });
  }
  await UserModel.findOne({ email })
    .populate({
      path: "children",
      model: ChildModel,
      populate: [
        { path: "habits", model: HabitModel },
        { path: "tasks", model: TaskModel },
        { path: "gifts", model: GiftModel },
      ],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      (data as IParentPopulated).children.forEach(async (child) => {
        (child as IChildPopulated).habits.forEach(async (habit) => {
          await HabitModel.deleteOne({
            _id: (habit as IHabit)._id,
          });
        });
        (child as IChildPopulated).tasks.forEach(async (task) => {
          await TaskModel.deleteOne({
            _id: (task as ITask)._id,
          });
        });
        (child as IChildPopulated).gifts.forEach(async (gift) => {
          await GiftModel.deleteOne({
            _id: (gift as IGift)._id,
          });
        });
        await ChildModel.deleteOne({ _id: (child as IChildPopulated)._id });
      });
    });
  await UserModel.deleteOne({ email });
  return res.status(204).end();
};
