import mongoose, { Schema } from "mongoose";

const giftSchema = new Schema({
  name: String,
  reward: Number,
  isCompleted: Boolean,
  daysToComplete: Number,
  childId: mongoose.Types.ObjectId,
});

export const GiftModel = mongoose.model("Gift", giftSchema);
