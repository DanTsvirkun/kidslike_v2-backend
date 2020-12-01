import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
  name: String,
  reward: Number,
  isCompleted: { type: String, default: "unknown" },
  daysToComplete: Number,
  startDate: String,
  endDate: String,
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model("Task", taskSchema);
