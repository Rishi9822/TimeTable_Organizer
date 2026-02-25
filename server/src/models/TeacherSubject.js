import mongoose from "mongoose";


const teacherSubjectSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    // Flex plan: isolates records by mode (school | college)
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for mode-aware filtering
teacherSubjectSchema.index({ institutionId: 1, modeType: 1 });

export default mongoose.model("TeacherSubject", teacherSubjectSchema);
