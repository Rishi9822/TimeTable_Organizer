/**
 * diagnoseSuperAdmin.js
 * Run: node scripts/diagnoseSuperAdmin.js
 *
 * Checks what super_admin users exist and whether bcrypt can verify the password.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

// ── Change this to the password you tried logging in with ──────────────────
const TEST_PASSWORD = "YourSecurePass123!";
// ──────────────────────────────────────────────────────────────────────────

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

await mongoose.connect(mongoUri);
console.log("✅ MongoDB connected\n");

// Find ALL super_admin users
const admins = await User.find({ role: "super_admin" }).select("+password");

if (admins.length === 0) {
    console.log("❌ No super_admin users found in the database at all.");
    console.log("   Run:  node scripts/createSuperAdmin.js  to create one first.");
} else {
    console.log(`Found ${admins.length} super_admin user(s):\n`);
    for (const admin of admins) {
        console.log(`  📧 Email        : ${admin.email}`);
        console.log(`  👤 Name         : ${admin.name}`);
        console.log(`  🔑 Password hash: ${admin.password}`);
        console.log(`  ✅ emailVerified: ${admin.emailVerified}`);
        console.log(`  🚫 isBlocked    : ${admin.isBlocked}`);

        const isMatch = await bcrypt.compare(TEST_PASSWORD, admin.password);
        if (isMatch) {
            console.log(`  🟢 bcrypt.compare("${TEST_PASSWORD}") => PASS — login will work\n`);
        } else {
            console.log(`  🔴 bcrypt.compare("${TEST_PASSWORD}") => FAIL — password hash mismatch!`);
            console.log(`     The stored hash does NOT match "${TEST_PASSWORD}"\n`);
        }
    }
}

await mongoose.disconnect();
