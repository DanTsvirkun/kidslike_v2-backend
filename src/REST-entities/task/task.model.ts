import mongoose, { Schema } from "mongoose";
import { ITask } from "../../helpers/typescript-helpers/interfaces";

const taskSchema = new Schema({
  name: String,
  reward: Number,
  isCompleted: { type: String, default: "unknown" },
  daysToComplete: Number,
  startDate: String,
  endDate: String,
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model<ITask>("Task", taskSchema);
