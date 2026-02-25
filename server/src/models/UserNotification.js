import mongoose from "mongoose";

/**
 * UserNotification (Inbox)
 * One record per (notification, user) pair.
 * Created via bulk insertMany() when a Notification is sent.
 */
const userNotificationSchema = new mongoose.Schema(
    {
        notificationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Notification",
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        isRead: {
            type: Boolean,
            default: false,
        },

        readAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Required indexes per architecture spec
userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ notificationId: 1 });

export default mongoose.model("UserNotification", userNotificationSchema);
