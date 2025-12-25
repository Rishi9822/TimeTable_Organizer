import mongoose from "mongoose";

const schema = new mongoose.Schema({
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  periods_per_week: { type: Number, default: 4 },
});

schema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("TeacherClassAssignment", schema);
