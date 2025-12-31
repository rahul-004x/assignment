import mongoose from "mongoose";
import { User } from "./user";

const attendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        const user = await User.findById(v);
        return user?.role === "student";
      },
    },
  },
  status: {
    type: String,
    enum: ["present", "absent"],
  },
});

export const Attendance = mongoose.model("Attendance", attendanceSchema);

