import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
  name: String,
  reward: Number,
  isCompleted: Boolean,
  daysToComplete: Number,
  childId: mongoose.Types.ObjectId,
});

export const TaskModel = mongoose.model("Task", taskSchema);
