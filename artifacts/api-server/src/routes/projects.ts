import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Project, Company, Service, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

async function buildProjectView(p: any) {
  let companyDisplay: any = null;
  if (p.company_id !== null && p.company_id !== undefined) {
    const numId = Number(p.company_id);
    if (!isNaN(numId) && String(p.company_id) === String(numId)) {
      const company = await Company.findOne({ _id: numId }).lean();
      if (company) {
        companyDisplay = { _id: String(company._id), id: String(company._id), companyName: company.company_name };
      } else {
        companyDisplay = String(p.company_id);
      }
    } else {
      companyDisplay = String(p.company_id);
    }
  }
  const service = p.service_id ? await Service.findOne({ _id: p.service_id }).lean() : null;
  const id = String(p._id);
  return {
    _id: id, id,
    projectName: p.project_name,
    companyId: companyDisplay,
    serviceId: service ? { _id: String(service._id), id: String(service._id), serviceName: service.service_name } : null,
    status: p.status, startDate: p.start_date, endDate: p.end_date,
    isDeleted: p.is_deleted, createdAt: p.created_at, updatedAt: p.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Project.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    const result = await Promise.all(rows.map(buildProjectView));
    res.json(result);
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("project");
    const b = req.body;
    const doc = await Project.create({
      _id: seq,
      project_name: b.projectName,
      company_id: b.companyId || null,
      service_id: b.serviceId ? Number(b.serviceId) : null,
      status: b.status || "active",
      start_date: b.startDate || null, end_date: b.endDate || null,
    });
    const view = await buildProjectView(doc.toObject());
    res.status(201).json({ success: true, data: view });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "المشروع غير موجود" }); return; }
    res.json(await buildProjectView(doc));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.projectName) update.project_name = b.projectName;
    if (b.companyId !== undefined) update.company_id = b.companyId || null;
    if (b.serviceId !== undefined) update.service_id = b.serviceId ? Number(b.serviceId) : null;
    if (b.status) update.status = b.status;
    if (b.startDate !== undefined) update.start_date = b.startDate || null;
    if (b.endDate !== undefined) update.end_date = b.endDate || null;
    const doc = await Project.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "المشروع غير موجود" }); return; }
    res.json({ success: true, data: await buildProjectView(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Project.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "المشروع غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف المشروع" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
