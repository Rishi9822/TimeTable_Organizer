import Subject from "../models/Subject.js";
import Institution from "../models/Institution.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

export const getSubjects = async (req, res) => {
  try {
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to access subjects",
      });
    }
    const institution = await Institution.findById(req.user.institutionId);
    const query = { institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      query.modeType = institution.activeMode;
    }
    const subjects = await Subject.find(query).sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createSubject = async (req, res) => {
  try {
    if (!req.user.institutionId) {
      return res.status(403).json({
        message: "You must be part of an institution to create subjects",
      });
    }
    const institution = await Institution.findById(req.user.institutionId);
    const createPayload = { ...req.body, institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      createPayload.modeType = institution.activeMode;
    }
    const subject = await Subject.create(createPayload);

    // Audit log: Log AFTER successful creation
    logAuditFromRequest(
      req,
      "CREATE_SUBJECT",
      "subject",
      subject._id,
      { subjectName: subject.name, subjectCode: subject.code }
    ).catch(() => {}); // Silently ignore logging errors

    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    const ownershipQuery = { _id: req.params.id, institutionId: req.user.institutionId };
    if (institution?.plan === "flex" && institution.activeMode) {
      ownershipQuery.modeType = institution.activeMode;
    }
    const subject = await Subject.findOne(ownershipQuery);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await Subject.findByIdAndDelete(req.params.id);

    // Audit log: Log AFTER successful deletion
    logAuditFromRequest(
      req,
      "DELETE_SUBJECT",
      "subject",
      req.params.id,
      { subjectName: subject.name, subjectCode: subject.code }
    ).catch(() => {}); // Silently ignore logging errors

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
