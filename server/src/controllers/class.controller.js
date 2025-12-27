import Class from "../models/Class.js";

export const getClasses = async (req, res) => {
  try {
    // CRITICAL: Filter by institutionId for multi-tenancy
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access classes",
      });
    }

    const query = {
      institutionId: req.user.institutionId,
    };
    if (req.query.institution_type) {
      query.institution_type = req.query.institution_type;
    }
    const classes = await Class.find(query).sort({ name: 1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createClass = async (req, res) => {
  try {
    // CRITICAL: Ensure user belongs to an institution
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create classes",
      });
    }

    // CRITICAL: Force institutionId from authenticated user
    const cls = await Class.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });
    res.status(201).json(cls);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteClass = async (req, res) => {
  try {
    // CRITICAL: Verify ownership before delete
    const cls = await Class.findOne({
      _id: req.params.id,
      institutionId: req.user.institutionId,
    });

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    await Class.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
