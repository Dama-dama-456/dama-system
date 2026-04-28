import { Router, type Request, type Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Employee, Consultant, Trainee, Company, NonprofitCompany, Nonprofit, Service, Project, getNextSeq } from "../lib/mongo.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(authenticate);

function normalize(v: any): string { return String(v ?? "").trim(); }
function col(r: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) if (r[k] !== undefined && r[k] !== "") return normalize(r[k]);
  return "";
}
function parseDate(v: any): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`; }
  return null;
}
function parseNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}
function validateEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function iregex(s: string) { return new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"); }

function errRequired(field: string) { return `[حقل مطلوب] "${field}" لا يمكن أن يكون فارغاً — هذا الحقل إلزامي`; }
function errDupInFile(field: string, val: string) { return `[تكرار في الملف] "${field}" مكرر: ${val} — لا يُقبل التكرار داخل نفس الملف`; }
function errDupInDB(field: string, val: string) { return `[تكرار في النظام] "${field}" موجود مسبقاً: ${val} — لا يُقبل إدخال بيانات مكررة`; }
function errInvalidValue(field: string, val: string, allowed: string[]) { return `[قيمة غير مقبولة] "${field}" = "${val}" — القيم المسموح بها فقط: ${allowed.join(" / ")}`; }
function errInvalidEmail(email: string) { return `[تنسيق خاطئ] البريد الإلكتروني "${email}" غير صحيح — مثال صحيح: name@domain.com`; }
function errInvalidDate(field: string, val: string) { return `[تنسيق خاطئ] تاريخ "${field}" = "${val}" غير مقبول — استخدم الصيغة: 2024-01-15`; }
function errDateOrder() { return `[قيمة غير مقبولة] تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء`; }
function errNegative(field: string) { return `[قيمة غير مقبولة] "${field}" لا يمكن أن يكون بقيمة سالبة`; }
function errNotFound(entity: string, val: string, hint: string) { return `[غير موجود] ${entity} "${val}" غير موجود في النظام — ${hint}`; }

const EMPLOYEE_STATUS_MAP: Record<string, string> = {
  "نشط": "active", "active": "active", "إجازة": "on_leave", "on_leave": "on_leave",
  "استقالة": "resigned", "resigned": "resigned", "إنهاء خدمة": "terminated", "terminated": "terminated",
};
const EMPLOYEE_STATUS_AR = ["نشط", "إجازة", "استقالة", "إنهاء خدمة"];
const AVAILABILITY_MAP: Record<string, string> = {
  "متاح": "available", "available": "available", "مشغول": "busy", "busy": "busy",
  "غير نشط": "inactive", "inactive": "inactive",
};
const AVAILABILITY_AR = ["متاح", "مشغول", "غير نشط"];
const ACADEMIC_RANK_AR = ["بكالوريوس", "ماجستير", "دكتوراه"];
const TRAINING_TYPES_AR = ["صيفي", "تعاوني", "برنامج خريجين", "تمهير", "تدريب داما"];
const PROJECT_STATUS_MAP: Record<string, string> = {
  "مخطط": "planned", "planned": "planned", "قيد التنفيذ": "active", "active": "active",
  "مكتمل": "completed", "completed": "completed", "معلق": "suspended", "suspended": "suspended",
};
const PROJECT_STATUS_AR = ["مخطط", "قيد التنفيذ", "مكتمل", "معلق"];
const COMPANY_SIZE_AR = ["ناشئة", "صغيرة", "متوسطة", "كبيرة", "مؤسسة"];
const DEPT_AR = ["الوحدة التشغيلية", "الموارد البشرية", "اتصال مؤسسي", "المالية", "التسويق", "إعلام"];

const TEMPLATES: Record<string, { headers: string[]; notes?: string[][] }> = {
  employees: { headers: ["الاسم الكامل*", "رقم الهوية", "البريد الإلكتروني", "الهاتف", "تاريخ التعيين", "المسمى الوظيفي", "القسم", "الراتب", "الحالة"], notes: [[], [], [], [], ["صيغة: 2024-01-15"], [], ["الوحدة التشغيلية / الموارد البشرية / اتصال مؤسسي / المالية / التسويق / إعلام"], [], ["نشط / إجازة / استقالة / إنهاء خدمة"]] },
  consultants: { headers: ["الاسم الكامل*", "رقم الهوية", "البريد الإلكتروني", "الهاتف", "التخصص", "الدرجة العلمية*", "التوافر", "المجال الاستشاري"], notes: [[], [], [], [], [], ["بكالوريوس / ماجستير / دكتوراه"], ["متاح / مشغول / غير نشط"], []] },
  trainees: { headers: ["الاسم الكامل*", "البريد الإلكتروني", "الهاتف", "الجامعة*", "التخصص", "نوع التدريب*", "تاريخ البدء", "تاريخ الانتهاء", "القسم"], notes: [[], [], [], [], [], ["صيفي / تعاوني / برنامج خريجين / تمهير / تدريب داما"], ["صيغة: 2024-01-15"], ["يجب أن يكون بعد تاريخ البدء"], ["الوحدة التشغيلية / الموارد البشرية / اتصال مؤسسي / المالية / التسويق / إعلام"]] },
  companies: { headers: ["اسم الشركة*", "رقم السجل التجاري*", "القطاع", "حجم الشركة", "حالة العقد", "العنوان", "الهاتف", "البريد الإلكتروني"], notes: [[], [], [], ["ناشئة / صغيرة / متوسطة / كبيرة / مؤسسة"], ["ساري المفعول / منتهي / لا يوجد"], [], [], []] },
  "nonprofit-companies": { headers: ["اسم الشركة*", "رقم السجل التجاري*", "القطاع", "حجم الشركة", "حالة العقد", "العنوان", "الهاتف", "البريد الإلكتروني"], notes: [[], [], [], ["ناشئة / صغيرة / متوسطة / كبيرة / مؤسسة"], ["ساري المفعول / منتهي / لا يوجد"], [], [], []] },
  nonprofits: { headers: ["اسم المنشأة*", "رقم الترخيص", "القطاع", "العنوان", "الموقع الإلكتروني", "الهاتف", "البريد الإلكتروني"], notes: [["يقبل أيضاً: اسم المنشاء / اسم المنظمة"], [], [], [], [], [], []] },
  services: { headers: ["اسم الخدمة*", "فئة الخدمة", "الوصف", "السعر الأساسي", "نشطة"], notes: [[], [], [], [], ["نعم / لا"]] },
    projects: { headers: ["اسم المشروع*", "اسم الشركة", "اسم الخدمة*", "الحالة", "تاريخ البدء", "تاريخ الانتهاء"], notes: [[], ["يمكن كتابة أي اسم شركة"], ["يجب أن تكون موجودة في النظام"], ["مخطط / قيد التنفيذ / مكتمل / معلق"], ["صيغة: 2024-01-15"], ["يجب أن يكون بعد تاريخ البدء"]] },
};

function sheetToRows(buffer: Buffer): Record<string, any>[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

router.get("/:entity/template", (req: Request, res: Response) => {
  const tpl = TEMPLATES[req.params.entity];
  if (!tpl) { res.status(404).json({ message: "كيان غير معروف" }); return; }
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [tpl.headers];
  if (tpl.notes) aoa.push(tpl.notes.map(n => n[0] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = tpl.headers.map(() => ({ wch: 28 }));
  XLSX.utils.book_append_sheet(wb, ws, "البيانات");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.entity}-template.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

router.post("/:entity", requireRole("admin", "manager"), upload.single("file"), async (req: Request, res: Response) => {
  const entity = req.params.entity;
  if (!req.file) { res.status(400).json({ message: "لم يتم رفع ملف" }); return; }
  let rows: Record<string, any>[];
  try { rows = sheetToRows(req.file.buffer); }
  catch { res.status(400).json({ message: "تعذّر قراءة الملف — تأكد أنه xlsx أو xls صحيح" }); return; }
  if (rows.length === 0) { res.status(400).json({ message: "الملف فارغ أو لا يحتوي على صفوف بيانات" }); return; }

  const added: number[] = [];
  const failed: { row: number; reason: string }[] = [];
  const fail = (row: number, reason: string) => failed.push({ row, reason });

  try {
    if (entity === "employees") {
      const seenIds = new Set<string>(); const seenEmails = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const fullName = col(r, "الاسم الكامل*", "الاسم الكامل");
        if (!fullName) { fail(rn, errRequired("الاسم الكامل")); continue; }
        const nationalId = col(r, "رقم الهوية*", "رقم الهوية");
        const email = col(r, "البريد الإلكتروني*", "البريد الإلكتروني");
        if (email && !validateEmail(email)) { fail(rn, errInvalidEmail(email)); continue; }
        const phone = col(r, "الهاتف");
        const dateRaw = r["تاريخ التعيين"] ?? r["تاريخ التوظيف"] ?? "";
        const position = col(r, "المسمى الوظيفي");
        const dept = col(r, "القسم");
        const statusRaw = col(r, "الحالة") || "نشط";
        const salaryRaw = r["الراتب"];
        if (dept && !DEPT_AR.includes(dept)) { fail(rn, errInvalidValue("القسم", dept, DEPT_AR)); continue; }
        const status = EMPLOYEE_STATUS_MAP[statusRaw];
        if (!status) { fail(rn, errInvalidValue("الحالة", statusRaw, EMPLOYEE_STATUS_AR)); continue; }
        const salary = parseNumber(salaryRaw);
        if (salary !== null && salary < 0) { fail(rn, errNegative("الراتب")); continue; }
        const dateStr = parseDate(dateRaw);
        if (dateRaw && !dateStr) { fail(rn, errInvalidDate("تاريخ التعيين", String(dateRaw))); continue; }
        if (nationalId) {
          if (seenIds.has(nationalId)) { fail(rn, errDupInFile("رقم الهوية", nationalId)); continue; }
          if (await Employee.findOne({ national_id: nationalId, is_deleted: false })) { fail(rn, errDupInDB("رقم الهوية", nationalId)); continue; }
          seenIds.add(nationalId);
        }
        if (email) {
          if (seenEmails.has(email.toLowerCase())) { fail(rn, errDupInFile("البريد الإلكتروني", email)); continue; }
          if (await Employee.findOne({ email: { $regex: iregex(email) }, is_deleted: false })) { fail(rn, errDupInDB("البريد الإلكتروني", email)); continue; }
          seenEmails.add(email.toLowerCase());
        }
        const seq = await getNextSeq("employee");
        await Employee.create({ _id: seq, employee_id: `EMP-${String(seq).padStart(4,"0")}`, full_name: fullName, national_id: nationalId, email, phone_number: phone||null, position: position||null, department: dept||null, date_of_joining: dateStr, salary, status });
        added.push(seq);
      }

    } else if (entity === "consultants") {
      const seenIds = new Set<string>(); const seenEmails = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const fullName = col(r, "الاسم الكامل*", "الاسم الكامل");
        if (!fullName) { fail(rn, errRequired("الاسم الكامل")); continue; }
        const nationalId = col(r, "رقم الهوية*", "رقم الهوية");
        const email = col(r, "البريد الإلكتروني*", "البريد الإلكتروني");
        if (email && !validateEmail(email)) { fail(rn, errInvalidEmail(email)); continue; }
        const academicRank = col(r, "الدرجة العلمية*", "الدرجة العلمية", "الرتبة الأكاديمية");
        if (!academicRank) { fail(rn, errRequired("الدرجة العلمية")); continue; }
        if (!ACADEMIC_RANK_AR.includes(academicRank)) { fail(rn, errInvalidValue("الدرجة العلمية", academicRank, ACADEMIC_RANK_AR)); continue; }
        const phone = col(r, "الهاتف");
        const specialty = col(r, "التخصص");
        const consultingField = col(r, "المجال الاستشاري", "مجال الاستشارة");
        const availabilityRaw = col(r, "التوافر", "الحالة") || "متاح";
        const availability = AVAILABILITY_MAP[availabilityRaw];
        if (!availability) { fail(rn, errInvalidValue("التوافر", availabilityRaw, AVAILABILITY_AR)); continue; }
        if (nationalId) {
          if (seenIds.has(nationalId)) { fail(rn, errDupInFile("رقم الهوية", nationalId)); continue; }
          if (await Consultant.findOne({ national_id: nationalId, is_deleted: false })) { fail(rn, errDupInDB("رقم الهوية", nationalId)); continue; }
          seenIds.add(nationalId);
        }
        if (email) {
          if (seenEmails.has(email.toLowerCase())) { fail(rn, errDupInFile("البريد الإلكتروني", email)); continue; }
          if (await Consultant.findOne({ email: { $regex: iregex(email) }, is_deleted: false })) { fail(rn, errDupInDB("البريد الإلكتروني", email)); continue; }
          seenEmails.add(email.toLowerCase());
        }
        const seq = await getNextSeq("consultant");
        await Consultant.create({ _id: seq, consultant_id: `CON-${String(seq).padStart(4,"0")}`, full_name: fullName, national_id: nationalId, email, phone_number: phone||null, specialty: specialty||null, academic_rank: academicRank, consulting_field: consultingField||null, availability });
        added.push(seq);
      }

    } else if (entity === "trainees") {
      const seenEmails = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const fullName = col(r, "الاسم الكامل*", "الاسم الكامل");
        if (!fullName) { fail(rn, errRequired("الاسم الكامل")); continue; }
        const email = col(r, "البريد الإلكتروني*", "البريد الإلكتروني");
        if (email && !validateEmail(email)) { fail(rn, errInvalidEmail(email)); continue; }
        const university = col(r, "الجامعة*", "الجامعة");
        if (!university) { fail(rn, errRequired("الجامعة")); continue; }
        const trainingType = col(r, "نوع التدريب*", "نوع التدريب");
        if (!trainingType) { fail(rn, errRequired("نوع التدريب")); continue; }
        if (!TRAINING_TYPES_AR.includes(trainingType)) { fail(rn, errInvalidValue("نوع التدريب", trainingType, TRAINING_TYPES_AR)); continue; }
        const phone = col(r, "الهاتف"); const major = col(r, "التخصص"); const dept = col(r, "القسم");
        const startRaw = r["تاريخ البدء"] ?? ""; const endRaw = r["تاريخ الانتهاء"] ?? "";
        if (dept && !DEPT_AR.includes(dept)) { fail(rn, errInvalidValue("القسم", dept, DEPT_AR)); continue; }
        if (email) {
          if (seenEmails.has(email.toLowerCase())) { fail(rn, errDupInFile("البريد الإلكتروني", email)); continue; }
          if (await Trainee.findOne({ email: { $regex: iregex(email) }, is_deleted: false })) { fail(rn, errDupInDB("البريد الإلكتروني", email)); continue; }
          seenEmails.add(email.toLowerCase());
        }
        const startDate = parseDate(startRaw); const endDate = parseDate(endRaw);
        if (startRaw && !startDate) { fail(rn, errInvalidDate("تاريخ البدء", String(startRaw))); continue; }
        if (endRaw && !endDate) { fail(rn, errInvalidDate("تاريخ الانتهاء", String(endRaw))); continue; }
        if (startDate && endDate && endDate <= startDate) { fail(rn, errDateOrder()); continue; }
        const seq = await getNextSeq("trainee");
        await Trainee.create({ _id: seq, full_name: fullName, email, phone_number: phone||null, university, major: major||null, training_type: trainingType, start_date: startDate, end_date: endDate, department: dept||null });
        added.push(seq);
      }

    } else if (entity === "companies") {
      const seenCR = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const companyName = col(r, "اسم الشركة*", "اسم الشركة");
        if (!companyName) { fail(rn, errRequired("اسم الشركة")); continue; }
        const crNumber = col(r, "رقم السجل التجاري*", "رقم السجل التجاري", "السجل التجاري*", "السجل التجاري");
        if (!crNumber) { fail(rn, errRequired("رقم السجل التجاري")); continue; }
        const industry = col(r, "القطاع"); const companySize = col(r, "حجم الشركة");
        const contractStatus = col(r, "حالة العقد");
        const address = col(r, "العنوان"); const contactPhone = col(r, "الهاتف", "هاتف");
        const contactEmail = col(r, "البريد الإلكتروني", "بريد");
        if (companySize && !COMPANY_SIZE_AR.includes(companySize)) { fail(rn, errInvalidValue("حجم الشركة", companySize, COMPANY_SIZE_AR)); continue; }
        const CONTRACT_STATUS_AR = ["ساري المفعول", "منتهي", "لا يوجد"];
        if (contractStatus && !CONTRACT_STATUS_AR.includes(contractStatus)) { fail(rn, errInvalidValue("حالة العقد", contractStatus, CONTRACT_STATUS_AR)); continue; }
        if (contactEmail && !validateEmail(contactEmail)) { fail(rn, errInvalidEmail(contactEmail)); continue; }
        if (seenCR.has(crNumber)) { fail(rn, errDupInFile("رقم السجل التجاري", crNumber)); continue; }
        if (await Company.findOne({ cr_number: crNumber, is_deleted: false })) { fail(rn, errDupInDB("رقم السجل التجاري", crNumber)); continue; }
        seenCR.add(crNumber);
        const seq = await getNextSeq("company");
        await Company.create({ _id: seq, company_name: companyName, cr_number: crNumber, industry: industry||null, company_size: companySize||null, contract_status: contractStatus||null, contact_phone: contactPhone||null, contact_email: contactEmail||null, address: address||null });
        added.push(seq);
      }

    } else if (entity === "nonprofit-companies") {
      const seenCR = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const companyName = col(r, "اسم الشركة*", "اسم الشركة");
        if (!companyName) { fail(rn, errRequired("اسم الشركة")); continue; }
        const crNumber = col(r, "رقم السجل التجاري*", "رقم السجل التجاري", "السجل التجاري*", "السجل التجاري");
        if (!crNumber) { fail(rn, errRequired("رقم السجل التجاري")); continue; }
        const industry = col(r, "القطاع"); const companySize = col(r, "حجم الشركة");
        const contractStatus = col(r, "حالة العقد");
        const address = col(r, "العنوان"); const contactPhone = col(r, "الهاتف", "هاتف");
        const contactEmail = col(r, "البريد الإلكتروني", "بريد");
        if (companySize && !COMPANY_SIZE_AR.includes(companySize)) { fail(rn, errInvalidValue("حجم الشركة", companySize, COMPANY_SIZE_AR)); continue; }
        const CONTRACT_STATUS_AR = ["ساري المفعول", "منتهي", "لا يوجد"];
        if (contractStatus && !CONTRACT_STATUS_AR.includes(contractStatus)) { fail(rn, errInvalidValue("حالة العقد", contractStatus, CONTRACT_STATUS_AR)); continue; }
        if (contactEmail && !validateEmail(contactEmail)) { fail(rn, errInvalidEmail(contactEmail)); continue; }
        if (seenCR.has(crNumber)) { fail(rn, errDupInFile("رقم السجل التجاري", crNumber)); continue; }
        if (await NonprofitCompany.findOne({ cr_number: crNumber, is_deleted: false })) { fail(rn, errDupInDB("رقم السجل التجاري", crNumber)); continue; }
        seenCR.add(crNumber);
        const seq = await getNextSeq("nonprofit_company");
        await NonprofitCompany.create({ _id: seq, company_name: companyName, cr_number: crNumber, industry: industry||null, company_size: companySize||null, contract_status: contractStatus||null, contact_phone: contactPhone||null, contact_email: contactEmail||null, address: address||null });
        added.push(seq);
      }

    } else if (entity === "nonprofits") {
      const seenLic = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const establishmentName = col(r, "اسم المنشأة*", "اسم المنشأة", "اسم المنشاء", "اسم المنشاة", "اسم المنشاه", "اسم المنظمة");
        if (!establishmentName) { fail(rn, errRequired("اسم المنشأة")); continue; }
        const licenseNumber = col(r, "رقم الترخيص*", "رقم الترخيص") || null;
        const contactEmail = col(r, "البريد الإلكتروني*", "البريد الإلكتروني", "بريد المسؤول", "بريد");
        if (contactEmail && !validateEmail(contactEmail)) { fail(rn, errInvalidEmail(contactEmail)); continue; }
        const sector = col(r, "القطاع", "نوع المنظمة"); const address = col(r, "العنوان");
        const website = col(r, "الموقع الإلكتروني", "الموقع الالكتروني"); const contactPhone = col(r, "الهاتف", "هاتف");
        if (licenseNumber) {
          if (seenLic.has(licenseNumber)) { fail(rn, errDupInFile("رقم الترخيص", licenseNumber)); continue; }
          if (await Nonprofit.findOne({ license_number: licenseNumber, is_deleted: false })) { fail(rn, errDupInDB("رقم الترخيص", licenseNumber)); continue; }
          seenLic.add(licenseNumber);
        }
        if (await Nonprofit.findOne({ establishment_name: { $regex: iregex(establishmentName) }, is_deleted: false })) { fail(rn, errDupInDB("اسم المنشأة", establishmentName)); continue; }
        const seq = await getNextSeq("nonprofit");
        await Nonprofit.create({ _id: seq, establishment_name: establishmentName, sector: sector||null, license_number: licenseNumber, address: address||null, website: website||null, contact_phone: contactPhone||null, contact_email: contactEmail });
        added.push(seq);
      }

    } else if (entity === "services") {
      const seenNames = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const serviceName = col(r, "اسم الخدمة*", "اسم الخدمة");
        if (!serviceName) { fail(rn, errRequired("اسم الخدمة")); continue; }
        const serviceCategory = col(r, "فئة الخدمة", "الفئة");
        const description = col(r, "الوصف");
        const basePriceRaw = r["السعر الأساسي"] ?? ""; const isActiveRaw = col(r, "نشطة");
        const basePrice = parseNumber(basePriceRaw);
        if (basePriceRaw !== "" && basePrice === null) { fail(rn, `[تنسيق خاطئ] "السعر الأساسي" = "${basePriceRaw}" يجب أن يكون رقماً`); continue; }
        if (basePrice !== null && basePrice < 0) { fail(rn, errNegative("السعر الأساسي")); continue; }
        const isActiveAllowed = ["نعم", "لا", "yes", "no", "true", "false", "1", "0", ""];
        const isActiveStr = isActiveRaw.toLowerCase();
        if (isActiveRaw && !isActiveAllowed.includes(isActiveStr)) { fail(rn, errInvalidValue("نشطة", isActiveRaw, ["نعم", "لا"])); continue; }
        const isActive = !isActiveRaw || ["نعم", "yes", "true", "1"].includes(isActiveStr);
        if (seenNames.has(serviceName.toLowerCase())) { fail(rn, errDupInFile("اسم الخدمة", serviceName)); continue; }
        if (await Service.findOne({ service_name: { $regex: iregex(serviceName) }, is_deleted: false })) { fail(rn, errDupInDB("اسم الخدمة", serviceName)); continue; }
        seenNames.add(serviceName.toLowerCase());
        const seq = await getNextSeq("service");
        await Service.create({ _id: seq, service_name: serviceName, service_category: serviceCategory||null, description: description||null, base_price: basePrice, is_active: isActive });
        added.push(seq);
      }

    } else if (entity === "projects") {
      const seenNames = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; const rn = i + 2;
        const projectName = col(r, "اسم المشروع*", "اسم المشروع");
        if (!projectName) { fail(rn, errRequired("اسم المشروع")); continue; }
        const companyNameRaw = col(r, "اسم الشركة*", "اسم الشركة");
        const serviceNameRaw = col(r, "اسم الخدمة*", "اسم الخدمة");
        if (!serviceNameRaw) { fail(rn, errRequired("اسم الخدمة")); continue; }
        const statusRaw = col(r, "الحالة") || "قيد التنفيذ";
        const status = PROJECT_STATUS_MAP[statusRaw];
        if (!status) { fail(rn, errInvalidValue("الحالة", statusRaw, PROJECT_STATUS_AR)); continue; }
        const startRaw = r["تاريخ البدء"] ?? ""; const endRaw = r["تاريخ الانتهاء"] ?? "";
        const startDate = parseDate(startRaw); const endDate = parseDate(endRaw);
        if (startRaw && !startDate) { fail(rn, errInvalidDate("تاريخ البدء", String(startRaw))); continue; }
        if (endRaw && !endDate) { fail(rn, errInvalidDate("تاريخ الانتهاء", String(endRaw))); continue; }
        if (startDate && endDate && endDate <= startDate) { fail(rn, errDateOrder()); continue; }
        const service = await Service.findOne({ service_name: { $regex: iregex(serviceNameRaw) }, is_deleted: false }).lean();
        if (!service) { fail(rn, errNotFound("الخدمة", serviceNameRaw, "أضفها أولاً من قسم الخدمات")); continue; }
        if (seenNames.has(projectName.toLowerCase())) { fail(rn, errDupInFile("اسم المشروع", projectName)); continue; }
        seenNames.add(projectName.toLowerCase());
        const seq = await getNextSeq("project");
        await Project.create({ _id: seq, project_name: projectName, company_id: companyNameRaw || null, service_id: service._id, status, start_date: startDate, end_date: endDate });
        added.push(seq);
      }

    } else {
      res.status(404).json({ message: "كيان غير معروف" }); return;
    }
  } catch (err: any) {
    res.status(500).json({ message: "خطأ في الخادم أثناء معالجة الملف", detail: err.message }); return;
  }

  res.json({ success: true, total: rows.length, added: added.length, skipped: failed.length, failed });
});

export default router;