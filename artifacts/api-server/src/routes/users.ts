import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticate, requireRole } from "../middleware/auth.js";
import { User, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

function mapRow(r: any) {
  const id = String(r._id);
  return {
    _id: id, id,
    username: r.username, fullName: r.full_name,
    email: r.email, role: r.role, isActive: r.is_active,
    isDeleted: r.is_deleted, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await User.find({ is_deleted: false }).sort({ _id: -1 }).lean();
    res.json(rows.map(mapRow));
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

router.post("/", async (req, res) => {
  try {
    const { username, password, fullName, email, role } = req.body;
    if (!username || !password || !fullName) {
      res.status(400).json({ message: "الاسم الكامل واسم المستخدم وكلمة المرور مطلوبة" });
      return;
    }
    const existing = await User.findOne({ username, is_deleted: false }).lean();
    if (existing) { res.status(400).json({ message: "اسم المستخدم موجود مسبقاً" }); return; }
    const hashed = await bcrypt.hash(password, 10);
    const seq = await getNextSeq("user");
    const doc = await User.create({
      _id: seq, username, password: hashed,
      full_name: fullName, email: email || null, role: role || "viewer",
    });
    res.status(201).json({ success: true, data: mapRow(doc.toObject()) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const b = req.body;
    const update: any = {};
    if (b.fullName) update.full_name = b.fullName;
    if (b.email !== undefined) update.email = b.email || null;
    if (b.role) update.role = b.role;
    if (b.isActive !== undefined) update.is_active = b.isActive;
    if (b.password) update.password = await bcrypt.hash(b.password, 10);
    const doc = await User.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: update }, { new: true }
    ).lean();
    if (!doc) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }
    res.json({ success: true, data: mapRow(doc) });
  } catch (err: any) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ message: "لا يمكن حذف حسابك الخاص" });
      return;
    }
    const doc = await User.findOneAndUpdate(
      { _id: Number(req.params.id), is_deleted: false },
      { $set: { is_deleted: true } }
    );
    if (!doc) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }
    res.json({ success: true, message: "تم حذف المستخدم" });
  } catch { res.status(500).json({ message: "خطأ في الخادم" }); }
});

export default router;
