import { Router, type Request, type Response } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { Employee, Consultant, Trainee, Company, Nonprofit, Service, Project, getNextSeq } from "../lib/mongo.js";

const router = Router();
router.use(authenticate, requireRole("admin"));

router.post("/", async (_req: Request, res: Response) => {
  const added: Record<string, number> = { employees: 0, consultants: 0, trainees: 0, companies: 0, nonprofits: 0, projects: 0 };

  // Employees
  const empData = [
    ["أحمد محمد العتيبي", "1023456789", "ahmed@dama.sa", "0501234567", "2020-01-15", "مدير عام", "الإدارة", 25000, "active"],
    ["سارة علي الزهراني", "1098765432", "sara@dama.sa", "0551234567", "2021-03-01", "مدير موارد بشرية", "الموارد البشرية", 18000, "active"],
    ["خالد عبدالله القحطاني", "1076543210", "khalid@dama.sa", "0507654321", "2019-06-15", "محاسب أول", "المالية", 15000, "active"],
    ["نورة فيصل الشمري", "1054321098", "noura@dama.sa", "0554321098", "2022-01-10", "مدير مشاريع", "التشغيل", 20000, "active"],
    ["محمد سعد الدوسري", "1032109876", "mohammed@dama.sa", "0532109876", "2020-09-01", "مستشار تقني", "التقنية", 22000, "active"],
    ["فاطمة حسن العمري", "1010987654", "fatima@dama.sa", "0510987654", "2021-07-15", "أخصائي تدريب", "الموارد البشرية", 14000, "on_leave"],
  ];
  for (const [fullName, nationalId, email, phone, dateJoin, position, department, salary, status] of empData) {
    const exists = await Employee.findOne({ national_id: nationalId, is_deleted: false });
    if (!exists) {
      const seq = await getNextSeq("employee");
      await Employee.create({ _id: seq, employee_id: `EMP-${String(seq).padStart(4, "0")}`, full_name: fullName, national_id: nationalId, email, phone_number: phone, date_of_joining: dateJoin, position, department, salary: Number(salary), status });
      added.employees++;
    }
  }

  // Consultants
  const conData = [
    ["عبدالعزيز أحمد الزهراني", "1089012345", "abdulaziz@consultant.sa", "0507890123", "التخطيط الاستراتيجي", "دكتوراه", "الاستشارات المؤسسية", "available"],
    ["منى سليم الغامدي", "1067890123", "mona@consultant.sa", "0567890123", "الموارد البشرية", "ماجستير", "تطوير المنظمات", "available"],
    ["طارق ناصر البلوي", "1045678901", "tariq@consultant.sa", "0545678901", "التحول الرقمي", "بكالوريوس", "تقنية المعلومات", "busy"],
    ["ريم عمر السهلي", "1023456790", "reem@consultant.sa", "0523456790", "الاستشارات المالية", "ماجستير", "المالية والاستثمار", "available"],
  ];
  for (const [fullName, nationalId, email, phone, specialty, rank, field, availability] of conData) {
    const exists = await Consultant.findOne({ national_id: nationalId, is_deleted: false });
    if (!exists) {
      const seq = await getNextSeq("consultant");
      await Consultant.create({ _id: seq, consultant_id: `CON-${String(seq).padStart(4, "0")}`, full_name: fullName, national_id: nationalId, email, phone_number: phone, specialty, academic_rank: rank, consulting_field: field, availability });
      added.consultants++;
    }
  }

  // Trainees
  const traineeData = [
    ["عمر سعد الشهري", "omar@student.ksu.edu.sa", "0551234567", "جامعة الملك سعود", "إدارة أعمال", "تعاوني", "2024-09-01", "2024-12-31", "التشغيل"],
    ["لمى صالح العسيري", "lama@student.kau.edu.sa", "0561234567", "جامعة الملك عبدالعزيز", "محاسبة", "تعاوني", "2024-09-01", "2024-12-31", "المالية"],
    ["يوسف إبراهيم المالكي", "yousef@student.iau.edu.sa", "0571234567", "جامعة الإمام", "تقنية المعلومات", "صيفي", "2024-06-15", "2024-08-31", "التقنية"],
    ["دانة محمد الحارثي", "dana@student.kfupm.edu.sa", "0581234567", "جامعة الملك فهد", "هندسة صناعية", "تمهير", "2024-01-01", "2024-06-30", "الموارد البشرية"],
  ];
  for (const [fullName, email, phone, university, major, type, start, end, dept] of traineeData) {
    const exists = await Trainee.findOne({ email, is_deleted: false });
    if (!exists) {
      const seq = await getNextSeq("trainee");
      await Trainee.create({ _id: seq, full_name: fullName, email, phone_number: phone, university, major, training_type: type, start_date: start, end_date: end, department: dept });
      added.trainees++;
    }
  }

  // Companies
  const companyData = [
    ["شركة النخبة للاستشارات", "1010123456", "استشارات", "كبيرة", "0112345678", "info@alnukhba.sa", "الرياض، طريق الملك فهد"],
    ["مجموعة الأفق التجارية", "1020234567", "تجارة", "متوسطة", "0123456789", "info@alhofq.sa", "جدة، حي الروضة"],
    ["شركة الريادة للتقنية", "1030345678", "تقنية", "ناشئة", "0134567890", "info@riyadah.sa", "الرياض، حي العليا"],
    ["مؤسسة البناء الوطني", "1040456789", "خدمات", "متوسطة", "0145678901", "info@albinaa.sa", "الدمام، حي الفيصلية"],
    ["شركة التميز للتطوير", "1050567890", "تطوير", "كبيرة", "0156789012", "info@altamayoz.sa", "الرياض، حي النخيل"],
  ];
  for (const [name, cr, industry, size, phone, email, address] of companyData) {
    const exists = await Company.findOne({ cr_number: cr, is_deleted: false });
    if (!exists) {
      const seq = await getNextSeq("company");
      await Company.create({ _id: seq, company_name: name, cr_number: cr, industry, company_size: size, contact_phone: phone, contact_email: email, address });
      added.companies++;
    }
  }

  // Nonprofits
  const npData = [
    ["جمعية البر الخيرية بالرياض", "جمعية خيرية", "001-2015-CH", "https://www.albirr-riyadh.org", "0114567890", "info@albirr-riyadh.org"],
    ["مركز التنمية المجتمعية", "مركز تنموي", "002-2018-DC", "https://www.community-dev.sa", "0125678901", "info@community-dev.sa"],
    ["مؤسسة الأمل للأيتام", "مؤسسة اجتماعية", "003-2012-AF", "https://www.amal-orphans.sa", "0136789012", "info@amal-orphans.sa"],
  ];
  for (const [name, sector, license, website, phone, email] of npData) {
    const exists = await Nonprofit.findOne({ establishment_name: name, is_deleted: false });
    if (!exists) {
      const seq = await getNextSeq("nonprofit");
      await Nonprofit.create({ _id: seq, establishment_name: name, sector, license_number: license, website, contact_phone: phone, contact_email: email });
      added.nonprofits++;
    }
  }

  // Projects — pick first companies and services
  const companies = await Company.find({ is_deleted: false }).sort({ _id: 1 }).limit(4).lean();
  const services = await Service.find({ is_deleted: false }).sort({ _id: 1 }).limit(4).lean();

  if (companies.length >= 2 && services.length >= 2) {
    const projectData = [
      ["مشروع التحول الرقمي", 0, 0, "active", "2024-01-15", "2024-12-31"],
      ["مشروع تطوير الحوكمة", 1, 1, "active", "2024-03-01", "2024-09-30"],
      ["مشروع بناء الكفاءات", 2, 2, "planned", "2025-01-01", "2025-06-30"],
      ["مشروع الاعتماد المؤسسي", 3, 3, "completed", "2023-01-01", "2023-12-31"],
    ];
    for (const [name, ci, si, status, start, end] of projectData) {
      const cIdx = Math.min(Number(ci), companies.length - 1);
      const sIdx = Math.min(Number(si), services.length - 1);
      const exists = await Project.findOne({ project_name: String(name), is_deleted: false });
      if (!exists) {
        const seq = await getNextSeq("project");
        await Project.create({ _id: seq, project_name: name, company_id: companies[cIdx]._id, service_id: services[sIdx]._id, status, start_date: start, end_date: end });
        added.projects++;
      }
    }
  }

  res.json({ success: true, message: "تمت إضافة بيانات الاختبار بنجاح", added });
});

export default router;
