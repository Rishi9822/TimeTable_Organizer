/**
 * createSuperAdmin.js
 *
 * Run with:  node scripts/createSuperAdmin.js
 *
 * This script uses Mongoose so the pre-save bcrypt hook fires correctly.
 * Edit the SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD constants below,
 * then run the script once.
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";

// ─── EDIT THESE ───────────────────────────────────────────────────────────────
const SUPER_ADMIN_NAME = "Super Admin";
const SUPER_ADMIN_EMAIL = "admin@admin.com";
const SUPER_ADMIN_PASSWORD = "Admin@1234";
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("❌ MONGODB_URI (or MONGO_URI) is not set in .env");
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    // Check if super_admin already exists
    const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL });

    if (existing) {
        // Update the password (pre-save hook will re-hash it)
        existing.password = SUPER_ADMIN_PASSWORD;
        existing.role = "super_admin";
        existing.institutionId = null;
        existing.emailVerified = true;
        existing.isBlocked = false;
        await existing.save();
        console.log(`✅ Super admin password updated for: ${SUPER_ADMIN_EMAIL}`);
    } else {
        // Create fresh
        const user = new User({
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            password: SUPER_ADMIN_PASSWORD,   // pre-save hook hashes this
            role: "super_admin",
            institutionId: null,
            emailVerified: true,
            isBlocked: false,
        });
        await user.save();
        console.log(`✅ Super admin created: ${SUPER_ADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    console.log("✅ Done. You can now log in at /auth with the credentials above.");
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
