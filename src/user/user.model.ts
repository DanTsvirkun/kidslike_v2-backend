import mongoose, { Schema } from "mongoose";

const childSchema = new Schema({
  name: String,
  gender: String,
  rewards: {type: Number, default: 0},
  habits: { type: Array, default: [] },
  tasks: { type: Array, default: [] },
  gifts: { type: Array, default: [] }
})

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  username: String,
  children: [childSchema],
});

export default mongoose.model("User", userSchema);
