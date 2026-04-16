import mongoose from "mongoose";

const homeworkAssignmentSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

homeworkAssignmentSchema.index({ institutionId: 1, classId: 1 });
homeworkAssignmentSchema.index({ teacherId: 1 });

export default mongoose.model("HomeworkAssignment", homeworkAssignmentSchema);
