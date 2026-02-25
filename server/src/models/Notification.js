import mongoose from "mongoose";

/**
 * Notification (Master)
 * One document per broadcast event.
 * Fans out into UserNotification (inbox) records.
 */
const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        message: {
            type: String,
            required: true,
        },

        channel: {
            type: String,
            enum: ["in_app", "email", "both"],
            default: "in_app",
        },

        // Who the notification was sent to
        audienceType: {
            type: String,
            enum: ["all_users", "all_tenants", "institution", "user"],
            required: true,
        },

        // For 'institution' and 'user' audience types
        audienceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

        // Super admin who sent the notification
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Lovable Alignment: Track volume of broadcast for history
        recipientCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
