import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";

/**
 * GET /api/teacher-subjects
 */
export const getTeacherSubjects = async (req, res) => {
  try {
    const data = await TeacherSubject.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/teacher-subjects
 */
export const assignTeacherSubject = async (req, res) => {
  const { teacherId, subjectId } = req.body;

  if (!teacherId || !subjectId) {
    return res.status(400).json({
      message: "teacherId and subjectId are required",
    });
  }

  const exists = await TeacherSubject.findOne({ teacherId, subjectId });
  if (exists) {
    return res.status(409).json({ message: "Already assigned" });
  }

  const assignment = await TeacherSubject.create({
    teacherId,
    subjectId,
  });

  res.status(201).json(assignment);
};



/**
 * DELETE /api/teacher-subjects
 */
export const removeTeacherSubject = async (req, res) => {
  const { teacherId, subjectId } = req.params;

  if (!teacherId || !subjectId) {
    return res.status(400).json({ message: "Missing IDs" });
  }
await TeacherSubject.findOneAndDelete({
  teacherId,
  subjectId,
});


  res.json({ message: "Subject removed from teacher" });
};



/**
 * GET /api/teacher-class-assignments
 */
export const getTeacherClassAssignments = async (req, res) => {
  try {
    const data = await TeacherClassAssignment.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/teacher-class-assignments
 */
export const assignTeacherClass = async (req, res) => {
  try {
    const record = await TeacherClassAssignment.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * DELETE /api/teacher-class-assignments/:id
 */
export const removeTeacherClassAssignment = async (req, res) => {
  try {
    await TeacherClassAssignment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
