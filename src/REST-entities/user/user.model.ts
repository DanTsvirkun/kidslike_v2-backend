import mongoose, { Schema } from "mongoose";
import {
  IParent,
  IParentPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import { MongoDBObjectId } from "../../helpers/typescript-helpers/types";

const userSchema = new Schema({
  email: String,
  passwordHash: String,
  username: String,
  children: [{ type: mongoose.Types.ObjectId, ref: "Child" }],
  originUrl: String,
});

export default mongoose.model<IParent | IParentPopulated>("User", userSchema);
