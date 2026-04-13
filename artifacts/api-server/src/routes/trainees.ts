import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Trainee, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    fullName: r.full_name, email: r.email,
    phoneNumber: r.phone_number, university: r.university,
    major: r.major, trainingType: r.training_type,
    startDate: r.start_date, endDate: r.end_date,
    department: r.department, finalGrade: r.final_grade,
    isDeleted: r.is_deleted, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Trainee.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("trainee");
    const b = req.body;
    const doc = await Trainee.create({
      _id: seq,
      full_name: b.fullName, email: b.email || null,
      phone_number: b.phoneNumber || null, university: b.university || null,
      major: b.major || null, training_type: b.trainingType || null,
      start_date: b.startDate || null, end_date: b.endDate || null,
      department: b.department || null, final_grade: b.finalGrade || null,
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Trainee.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "المتدرب غير موجود" }); return; }
    res.json(mapRow(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.fullName) update.full_name = b.fullName;
    if (b.email !== undefined) update.email = b.email || null;
    if (b.phoneNumber !== undefined) update.phone_number = b.phoneNumber || null;
    if (b.university !== undefined) update.university = b.university || null;
    if (b.major !== undefined) update.major = b.major || null;
    if (b.trainingType !== undefined) update.training_type = b.trainingType || null;
    if (b.startDate !== undefined) update.start_date = b.startDate || null;
    if (b.endDate !== undefined) update.end_date = b.endDate || null;
    if (b.department !== undefined) update.department = b.department || null;
    if (b.finalGrade !== undefined) update.final_grade = b.finalGrade || null;
    const doc = await Trainee.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "المتدرب غير موجود" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Trainee.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "المتدرب غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف المتدرب" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
