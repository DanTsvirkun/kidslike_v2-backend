import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema({
  uid: mongoose.Types.ObjectId,
});

export default mongoose.model("Session", sessionSchema);
