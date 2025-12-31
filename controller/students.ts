import express from "express";
import { userExtractor } from "../utils/middleware";
import { User } from "../model/user";

const studentsRouter = express.Router();

studentsRouter.get("/", userExtractor, async (req, res) => {
  const user = req.user;
  if (user.role !== "teacher") {
    return res.status(401).json({
      success: false,
      error: "Only teacher can see students record",
    });
  }
  const students = await User.find({ role: "student" });
  return res.json({
    success: true,
    data: students.map((student) => ({
      id: student._id,
      name: student.name,
      email: student.email
    }))
  })
});

export default studentsRouter
