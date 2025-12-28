import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
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
      index: true,
    },
    academicYear: {
      type: String,
      default: () => {
        const now = new Date();
        const year = now.getFullYear();
        return `${year}-${year + 1}`;
      },
    },
    weekStructure: {
      type: String,
      enum: ["Mon-Fri", "Mon-Sat"],
      default: "Mon-Fri",
    },
    // Periods structure: { Monday: [{ period, subjectId, teacherId }], Tuesday: [...], ... }
    periods: {
      type: Map,
      of: [
        {
          period: { type: Number, required: true },
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
        },
      ],
      default: () => new Map(),
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: one active timetable per class per academic year
timetableSchema.index({ classId: 1, academicYear: 1, isPublished: 1 });

// Ensure one draft per class per academic year
timetableSchema.index(
  { classId: 1, academicYear: 1, isPublished: 1 },
  {
    unique: true,
    partialFilterExpression: { isPublished: false },
  }
);

timetableSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  // Convert Map to object for JSON serialization
  if (obj.periods instanceof Map) {
    obj.periods = Object.fromEntries(obj.periods);
  }
  return obj;
});

export default mongoose.model("Timetable", timetableSchema);

