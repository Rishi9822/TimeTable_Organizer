import Class from "../models/Class.js";
import Institution from "../models/Institution.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";
import { hasReachedClassLimit, getPlanLimits } from "../utils/planLimits.js";

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

    // Check plan limits (only for trial plan, paid plans have no limits)
    const institution = await Institution.findById(req.user.institutionId);
    if (institution && institution.plan === "trial") {
      // Only enforce limits for trial plan
      const currentClassCount = await Class.countDocuments({
        institutionId: req.user.institutionId,
      });

      if (hasReachedClassLimit(institution.plan, currentClassCount)) {
        const limits = getPlanLimits(institution.plan);
        return res.status(403).json({
          message: `You have reached the maximum number of classes (${limits.maxClasses}) for your trial plan. Please upgrade your plan to add more classes.`,
          limitReached: true,
          currentCount: currentClassCount,
          maxAllowed: limits.maxClasses,
          plan: institution.plan,
        });
      }
    }
    // Paid plans (standard/flex) have unlimited classes - no check needed

    // CRITICAL: Force institutionId from authenticated user
    const cls = await Class.create({
      ...req.body,
      institutionId: req.user.institutionId,
    });

    // Audit log: Log AFTER successful creation
    logAuditFromRequest(
      req,
      "CREATE_CLASS",
      "class",
      cls._id,
      { className: cls.name, section: cls.section }
    ).catch(() => {}); // Silently ignore logging errors

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

    // Audit log: Log AFTER successful deletion
    logAuditFromRequest(
      req,
      "DELETE_CLASS",
      "class",
      req.params.id,
      { className: cls.name, section: cls.section }
    ).catch(() => {}); // Silently ignore logging errors

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
