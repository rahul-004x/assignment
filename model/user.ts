import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  passwordHash: String,
  role: {
    type: String,
    enum: ["teacher", "student"],
  },
});

export const User = mongoose.model("User", userSchema);
