import mongoose, { Schema } from "mongoose";

const giftSchema = new Schema({
  name: String,
  price: Number,
  imageUrl: String,
  isPurchased: { type: Boolean, default: false },
  childId: mongoose.Types.ObjectId,
});

export default mongoose.model("Gift", giftSchema);
