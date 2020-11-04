import { Document } from "mongoose";
import { Gender } from "./enums";

export interface IParent extends Document {
  email: string;
  passwordHash: string;
  username: string;
  children: IChild[];
}

export interface IChild {
  name: string;
  rewards: number;
  gender: Gender;
  habits: IHabit[];
  tasks: ITask[];
  gifts: IGift[];
  id: string;
}

export interface IHabit {
  name: string;
  rewardPerDay: number;
  daysCompleted: boolean[];
  id: string;
}

export interface ITask {
  name: string;
  reward: number;
  isCompleted: boolean;
  id: string;
  daysToComplete?: number;
}

export interface IGift {
  name: string;
  price: number;
  imageUrl: string;
  isPurchased: boolean;
  id: string;
}
