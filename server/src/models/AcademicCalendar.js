import mongoose from "mongoose";

const academicCalendarSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    eventType: {
      type: String,
      enum: ["holiday", "exam", "term_start", "term_end", "event"],
      default: "holiday",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    blocksTimetable: { type: Boolean, default: true },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    modeType: {
      type: String,
      enum: ["school", "college"],
      default: null,
    },
  },
  { timestamps: true }
);

academicCalendarSchema.index({ institutionId: 1, startDate: 1 });

export default mongoose.model("AcademicCalendar", academicCalendarSchema);
