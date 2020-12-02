import mongoose, { Schema } from "mongoose";

const habitSchema = new Schema({
  name: String,
  rewardPerDay: Number,
  days: [{ date: { type: String }, isCompleted: { type: String }, _id: false }],
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model("Habit", habitSchema);
