import { Request, Response } from "express";
import { Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { IChild } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";

export const addChild = async (req: Request, res: Response) => {
  const child: IChild = req.body;
  const childId = uuid();
  await UserModel.findByIdAndUpdate((req.user as Document)._id, {
    $push: {
      children: {
        ...child,
        id: childId,
        rewards: 0,
        habits: [],
        tasks: [],
        gifts: [],
      },
    },
  });
  return res.status(201).send({ ...child, id: childId });
};
