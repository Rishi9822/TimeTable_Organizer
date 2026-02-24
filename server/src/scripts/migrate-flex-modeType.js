/**
 * One-off migration: set modeType on existing Flex plan data
 *
 * For each Flex institution, sets modeType = institution.activeMode (or first completedMode,
 * or settings.institution_type) on all Teachers, Subjects, Classes, TeacherSubjects,
 * TeacherClassAssignments, Timetables, and Assignments that have modeType == null.
 *
 * Run from server directory:
 *   node src/scripts/migrate-flex-modeType.js
 *
 * Requires MONGO_URI in env (e.g. from .env via dotenv).
 */
import "dotenv/config";
import mongoose from "mongoose";
import Institution from "../models/Institution.js";
import InstitutionSettings from "../models/InstitutionSettings.js";
import Teacher from "../models/Teacher.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import TeacherSubject from "../models/TeacherSubject.js";
import TeacherClassAssignment from "../models/TeacherClassAssignment.js";
import Timetable from "../models/Timetable.js";
import Assignment from "../models/Assignment.js";

const assignMode = process.argv.includes("--dry-run") ? " (dry run)" : "";

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required. Set it in .env or the environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected.\n");

  const flexInstitutions = await Institution.find({ plan: "flex" }).lean();
  if (flexInstitutions.length === 0) {
    console.log("No Flex institutions found. Nothing to migrate.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${flexInstitutions.length} Flex institution(s).\n`);

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("DRY RUN – no writes will be performed.\n");
  }

  for (const inst of flexInstitutions) {
    const mode =
      inst.activeMode ||
      (inst.completedModes && inst.completedModes[0]) ||
      null;

    if (!mode || !["school", "college"].includes(mode)) {
      const settings = await InstitutionSettings.findOne({
        institutionId: inst._id,
      }).lean();
      const fallback = settings?.institution_type || null;
      if (fallback && ["school", "college"].includes(fallback)) {
        console.log(
          `Institution ${inst._id} (${inst.name}): using institution_type "${fallback}" as mode (activeMode/completedModes missing).`
        );
        await updateCollections(inst._id, fallback, dryRun);
      } else {
        console.log(
          `Institution ${inst._id} (${inst.name}): skipped – could not determine mode (activeMode/completedModes/institution_type).`
        );
      }
      continue;
    }

    console.log(`Institution ${inst._id} (${inst.name}): mode = ${mode}${assignMode}`);
    await updateCollections(inst._id, mode, dryRun);
  }

  console.log("\nMigration finished.");
  await mongoose.disconnect();
  process.exit(0);
}

async function updateCollections(institutionId, mode, dryRun) {
  const filter = { institutionId, $or: [{ modeType: null }, { modeType: { $exists: false } }] };
  const set = { $set: { modeType: mode } };

  const collections = [
    [Teacher, "Teacher"],
    [Subject, "Subject"],
    [Class, "Class"],
    [TeacherSubject, "TeacherSubject"],
    [TeacherClassAssignment, "TeacherClassAssignment"],
    [Timetable, "Timetable"],
    [Assignment, "Assignment"],
  ];

  for (const [Model, name] of collections) {
    const count = await Model.countDocuments(filter);
    if (count === 0) continue;
    console.log(`  ${name}: ${count} document(s) to set modeType = "${mode}"`);
    if (!dryRun) {
      const result = await Model.updateMany(filter, set);
      console.log(`  ${name}: updated ${result.modifiedCount}`);
    }
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
