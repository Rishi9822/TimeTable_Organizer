import InviteCode from "../models/InviteCode.js";

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

    res.status(201).json(invite);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
