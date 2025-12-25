import InstitutionSettings from "../models/InstitutionSettings.js";

/**
 * GET /api/institution-settings
 */
export const getInstitutionSettings = async (req, res) => {
  try {
    const settings = await InstitutionSettings.findOne();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/institution-settings (UPSERT)
 */
export const upsertInstitutionSettings = async (req, res) => {
  try {
    const settings = await InstitutionSettings.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
