import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IParent } from "../typescript-helpers/interfaces";
import UserModel from "../user/user.model";
import SessionModel from "../sessions/session.model";

export const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res
      .status(409)
      .send({ message: `User with ${email} email already exists` });
  }
  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.HASH_POWER)
  );
  const newParent = await UserModel.create({
    email,
    passwordHash,
    username,
  });
  return res.status(201).send({
    id: newParent._id,
    email,
    username,
  });
};

export const login = async (req: Request, res: Response) => {
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
  const newSession = await SessionModel.create({
    uid: user._id,
  });
  const accessToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
    }
  );
  const refreshToken = jwt.sign(
    { uid: user._id, sid: newSession._id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME,
    }
  );
  res.status(200).send({
    id: user._id,
    sid: newSession._id,
    username: (user as IParent).username,
    children: (user as IParent).children,
    accessToken,
    refreshToken,
  });
};
