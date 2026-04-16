import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },
    remarks: { type: String },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ attendanceId: 1, studentId: 1 });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
