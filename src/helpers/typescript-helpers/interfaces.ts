import { Document } from "mongoose";
import { Gender, TaskStatus } from "./enums";
import { MongoDBObjectId } from "./types";

export interface IParent extends Document {
  email: string;
  passwordHash: string;
  username: string;
  originUrl: string | undefined;
  children: MongoDBObjectId[];
}

export interface IParentPopulated extends Document {
  email: string;
  passwordHash: string;
  username: string;
  originUrl: string | undefined;
  children: IChildPopulated[];
}

export interface IChild extends Document {
  name: string;
  rewards: number;
  gender: Gender;
  habits: MongoDBObjectId[];
  tasks: MongoDBObjectId[];
  gifts: MongoDBObjectId[];
}

export interface IChildPopulated extends Document {
  name: string;
  rewards: number;
  gender: Gender;
  habits: IHabit[];
  tasks: ITask[];
  gifts: IGift[];
}

export interface ISession extends Document {
  uid: string;
}

export interface IHabit extends Document {
  name: string;
  rewardPerDay: number;
  days: IHabitDays[];
  childId: MongoDBObjectId;
}

export interface ITask extends Document {
  name: string;
  reward: number;
  isCompleted: TaskStatus;
  daysToComplete?: number;
  startDate: string;
  endDate?: string;
  childId: MongoDBObjectId;
}

export interface IGift extends Document {
  name: string;
  price: number;
  imageUrl: string;
  isPurchased: boolean;
  childId: MongoDBObjectId;
}

export interface IJWTPayload {
  uid: string;
  sid: string;
}

export interface IHabitDays {
  date: string;
  isCompleted: TaskStatus;
}
