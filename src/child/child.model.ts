import mongoose, { Schema } from "mongoose";

const childSchema = new Schema({
  name: String,
  gender: String,
  rewards: { type: Number, default: 0 },
  habits: [{ type: mongoose.Types.ObjectId, ref: "Habit" }],
  tasks: [{ type: mongoose.Types.ObjectId, ref: "Task" }],
  gifts: [{ type: mongoose.Types.ObjectId, ref: "Gift" }],
});

export default mongoose.model("Child", childSchema);
