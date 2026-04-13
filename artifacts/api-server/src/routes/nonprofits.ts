import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Nonprofit, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    establishmentName: r.establishment_name, sector: r.sector,
    licenseNumber: r.license_number, address: r.address,
    website: r.website, contactPhone: r.contact_phone,
    contactEmail: r.contact_email, isDeleted: r.is_deleted,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Nonprofit.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("nonprofit");
    const b = req.body;
    const doc = await Nonprofit.create({
      _id: seq,
      establishment_name: b.establishmentName, sector: b.sector || null,
      license_number: b.licenseNumber || null, address: b.address || null,
      website: b.website || null, contact_phone: b.contactPhone || null,
      contact_email: b.contactEmail || null,
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Nonprofit.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "المنشأة غير موجودة" }); return; }
    res.json(mapRow(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.establishmentName) update.establishment_name = b.establishmentName;
    if (b.sector !== undefined) update.sector = b.sector || null;
    if (b.licenseNumber !== undefined) update.license_number = b.licenseNumber || null;
    if (b.address !== undefined) update.address = b.address || null;
    if (b.website !== undefined) update.website = b.website || null;
    if (b.contactPhone !== undefined) update.contact_phone = b.contactPhone || null;
    if (b.contactEmail !== undefined) update.contact_email = b.contactEmail || null;
    const doc = await Nonprofit.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "المنشأة غير موجودة" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Nonprofit.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "المنشأة غير موجودة" }); return; }
    res.json({ success: true, message: "تم حذف المنشأة" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
