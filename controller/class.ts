import express from "express";
import { userExtractor } from "../utils/middleware";
import { z } from "zod";
import { Class } from "../model/class";
import mongoose from "mongoose";
import { Attendance } from "../model/attendance";
import { getActiveSession } from "../utils/attendanceState";

const classSchema = z.object({
  className: z.string(),
});

const studentSchema = z.object({
  studentId: z.string(),
});

const classRouter = express.Router();

classRouter.post("/", userExtractor, async (req, res) => {
  try {
    const validatedData = classSchema.parse(req.body);
    const { className } = validatedData;
    const user = req.user;
    if (user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        error: "Only teachers create can create classes",
      });
    }
    const newClass = new Class({
      className,
      teacherId: user.id,
      studentIds: [],
    });
    await newClass.save();

    return res.status(201).json({
      success: true,
      data: {
        _id: newClass._id,
        className: newClass.className,
        teacherId: newClass.teacherId,
        studentIds: newClass.studentIds,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid requested schema",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

classRouter.get("/:id", async (req, res) => {
  const classDoc = await Class.findById(req.params.id).populate("studentIds");
  if (!classDoc) {
    return res.status(404).json({
      success: false,
      error: "Invalid class",
    });
  }
  return res.json({
    success: true,
    data: {
      _id: classDoc.id,
      className: classDoc.className,
      teacherId: classDoc.teacherId,
      students: classDoc.studentIds.map((student: any) => ({
        id: student._id,
        name: student.name,
        email: student.email,
      })),
    },
  });
});

classRouter.post("/:id/add-student", userExtractor, async (req, res) => {
  try {
    const validatedData = studentSchema.parse(req.body);
    const { studentId } = validatedData;
    const user = req.user;
    const classDoc = await Class.findById(req.params.id);

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    if (
      user.role !== "teacher" &&
      classDoc?.teacherId?.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: "Only class techer can add students",
      });
    }

    if (classDoc.studentIds.includes(new mongoose.Types.ObjectId(studentId))) {
      return res.status(400).json({
        success: false,
        error: "Student already in class",
      });
    }

    classDoc.studentIds.push(new mongoose.Types.ObjectId(studentId));
    await classDoc.save();

    return res.status(201).json({
      success: true,
      data: {
        _id: classDoc?._id,
        className: classDoc?.className,
        teacherId: user._id,
        studentIds: classDoc?.studentIds,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request schema",
      });
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

classRouter.get("/:id/my-attendance", userExtractor, async (req, res) => {
  try {
    const user = req.user;
    const classId = req.params.id;

    if (user.role !== "student") {
      return res.status(403).json({
        success: false,
        error: "Only students can check their attendance",
      });
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: "Class not found",
      });
    }

    if (!classDoc.studentIds.includes(user._id)) {
      return res.status(403).json({
        success: false,
        error: "Only enrolled students can check attendance",
      });
    }

    const persistedAttendance = await Attendance.findOne({
      classId: new mongoose.Types.ObjectId(classId),
      studentId: user._id,
    });

    if (persistedAttendance) {
      return res.status(200).json({
        success: true,
        data: {
          classId,
          status: persistedAttendance.status,
        },
      });
    }

    const activeSession = getActiveSession();
    if (activeSession && activeSession.classId === classId) {
      const status = activeSession.attendance[user._id.toString()] || null;
      return res.status(200).json({
        success: true,
        data: {
          classId,
          status,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        classId,
        status: null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default classRouter;
