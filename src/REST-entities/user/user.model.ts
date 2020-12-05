import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  username: String,
  children: [{ type: mongoose.Types.ObjectId, ref: "Child" }],
  originUrl: String,
});

export default mongoose.model("User", userSchema);
