import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { User, getNextSeq } from "../lib/mongo.js";
import { authenticate, generateToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      return;
    }
    const row = await User.findOne({ username, is_deleted: false, is_active: true }).lean();
    if (!row) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) {
      res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    const token = generateToken({ id: String(row._id), username: row.username, role: row.role });
    res.json({
      success: true,
      token,
      user: { id: String(row._id), username: row.username, fullName: row.full_name, role: row.role },
    });
  } catch {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const row = await User.findOne({ _id: Number(req.user!.id), is_deleted: false }).lean();
    if (!row) { res.status(404).json({ message: "المستخدم غير موجود" }); return; }
    res.json({ user: { id: String(row._id), username: row.username, fullName: row.full_name, role: row.role } });
  } catch {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

router.post("/setup", async (req: Request, res: Response) => {
  try {
    const count = await User.countDocuments({ is_deleted: false });
    if (count > 0) {
      res.json({ success: false, message: "يوجد مستخدمون بالفعل" });
      return;
    }
    const hashed = await bcrypt.hash("Admin@123", 10);
    const seq = await getNextSeq("user");
    await User.create({ _id: seq, username: "admin", password: hashed, full_name: "مدير النظام", role: "admin" });
    res.json({ success: true, message: "تم إنشاء حساب المدير: admin / Admin@123" });
  } catch {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

export default router;
