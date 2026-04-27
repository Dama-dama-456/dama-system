import mongoose, { Schema, model } from "mongoose";
import { logger } from "./logger.js";

function getMongoHost(): string {
  const raw = process.env["MONGODB_URI"] || "";
  return raw.replace(/^(mongodb(?:\+srv)?:\/\/).+@+/, "$1");
}
const MONGO_HOST = getMongoHost();
const MONGO_USER = "dama_db_user";
const MONGO_PASS = process.env["MONGODB_PASS"] || "";

const CounterSchema = new Schema({ _id: { type: String }, seq: { type: Number, default: 0 } });
const Counter = model("Counter", CounterSchema);

export async function getNextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc!.seq;
}

const UserSchema = new Schema({
  _id: { type: Number },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  email: { type: String, default: null },
  role: { type: String, enum: ["admin", "manager", "viewer"], default: "viewer" },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const User = model("User", UserSchema);

const EmployeeSchema = new Schema({
  _id: { type: Number },
  employee_id: { type: String, unique: true, sparse: true },
  full_name: { type: String, required: true },
  national_id: { type: String, default: null },
  email: { type: String, default: null },
  phone_number: { type: String, default: null },
  position: { type: String, default: null },
  department: { type: String, default: null },
  date_of_joining: { type: Date, default: null },
  salary: { type: Number, default: null },
  status: { type: String, default: "active" },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Employee = model("Employee", EmployeeSchema);

const ConsultantSchema = new Schema({
  _id: { type: Number },
  consultant_id: { type: String, unique: true, sparse: true },
  full_name: { type: String, required: true },
  national_id: { type: String, default: null },
  email: { type: String, default: null },
  phone_number: { type: String, default: null },
  specialty: { type: String, default: null },
  academic_rank: { type: String, default: null },
  consulting_field: { type: String, default: null },
  availability: { type: String, default: "available" },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Consultant = model("Consultant", ConsultantSchema);

const TraineeSchema = new Schema({
  _id: { type: Number },
  full_name: { type: String, required: true },
  email: { type: String, default: null },
  phone_number: { type: String, default: null },
  university: { type: String, default: null },
  major: { type: String, default: null },
  training_type: { type: String, default: null },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  department: { type: String, default: null },
  final_grade: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Trainee = model("Trainee", TraineeSchema);

const CompanySchema = new Schema({
  _id: { type: Number },
  company_name: { type: String, required: true },
  cr_number: { type: String, default: null },
  industry: { type: String, default: null },
  company_size: { type: String, default: null },
  contract_status: { type: String, default: null },
  address: { type: String, default: null },
  contact_phone: { type: String, default: null },
  contact_email: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Company = model("Company", CompanySchema);

// ── Nonprofit Companies ───────────────────────────────────────────────────────
const NonprofitCompanySchema = new Schema({
  _id: { type: Number },
  company_name: { type: String, required: true },
  cr_number: { type: String, default: null },
  industry: { type: String, default: null },
  company_size: { type: String, default: null },
  contract_status: { type: String, default: null },
  address: { type: String, default: null },
  contact_phone: { type: String, default: null },
  contact_email: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const NonprofitCompany = model("NonprofitCompany", NonprofitCompanySchema);

const NonprofitSchema = new Schema({
  _id: { type: Number },
  establishment_name: { type: String, required: true },
  sector: { type: String, default: null },
  license_number: { type: String, default: null },
  address: { type: String, default: null },
  website: { type: String, default: null },
  contact_phone: { type: String, default: null },
  contact_email: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Nonprofit = model("Nonprofit", NonprofitSchema);

const ServiceSchema = new Schema({
  _id: { type: Number },
  service_name: { type: String, required: true },
  service_category: { type: String, default: null },
  description: { type: String, default: null },
  base_price: { type: Number, default: null },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Service = model("Service", ServiceSchema);

const ProjectSchema = new Schema({
  _id: { type: Number },
  project_name: { type: String, required: true },
  company_id: { type: Number, default: null },
  service_id: { type: Number, default: null },
  status: { type: String, default: "active" },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, _id: false });
export const Project = model("Project", ProjectSchema);

export async function connectDB(): Promise<void> {
  logger.info({ host: MONGO_HOST, user: MONGO_USER }, "Connecting to MongoDB");
  await mongoose.connect(MONGO_HOST, {
    dbName: "DamaDB",
    auth: { username: MONGO_USER, password: MONGO_PASS },
    authSource: "admin",
  });
  logger.info("MongoDB connected successfully");
  await seedDefaultServices();
}

async function seedDefaultServices(): Promise<void> {
  const count = await Service.countDocuments({ is_deleted: false });
  if (count > 0) return;
  const defaultServices = [
    { service_name: "حوكمة", service_category: "استشارات", description: "تصميم وتطبيق أطر الحوكمة المؤسسية" },
    { service_name: "التخطيط الاستراتيجي", service_category: "استشارات", description: "إعداد الخطط الاستراتيجية وبطاقات الأداء المتوازن" },
    { service_name: "التحول الرقمي", service_category: "تقنية", description: "قيادة مبادرات التحول الرقمي وتوظيف التقنية" },
    { service_name: "تطوير الموارد البشرية", service_category: "تدريب", description: "تصميم برامج التدريب وتطوير الكفاءات" },
    { service_name: "الاستشارات المالية", service_category: "مالية", description: "التحليل المالي وإعداد الهياكل المالية" },
    { service_name: "تحسين العمليات", service_category: "استشارات", description: "رسم وإعادة هندسة العمليات التشغيلية" },
    { service_name: "البناء المؤسسي", service_category: "استشارات", description: "تأسيس الهياكل التنظيمية ووضع السياسات" },
    { service_name: "تأهيل", service_category: "تطوير", description: "برامج تأهيل الكوادر الوطنية للسوق العمل" },
    { service_name: "اعتماد مؤسسي", service_category: "اعتماد", description: "الإعداد لشهادات الجودة والاعتماد الدولي" },
  ];
  for (const svc of defaultServices) {
    const seq = await getNextSeq("service");
    await Service.create({ _id: seq, ...svc, is_active: true });
  }
  logger.info("Default services seeded (9 services)");
}