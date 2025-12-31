import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage, Server } from "http";
import jwt from "jsonwebtoken";
import { SECRET } from "./config";
import { User } from "../model/user";
import {
  markAttendance,
  hasActiveSession,
  getTodaySummary,
  checkAttendace,
  classDone,
} from "./attendanceState";

interface AuthenticatedWebSocket extends WebSocket {
  user?: {
    userId: string;
    role: string;
  };
}

type DecodedToken = {
  id: string;
  email: string;
};

type Attendance = {
  studentId: string;
  status: "present" | "absent";
};

type TodaySummary = {
  present: number;
  absent: number;
  total: number;
};

type WebSocketMessage = {
  event: string;
  data?: Attendance | TodaySummary;
};

const getTokenFromUrl = (req: IncomingMessage): string | null => {
  const url = req.url;
  if (!url) return null;
  const urlParams = new URLSearchParams(url.split("?")[1]);
  return urlParams.get("token");
};

const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, SECRET!) as DecodedToken;
    if (!decoded.id) {
      return null;
    }
    const user = await User.findById(decoded.id);
    if (!user || !user.role) {
      return null;
    }
    return {
      userId: user._id,
      role: user.role as string,
      name: user.name as string,
    };
  } catch (error) {
    console.error("Token verification failded", error);
    return null;
  }
};

export const setupWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", async (req, socket, head) => {
    const pathname = req.url?.split("?")[0];
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const token = getTokenFromUrl(req);
    if (!token) {
      socket.write("401 Unauthorized");
      socket.destroy();
      return;
    }
    const userInfo = await verifyToken(token!);
    if (!userInfo) {
      socket.write("Unauthorized");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      authWs.user = {
        userId: userInfo.userId.toString(),
        role: userInfo.role,
      };
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    const authWs = ws as AuthenticatedWebSocket;
    ws.send(
      JSON.stringify({
        event: "CONNECTION",
        data: {
          userId: authWs.user?.userId,
          role: authWs.user?.role,
        },
      }),
    );
    ws.on("message", (rawMessage: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(rawMessage.toString());
        switch (message.event) {
          case "ATTENDANCE_MARKED":
            handleAttendanceMarked(authWs, message.data as Attendance, wss);
            break;

          case "TODAY_SUMMARY":
            handleTodaySummary(authWs, wss);
            break;

          case "MY_ATTENDANCE":
            handleMyAttendance(authWs, wss);
            break;

          case "DONE":
            handleDoneEvent(authWs, wss);
            break;

          default:
            ws.send(
              JSON.stringify({
                event: "ERROR",
                data: { message: `Unknown event: ${message.event}` },
              }),
            );
            break;
        }
      } catch {
        ws.send(
          JSON.stringify({
            event: "ERROR",
            data: { message: "Invalid message format" },
          }),
        );
      }
    });
  });
};

const broadcast = (wss: WebSocketServer, event: string, data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  });
};

const handleDoneEvent = async(ws: AuthenticatedWebSocket, wss: WebSocketServer) => {
  if (ws.user?.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Forbidden, teachers event only" },
      }),
    );
    return
  }
  if (!hasActiveSession()) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active class session" },
      }),
    );
    return
  }
  try {
    const done = await classDone()
    broadcast(wss, "DONE", done)
  } catch (error: any) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: `${error.message}` },
      }),
    );
  }
};

const handleMyAttendance = (
  ws: AuthenticatedWebSocket,
  wss: WebSocketServer,
) => {
  if (ws.user?.role !== "student") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Only students can check attendance" },
      }),
    );
    return;
  }

  if (!hasActiveSession()) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active class session" },
      }),
    );
    return;
  }

  try {
    const status = checkAttendace(ws.user.userId);
    broadcast(wss, "MY_ATTENDANCE", status);
  } catch (error) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Failed to check attendance" },
      }),
    );
  }
};

const handleTodaySummary = (
  ws: AuthenticatedWebSocket,
  wss: WebSocketServer,
) => {
  if (ws.user?.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Only teachers can request summary" },
      }),
    );
    return;
  }

  if (!hasActiveSession()) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active class session" },
      }),
    );
    return;
  }

  try {
    const summary = getTodaySummary();
    broadcast(wss, "TODAY_SUMMARY", summary);
  } catch (error) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Failed to get summary" },
      }),
    );
  }
};

const handleAttendanceMarked = (
  ws: AuthenticatedWebSocket,
  data: Attendance,
  wss: WebSocketServer,
) => {
  if (ws.user?.role !== "teacher") {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Only teachers can mark Attendance" },
      }),
    );
    return;
  }
  if (!hasActiveSession()) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "No active class session" },
      }),
    );
    return;
  }
  const { studentId, status } = data;
  if (!studentId || !status || (status !== "present" && status !== "absent")) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: {
          message: "Missing or invalid studentId or status",
        },
      }),
    );
    return;
  }
  try {
    markAttendance(studentId, status);
    broadcast(wss, "ATTENDANCE_MARKED", {
      studentId,
      status,
    });
  } catch (error) {
    ws.send(
      JSON.stringify({
        event: "ERROR",
        data: { message: "Failded to mark attendance" },
      }),
    );
  }
};
