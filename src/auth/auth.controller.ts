import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IParent, IJWTPayload } from "../typescript-helpers/interfaces";
import { UserModel } from "../user/user.model";
import SessionModel from "../session/session.model";
import { NextFunction } from "express-serve-static-core";
import { Document } from "mongoose";

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
  return res.status(200).send({
    id: user._id,
    sid: newSession._id,
    username: (user as IParent).username,
    children: (user as IParent).children,
    accessToken,
    refreshToken,
  });
};

export const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const accessToken = authorizationHeader.replace("Bearer ", "");
    let payload: string | object;
    try {
      payload = jwt.verify(accessToken, process.env.JWT_SECRET as string);
    } catch (err) {
      return res.status(401).send({ message: "Unathorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    req.user = user;
    req.session = session;
    next();
  } else return res.status(400).send({ message: "No token provided" });
};

export const refreshTokens = async (req: Request, res: Response) => {
  const authorizationHeader = req.get("Authorization");
  if (authorizationHeader) {
    const reqRefreshToken = authorizationHeader.replace("Bearer", "");
    let payload: string | object;
    try {
      payload = jwt.verify(reqRefreshToken, process.env.JWT_SECRET as string);
    } catch (err) {
      await SessionModel.findByIdAndDelete(req.body.sid);
      return res.status(401).send({ message: "Unauthorized" });
    }
    const user = await UserModel.findById((payload as IJWTPayload).uid);
    const session = await SessionModel.findById((payload as IJWTPayload).sid);
    if (!user) {
      return res.status(404).send({ message: "Invalid user" });
    }
    if (!session) {
      return res.status(404).send({ message: "Invalid session" });
    }
    await SessionModel.findByIdAndDelete((payload as IJWTPayload).sid);
    const newSession = await SessionModel.create({
      uid: user._id,
    });
    const newAccessToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRE_TIME,
      }
    );
    const newRefreshToken = jwt.sign(
      { uid: user._id, sid: newSession._id },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME }
    );
    return res.status(200).send({ newAccessToken, newRefreshToken });
  }
  return res.status(400).send({ message: "No token provided" });
};

export const logout = async (req: Request, res: Response) => {
  const currentSession = req.session;
  await SessionModel.deleteOne({ _id: (currentSession as Document)._id });
  req.user = null;
  req.session = null;
  return res.status(204).end();
};
