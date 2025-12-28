import Teacher from "../models/Teacher.js";

export const getTeachers = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access teachers",
      });
    }

    const teachers = await Teacher.find({
      institutionId: req.user.institutionId,
    }).sort({ name: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createTeacher = async (req, res) => {
  try {
    // CRITICAL: Ensure user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create teachers",
      });
    }

    // CRITICAL: Force institutionId from authenticated user
    const teacher = await Teacher.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before update
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // CRITICAL: Prevent institutionId change
    const updateData = { ...req.body };
    delete updateData.institutionId;

    const updated = await Teacher.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before delete
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
