import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    grade: { type: String, default: null },
    section: { type: String, default: null },
    institution_type: {
      type: String,
      enum: ["school", "college"],
      required: true,
    },
    capacity: { type: Number, default: 40 },
  },
  { timestamps: true }
);

classSchema.method("toJSON", function () {
  const { _id, __v, ...obj } = this.toObject();
  obj.id = _id;
  return obj;
});

export default mongoose.model("Class", classSchema);
