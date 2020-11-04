import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  username: String,
  children: { type: Array, default: [] },
});

export default mongoose.model("User", userSchema);
