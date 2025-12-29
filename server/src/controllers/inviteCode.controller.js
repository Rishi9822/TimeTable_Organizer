import InviteCode from "../models/InviteCode.js";
import { logAuditFromRequest } from "../utils/auditLogger.js";

/* GET codes for institution */
export const getInviteCodes = async (req, res) => {
  try {
    const { institutionId } = req.params;

    // Ensure admin can only view codes for their own institution
    if (req.user.institutionId?.toString() !== institutionId?.toString()) {
      return res.status(403).json({
        message: "You can only view invite codes for your own institution",
      });
    }

    const codes = await InviteCode.find({ institutionId }).sort({
      createdAt: -1,
    });
    res.json(codes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* CREATE code */
export const createInviteCode = async (req, res) => {
  try {
    const { institutionId, maxUses } = req.body;

    // Ensure admin can only create codes for their own institution
    if (req.user.institutionId?.toString() !== institutionId?.toString()) {
      return res.status(403).json({
        message: "You can only create invite codes for your own institution",
      });
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const invite = await InviteCode.create({
      institutionId: req.user.institutionId,
      code,
      createdBy: req.user._id,
      maxUses: maxUses || null,
    });

    // Audit log: Log AFTER successful creation
    logAuditFromRequest(
      req,
      "CREATE_INVITE_CODE",
      "invite_code",
      invite._id,
      { code: invite.code, maxUses: invite.maxUses }
    ).catch(() => {}); // Silently ignore logging errors

    res.status(201).json(invite);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* DELETE code */
export const deleteInviteCode = async (req, res) => {
  try {
    const { id } = req.params;

    // CRITICAL: Verify ownership before delete - ensure invite code belongs to admin's institution
    const inviteCode = await InviteCode.findOne({
      _id: id,
      institutionId: req.user.institutionId,
    });

    if (!inviteCode) {
      return res.status(404).json({
        message: "Invite code not found or you don't have permission to delete it",
      });
    }

    // Delete by _id AND institutionId for multi-tenant safety
    await InviteCode.findOneAndDelete({
      _id: id,
      institutionId: req.user.institutionId,
    });

    // Audit log: Log AFTER successful deletion
    logAuditFromRequest(
      req,
      "DELETE_INVITE_CODE",
      "invite_code",
      id,
      { code: inviteCode.code }
    ).catch(() => {}); // Silently ignore logging errors

    res.json({ success: true, message: "Invite code deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
