# داما القابضة - نظام الإدارة المتكامل

## معلومات المشروع

نظام إدارة شامل لداما القابضة، يغطي إدارة الموظفين والمستشارين والمتدربين والشركات والمنشآت غير الربحية والخدمات والمشاريع.

## البنية التقنية

- **الواجهة الأمامية**: React + Vite + TypeScript (Arabic RTL)
  - المسار: `artifacts/dama-web/`
  - المنفذ: 20531
  - مكتبات: wouter (routing), @tanstack/react-query, shadcn/ui, tailwind
  
- **الخادم الخلفي**: Express + TypeScript + PostgreSQL (pg)
  - المسار: `artifacts/api-server/`
  - المنفذ: 8080
  - مكتبات: pg, bcryptjs, jsonwebtoken

- **قاعدة البيانات**: Replit PostgreSQL (مدمجة)

## المتغيرات البيئية المطلوبة

- `DATABASE_URL` — رابط اتصال PostgreSQL (يُضاف تلقائياً من Replit)
- `SESSION_SECRET` — يُستخدم كـ JWT secret
- `PORT` — يتم تعيينه تلقائياً

## المصادقة

- JWT-based authentication
- الأدوار: admin, manager, viewer
- الحساب الافتراضي: admin / Admin@123 (يُنشأ عند أول تشغيل)

## هيكل قاعدة البيانات (PostgreSQL)

الجداول: `users`, `employees`, `consultants`, `trainees`, `companies`, `nonprofits`, `services`, `projects`, `counters`

- جميع الجداول تحتوي على: `id SERIAL`, `is_deleted BOOLEAN`, `created_at`, `updated_at`
- الحذف ناعم (soft delete) عبر `is_deleted = true`
- الـ IDs ترجع كـ `_id` في الـ API للتوافق مع الواجهة الأمامية

## Routes الخادم

- `POST /api/auth/login` — تسجيل الدخول
- `GET /api/auth/me` — معلومات المستخدم الحالي
- `POST /api/auth/setup` — إنشاء المدير الأول
- `GET /api/stats/dashboard` — إحصائيات لوحة التحكم
- CRUD endpoints لـ: employees, consultants, trainees, companies, nonprofits, services, projects, users
- `GET /api/export/:entity` — تصدير Excel بعناوين عربية (يتطلب توثيق)
- `POST /api/import/:entity` — استيراد Excel مع التحقق (admin/manager فقط)
- `GET /api/import/:entity/template` — تحميل نموذج Excel (يتطلب توثيق)
- `POST /api/seed` — إضافة بيانات اختبار (admin فقط)

## المميزات المكتملة

- ✅ استيراد وتصدير Excel لجميع الكيانات السبعة مع التحقق الشامل
- ✅ ٩ خدمات افتراضية تُضاف تلقائياً عند أول تشغيل (إذا كانت جدول الخدمات فارغاً)
- ✅ بيانات اختبار عبر زر "إضافة بيانات تجريبية" في لوحة التحكم (admin فقط)
- ✅ نظام صلاحيات في الواجهة: viewer لا يرى أزرار الإضافة/التعديل/الحذف/الاستيراد

## نظام الصلاحيات

| الصلاحية | admin | manager | viewer |
|---------|-------|---------|--------|
| عرض البيانات | ✅ | ✅ | ✅ |
| إضافة/تعديل | ✅ | ✅ | ❌ |
| حذف | ✅ | ❌ | ❌ |
| استيراد Excel | ✅ | ✅ | ❌ |
| تصدير Excel | ✅ | ✅ | ✅ |
| إدارة المستخدمين | ✅ | ❌ | ❌ |

## بنية الملفات المهمة

```
artifacts/
  api-server/src/
    app.ts              — Express app مع PostgreSQL connection
    routes/             — جميع الـ routes (SQL queries)
    middleware/auth.ts  — JWT middleware
    lib/db.ts           — PostgreSQL pool + migrations
    lib/pg-helpers.ts   — Counter helper (getNextSeq)
  dama-web/src/
    App.tsx             — Router entry
    pages/              — صفحات التطبيق
    components/
      layout.tsx        — Sidebar navigation
      import-excel.tsx  — مكوّن الاستيراد/التصدير (يدعم canImport prop)
      ui/               — shadcn/ui components
    hooks/
      use-role.ts       — Hook لقراءة دور المستخدم من JWT (canEdit, canDelete, canImport)
    lib/
      auth.ts           — Auth interceptor
lib/
  api-spec/openapi.yaml — OpenAPI specification
  api-client-react/     — Generated React hooks
  api-zod/              — Generated Zod schemas
```
