import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { NonprofitCompany, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    companyName: r.company_name, crNumber: r.cr_number,
    industry: r.industry, companySize: r.company_size,
    contractStatus: r.contract_status, address: r.address,
    contactPhone: r.contact_phone, contactEmail: r.contact_email,
    isDeleted: r.is_deleted, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await NonprofitCompany.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("nonprofit_company");
    const b = req.body;
    const doc = await NonprofitCompany.create({
      _id: seq,
      company_name: b.companyName, cr_number: b.crNumber || null,
      industry: b.industry || null, company_size: b.companySize || null,
      contract_status: b.contractStatus || null, address: b.address || null,
      contact_phone: b.contactPhone || null, contact_email: b.contactEmail || null,
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await NonprofitCompany.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "الشركة غير موجودة" }); return; }
    res.json(mapRow(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.companyName) update.company_name = b.companyName;
    if (b.crNumber !== undefined) update.cr_number = b.crNumber || null;
    if (b.industry !== undefined) update.industry = b.industry || null;
    if (b.companySize !== undefined) update.company_size = b.companySize || null;
    if (b.contractStatus !== undefined) update.contract_status = b.contractStatus || null;
    if (b.address !== undefined) update.address = b.address || null;
    if (b.contactPhone !== undefined) update.contact_phone = b.contactPhone || null;
    if (b.contactEmail !== undefined) update.contact_email = b.contactEmail || null;
    const doc = await NonprofitCompany.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "الشركة غير موجودة" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await NonprofitCompany.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "الشركة غير موجودة" }); return; }
    res.json({ success: true, message: "تم حذف الشركة" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;