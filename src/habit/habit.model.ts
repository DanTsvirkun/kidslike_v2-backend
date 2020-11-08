import mongoose, { Schema } from "mongoose";

const habitSchema = new Schema({
  name: String,
  rewardPerDay: Number,
  days: Array,
  childId: mongoose.Types.ObjectId,
});

export const HabitModel = mongoose.model("Habit", habitSchema);
