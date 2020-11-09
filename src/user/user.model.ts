import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: String,
  passwordHash: { type: String, required: false },
  username: String,
  children: [{ type: mongoose.Types.ObjectId, ref: "Child" }],
});

export default mongoose.model("User", userSchema);
