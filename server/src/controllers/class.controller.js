import Class from "../models/Class.js";

export const getClasses = async (req, res) => {
  try {
    const query = {};
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
    const cls = await Class.create(req.body);
    res.status(201).json(cls);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteClass = async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
