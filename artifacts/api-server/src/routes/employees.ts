import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Employee, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    employeeId: r.employee_id, fullName: r.full_name,
    nationalId: r.national_id, email: r.email,
    phoneNumber: r.phone_number, position: r.position,
    department: r.department, dateOfJoining: r.date_of_joining,
    salary: r.salary != null ? Number(r.salary) : null,
    status: r.status, isDeleted: r.is_deleted,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await Employee.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const seq = await getNextSeq("employee");
    const b = req.body;
    const doc = await Employee.create({
      _id: seq,
      employee_id: `EMP-${String(seq).padStart(4, "0")}`,
      full_name: b.fullName, national_id: b.nationalId || null,
      email: b.email || null, phone_number: b.phoneNumber || null,
      position: b.position || null, department: b.department || null,
      date_of_joining: b.dateOfJoining || null,
      salary: b.salary ?? null, status: b.status || "active",
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Employee.findOne({ _id: Number(req.params.id), is_deleted: false }).lean();
    if (!doc) { res.status(404).json({ message: "الموظف غير موجود" }); return; }
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
    if (b.position !== undefined) update.position = b.position || null;
    if (b.department !== undefined) update.department = b.department || null;
    if (b.dateOfJoining !== undefined) update.date_of_joining = b.dateOfJoining || null;
    if (b.salary !== undefined) update.salary = b.salary ?? null;
    if (b.status) update.status = b.status;
    const doc = await Employee.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "الموظف غير موجود" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const doc = await Employee.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "الموظف غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف الموظف" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
