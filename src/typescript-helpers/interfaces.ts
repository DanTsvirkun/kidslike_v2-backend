import { Document } from "mongoose";
import { Gender } from "./enums";
import { MongoDBObjectId } from "./types";

export interface IParent extends Document {
  email: string;
  passwordHash: string;
  username: string;
  children: MongoDBObjectId[];
}

export interface IChild extends Document {
  name: string;
  rewards: number;
  gender: Gender;
  habits: MongoDBObjectId[];
  tasks: MongoDBObjectId[];
  gifts: MongoDBObjectId[];
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
  isCompleted: boolean;
  daysToComplete?: number;
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
  isCompleted: boolean;
}
