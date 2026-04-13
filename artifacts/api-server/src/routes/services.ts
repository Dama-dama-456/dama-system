import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Service, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    serviceName: r.service_name, serviceCategory: r.service_category,
    description: r.description, basePrice: r.base_price != null ? Number(r.base_price) : null,
    isActive: r.is_active, isDeleted: r.is_deleted,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Service.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("service");
    const b = req.body;
    const doc = await Service.create({
      _id: seq,
      service_name: b.serviceName, service_category: b.serviceCategory || null,
      description: b.description || null, base_price: b.basePrice ?? null,
      is_active: b.isActive !== false,
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Service.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "الخدمة غير موجودة" }); return; }
    res.json(mapRow(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.serviceName) update.service_name = b.serviceName;
    if (b.serviceCategory !== undefined) update.service_category = b.serviceCategory || null;
    if (b.description !== undefined) update.description = b.description || null;
    if (b.basePrice !== undefined) update.base_price = b.basePrice ?? null;
    if (b.isActive !== undefined) update.is_active = b.isActive;
    const doc = await Service.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "الخدمة غير موجودة" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Service.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "الخدمة غير موجودة" }); return; }
    res.json({ success: true, message: "تم حذف الخدمة" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
