import mongoose, { Schema } from "mongoose";
import { IGift } from "../../helpers/typescript-helpers/interfaces";

const giftSchema = new Schema({
  name: String,
  price: Number,
  imageUrl: String,
  isPurchased: Boolean,
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model<IGift>("Gift", giftSchema);
