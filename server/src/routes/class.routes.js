import express from "express";
import {
  getClasses,
  createClass,
  deleteClass,
} from "../controllers/class.controller.js";

const router = express.Router();

router.get("/", getClasses);
router.post("/", createClass);
router.delete("/:id", deleteClass);

export default router;
