import mongoose, { Schema } from "mongoose";

const habitSchema = new Schema({
  name: String,
  rewardPerDay: Number,
  days: [Object],
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model("Habit", habitSchema);
