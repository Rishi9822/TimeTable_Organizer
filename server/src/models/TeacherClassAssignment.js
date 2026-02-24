import mongoose from "mongoose";

const schema = new mongoose.Schema({
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Institution",
    required: true,
    index: true,
  },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  periods_per_week: { type: Number, default: 4 },
  // Flex plan: isolates records by mode (school | college)
  modeType: {
    type: String,
    enum: ["school", "college"],
    default: null,
  },
});

schema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("TeacherClassAssignment", schema);
