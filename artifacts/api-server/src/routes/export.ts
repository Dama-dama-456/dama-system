import { Router, type Request, type Response } from "express";
import * as XLSX from "xlsx";
import { authenticate } from "../middleware/auth.js";
import { Employee, Consultant, Trainee, Company, Nonprofit, Service, Project } from "../lib/mongo.js";

const router = Router();
router.use(authenticate);

router.get("/:entity", async (req: Request, res: Response) => {
  const entity = req.params.entity;

  try {
    let headers: string[] = [];
    let data: any[][] = [];

    if (entity === "employees") {
      headers = ["الاسم الكامل", "رقم الهوية", "البريد الإلكتروني", "الهاتف", "تاريخ التعيين", "المسمى الوظيفي", "القسم", "الراتب", "الحالة"];
      const rows = await Employee.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      const s: Record<string,string> = { active:"نشط", on_leave:"إجازة", resigned:"استقالة", terminated:"إنهاء خدمة" };
      data = rows.map(r => [r.full_name, r.national_id, r.email, r.phone_number,
        r.date_of_joining ? String(r.date_of_joining).substring(0,10) : "",
        r.position, r.department, r.salary, s[r.status] || r.status]);

    } else if (entity === "consultants") {
      headers = ["الاسم الكامل", "رقم الهوية", "البريد الإلكتروني", "الهاتف", "التخصص", "الدرجة العلمية", "المجال الاستشاري", "التوافر"];
      const rows = await Consultant.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      const a: Record<string,string> = { available:"متاح", busy:"مشغول", inactive:"غير نشط" };
      data = rows.map(r => [r.full_name, r.national_id, r.email, r.phone_number,
        r.specialty, r.academic_rank, r.consulting_field, a[r.availability] || r.availability]);

    } else if (entity === "trainees") {
      headers = ["الاسم الكامل", "البريد الإلكتروني", "الهاتف", "الجامعة", "التخصص", "نوع التدريب", "تاريخ البدء", "تاريخ الانتهاء", "القسم"];
      const rows = await Trainee.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      data = rows.map(r => [r.full_name, r.email, r.phone_number, r.university, r.major, r.training_type,
        r.start_date ? String(r.start_date).substring(0,10) : "",
        r.end_date ? String(r.end_date).substring(0,10) : "", r.department]);

    } else if (entity === "companies") {
      headers = ["اسم الشركة", "رقم السجل التجاري", "القطاع", "العنوان", "الهاتف", "البريد الإلكتروني"];
      const rows = await Company.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      data = rows.map(r => [r.company_name, r.cr_number, r.industry, r.address, r.contact_phone, r.contact_email]);

    } else if (entity === "nonprofits") {
      headers = ["اسم المنشأة", "رقم الترخيص", "القطاع", "العنوان", "الموقع الإلكتروني", "الهاتف", "البريد الإلكتروني"];
      const rows = await Nonprofit.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      data = rows.map(r => [r.establishment_name, r.license_number, r.sector, r.address, r.website, r.contact_phone, r.contact_email]);

    } else if (entity === "services") {
      headers = ["اسم الخدمة", "فئة الخدمة", "الوصف", "السعر الأساسي", "نشطة"];
      const rows = await Service.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      data = rows.map(r => [r.service_name, r.service_category, r.description, r.base_price, r.is_active ? "نعم" : "لا"]);

    } else if (entity === "projects") {
      headers = ["اسم المشروع", "اسم الشركة", "اسم الخدمة", "الحالة", "تاريخ البدء", "تاريخ الانتهاء"];
      const rows = await Project.find({ is_deleted: false }).sort({ _id: 1 }).lean();
      const m: Record<string,string> = { planned:"مخطط", active:"قيد التنفيذ", completed:"مكتمل", suspended:"معلق" };
      data = await Promise.all(rows.map(async r => {
        const company = r.company_id ? await Company.findOne({ _id: r.company_id }).lean() : null;
        const service = r.service_id ? await Service.findOne({ _id: r.service_id }).lean() : null;
        return [r.project_name, company?.company_name || "", service?.service_name || "",
          m[r.status] || r.status,
          r.start_date ? String(r.start_date).substring(0,10) : "",
          r.end_date ? String(r.end_date).substring(0,10) : ""];
      }));

    } else {
      res.status(404).json({ message: "كيان غير معروف" });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map(() => ({ wch: 26 }));
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "1B3A6B" }, patternType: "solid" } };
    }
    XLSX.utils.book_append_sheet(wb, ws, "البيانات");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().substring(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="${entity}-export-${date}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ message: "خطأ في التصدير", detail: err.message });
  }
});

export default router;