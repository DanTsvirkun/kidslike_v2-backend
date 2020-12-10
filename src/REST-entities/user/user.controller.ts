import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import {
  IParent,
  IParentPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import UserModel from "./user.model";
import ChildModel from "../child/child.model";
import HabitModel from "../habit/habit.model";
import TaskModel from "../task/task.model";
import GiftModel from "../gift/gift.model";

export const getAllInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const email = (req.user as IParent).email;
  return UserModel.findOne({ email })
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
      return res.status(200).send({
        email: (data as IParentPopulated).email,
        username: (data as IParentPopulated).username,
        id: (data as IParentPopulated)._id,
        children: (data as IParentPopulated).children,
      });
    });
};

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
  const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
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
        child.habits.forEach(async (habit) => {
          await HabitModel.deleteOne({
            _id: habit._id,
          });
        });
        child.tasks.forEach(async (task) => {
          await TaskModel.deleteOne({
            _id: task._id,
          });
        });
        child.gifts.forEach(async (gift) => {
          await GiftModel.deleteOne({
            _id: gift._id,
          });
        });
        await ChildModel.deleteOne({ _id: child._id });
      });
    });
  await UserModel.deleteOne({ email });
  return res.status(204).end();
};
