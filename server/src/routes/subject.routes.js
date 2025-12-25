import express from "express";
import {
  getSubjects,
  createSubject,
  deleteSubject,
} from "../controllers/subject.controller.js";

const router = express.Router();

router.get("/", getSubjects);
router.post("/", createSubject);
router.delete("/:id", deleteSubject);

export default router;
