import express from "express";
import { userExtractor } from "../utils/middleware";
import z from "zod";
import { startSession, hasActiveSession } from "../utils/attendanceState";
import { Class } from "../model/class";

const startSchema = z.object({
  classId: z.string(),
});

const attendanceRouter = express.Router();

attendanceRouter.post("/start", userExtractor, async (req, res) => {
  const user = req.user;
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body. classId is required",
    });
  }
  const { classId } = result.data;

  if (user.role !== "teacher") {
    return res.status(403).json({
      success: false,
      error: "Only teacher can start a class",
    });
  }

  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    return res.status(404).json({
      success: false,
      error: "Class not found",
    });
  }

  if (
    !classDoc.teacherId ||
    classDoc.teacherId.toString() !== user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      error: "You don't own this class",
    });
  }

  if (hasActiveSession()) {
    return res.status(400).json({
      success: false,
      error: "An attendance session is already active",
    });
  }

  const session = startSession(classId);

  return res.status(200).json({
    success: true,
    data: {
      classId: session.classId,
      startedAt: session.startedAt,
    },
  });
});

export default attendanceRouter;
