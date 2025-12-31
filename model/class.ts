import mongoose from "mongoose";
import { User } from "./user";

const classSchema = new mongoose.Schema({
  className: String,
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        const user = await User.findById(v);
        return user?.role === "teacher";
      },
      message: "teacherId must reference a user with role 'teacher'",
    },
  },
  studentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      optional: true,
      ref: "User",
      validate: {
        validator: async function(v: mongoose.Types.ObjectId) {
          const user = await User.findById(v);
          return user?.role === "student";
        },
        message: "studentIds must only reference users with role 'student'",
      },
    },
  ],
});

export const Class = mongoose.model("Class", classSchema);
