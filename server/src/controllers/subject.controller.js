import Subject from "../models/Subject.js";

export const getSubjects = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access subjects",
      });
    }

    const subjects = await Subject.find({
      institutionId: req.user.institutionId,
    }).sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createSubject = async (req, res) => {
  try {
    // CRITICAL: Ensure user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create subjects",
      });
    }

    // CRITICAL: Force institutionId from authenticated user
    const subject = await Subject.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before delete
    const subject = await Subject.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
