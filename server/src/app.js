import express from "express";
import cors from "cors";

import teacherRoutes from "./routes/teacher.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import classRoutes from "./routes/class.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import institutionRoutes from "./routes/institution.routes.js";
import authRoutes from "./routes/authRoutes.js";
import institutionSettingsRoutes from "./routes/institutionSettings.routes.js";
import inviteCodeRoutes from "./routes/inviteCode.routes.js";




const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api", assignmentRoutes);
app.use("/api/institutions", institutionRoutes, inviteCodeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/institution-settings", institutionSettingsRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

export default app;
