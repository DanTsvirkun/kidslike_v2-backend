import mongoose, { Schema } from "mongoose";
import { IHabit } from "../../helpers/typescript-helpers/interfaces";

const habitSchema = new Schema({
  name: String,
  rewardPerDay: Number,
  days: [{ date: String, isCompleted: String, _id: false }],
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model<IHabit>("Habit", habitSchema);
