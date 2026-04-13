import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Consultant, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    consultantId: r.consultant_id, fullName: r.full_name,
    nationalId: r.national_id, email: r.email,
    phoneNumber: r.phone_number, specialty: r.specialty,
    academicRank: r.academic_rank, consultingField: r.consulting_field,
    availability: r.availability, isDeleted: r.is_deleted,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Consultant.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("consultant");
    const b = req.body;
    const doc = await Consultant.create({
      _id: seq,
      consultant_id: `CON-${String(seq).padStart(4, "0")}`,
      full_name: b.fullName, national_id: b.nationalId || null,
      email: b.email || null, phone_number: b.phoneNumber || null,
      specialty: b.specialty || null, academic_rank: b.academicRank || null,
      consulting_field: b.consultingField || null,
      availability: b.availability || "available",
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Consultant.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "المستشار غير موجود" }); return; }
    res.json(mapRow(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.fullName) update.full_name = b.fullName;
    if (b.nationalId !== undefined) update.national_id = b.nationalId || null;
    if (b.email !== undefined) update.email = b.email || null;
    if (b.phoneNumber !== undefined) update.phone_number = b.phoneNumber || null;
    if (b.specialty !== undefined) update.specialty = b.specialty || null;
    if (b.academicRank !== undefined) update.academic_rank = b.academicRank || null;
    if (b.consultingField !== undefined) update.consulting_field = b.consultingField || null;
    if (b.availability) update.availability = b.availability;
    const doc = await Consultant.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "المستشار غير موجود" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Consultant.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "المستشار غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف المستشار" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
