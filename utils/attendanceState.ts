import { Class } from "../model/class";
import { Attendance } from "../model/attendance";

interface AttendanceRecord {
  [studentId: string]: "present" | "absent";
}

interface ActiveSession {
  classId: string;
  startedAt: string;
  attendance: AttendanceRecord;
}

let activeSession: ActiveSession | null = null;

export const startSession = (classId: string): ActiveSession => {
  activeSession = {
    classId,
    startedAt: new Date().toISOString(),
    attendance: {},
  };
  return activeSession;
};

export const getActiveSession = (): ActiveSession | null => {
  return activeSession;
};

export const markAttendance = (
  studentId: string,
  status: "present" | "absent",
): void => {
  if (!activeSession) {
    throw new Error("No active session");
  }
  activeSession.attendance[studentId] = status;
};

export const totalStudents = async (classId: string) => {
  const cls = await Class.findById(classId);
  return cls?.studentIds.length;
};

export const endSession = (): ActiveSession | null => {
  const session = activeSession;
  activeSession = null;
  return session;
};

export const hasActiveSession = (): boolean => {
  return activeSession !== null;
};

export const getTodaySummary = () => {
  if (!activeSession) {
    throw new Error("No active session");
  }

  const attendanceRecords = Object.values(activeSession.attendance);
  const present = attendanceRecords.filter(
    (status) => status === "present",
  ).length;
  const absent = attendanceRecords.filter(
    (status) => status === "absent",
  ).length;
  const total = attendanceRecords.length;

  return { present, absent, total };
};

export const checkAttendace = (
  studentId: string,
): "present" | "absent" | "not yet updated" => {
  if (!activeSession) {
    throw new Error("No active session");
  }
  const status = activeSession.attendance[studentId];
  return status || "not yet updated";
};

export const classDone = async () => {
  if (!activeSession) {
    throw new Error("No active session");
  }

  const cls = await Class.findById(activeSession.classId);
  if (!cls) {
    throw new Error("Class not found");
  }

  const allStudentIds = cls.studentIds.map((id) => id.toString());
  for (const studentId of allStudentIds) {
    if (!activeSession.attendance[studentId]) {
      activeSession.attendance[studentId] = "absent";
    }
  }

  const attendanceRecords = Object.entries(activeSession.attendance).map(
    ([studentId, status]) => ({
      classId: activeSession!.classId,
      studentId,
      status,
    }),
  );
  await Attendance.insertMany(attendanceRecords);

  const present = attendanceRecords.filter((r) => r.status === "present").length;
  const absent = attendanceRecords.filter((r) => r.status === "absent").length;
  const total = attendanceRecords.length;

  activeSession = null;

  return {
    message: "Attendance persisted",
    present,
    absent,
    total,
  };
};
