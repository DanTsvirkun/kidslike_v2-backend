import mongoose, { Schema } from "mongoose";
import { ISession } from "../../helpers/typescript-helpers/interfaces";

const sessionSchema = new Schema({
  uid: mongoose.Types.ObjectId,
});

export default mongoose.model<ISession>("Session", sessionSchema);
