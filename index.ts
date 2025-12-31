import express from "express";
import userRouter from "./controller/user";
import { MONGODB_URI, PORT } from "./utils/config";
import mongoose from "mongoose";
import loginRouter from "./controller/login";
import meRouter from "./controller/me";
import classRouter from "./controller/class";
import studentsRouter from "./controller/students";
import attendanceRouter from "./controller/attendance";
import http from "http";
import dotenv from "dotenv";
import { setupWebSocket } from "./utils/websocket";
dotenv.config();

const app = express();
app.use(express.json());

const server = http.createServer(app);

// Setup WebSocket server with JWT authentication
setupWebSocket(server);

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGODB_URI!)
  .then(() => {
    console.log("connect to mongodb");
  })
  .catch((error) => {
    console.log("error connecting with mongodb: ", error.message);
  });

app.get("/ping", (_req, res) => {
  console.log("someone pinged here");
  res.send("pong");
});

app.use("/auth/signup", userRouter);
app.use("/auth/login", loginRouter);
app.use("/auth/me", meRouter);
app.use("/class", classRouter);
app.use("/students", studentsRouter);
app.use("/attendance", attendanceRouter);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
