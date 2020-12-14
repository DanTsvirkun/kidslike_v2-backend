import mongoose, { Schema } from "mongoose";
import {
  IChild,
  IChildPopulated,
} from "../../helpers/typescript-helpers/interfaces";

const childSchema = new Schema({
  name: String,
  gender: String,
  rewards: Number,
  habits: [{ type: mongoose.Types.ObjectId, ref: "Habit" }],
  tasks: [{ type: mongoose.Types.ObjectId, ref: "Task" }],
  gifts: [{ type: mongoose.Types.ObjectId, ref: "Gift" }],
});

export default mongoose.model<IChild | IChildPopulated>("Child", childSchema);
