import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

// const app = express();
// 用import { app } from "./lib/socket.js";取代

const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
// app.use(cors({ origin: "http://localhost:5173", credentials: true }));
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  // "https://<你的firebase專案id>.web.app",
  "https://chat-web-9911f.web.app/",
  // "https://<你的firebase專案id>.firebaseapp.com",
  "https://chat-web-9911f.firebaseapp.com/",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/dist")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//   });
// }

// app.listen(PORT, () => {
//   console.log("server is running on PORT:" + PORT);
//   connectDB();
// });
server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
