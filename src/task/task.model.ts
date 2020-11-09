import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
  name: String,
  reward: Number,
  isCompleted: { type: String, default: "unknown" },
  daysToComplete: { type: Number, required: false },
  startDate: { type: String, required: false },
  endDate: { type: String, required: false },
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model("Task", taskSchema);
