import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema({
  uid: { type: mongoose.Types.ObjectId, required: true },
});

export default mongoose.model("Session", sessionSchema);
