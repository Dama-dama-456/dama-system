# دليل نشر نظام داما القابضة على الإنترنت

## المطلوب لنشر الموقع بشكل مستقل نهائياً

| الشيء | التكلفة | الرابط |
|-------|---------|--------|
| سيرفر سحابي (Hetzner CX22) | ~20 ريال/شهر | https://hetzner.com |
| قاعدة البيانات MongoDB Atlas | مجاني | جاهزة بالفعل ✓ |
| نطاق `system.dama-business.com` | لديك بالفعل ✓ | GoDaddy |

---

## الخطوة 1 — شراء سيرفر من Hetzner

1. ادخل https://hetzner.com وأنشئ حساباً
2. اضغط **Cloud** ← **New Server**
3. اختر هذه الإعدادات:
   - **Location:** Nuremberg أو Helsinki
   - **Image:** Ubuntu 22.04
   - **Type:** CX22 (2 CPU, 4GB RAM)
4. أضف **SSH Key** أو اختر **Password** للدخول
5. اضغط **Create & Buy** — ستحصل على **عنوان IP** مثل `49.12.100.200`

---

## الخطوة 2 — ربط النطاق بالسيرفر (GoDaddy)

1. ادخل GoDaddy ← **DNS** بجانب `dama-business.com`
2. أضف سجل جديد:

| الحقل | القيمة |
|-------|--------|
| Type | A |
| Name | system |
| Value | عنوان IP السيرفر |
| TTL | 600 |

3. احفظ — انتظر 30 دقيقة للانتشار

---

## الخطوة 3 — تثبيت Docker على السيرفر

اتصل بالسيرفر عبر **SSH**:
```bash
ssh root@49.12.100.200
```

ثم شغّل هذه الأوامر بالترتيب:
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y git
```

---

## الخطوة 4 — رفع المشروع على السيرفر

من جهازك الشخصي، ارفع الملف المضغوط:
```bash
scp dama-project.tar.gz root@49.12.100.200:/root/
```

ثم على السيرفر:
```bash
cd /root
tar -xzf dama-project.tar.gz
cd workspace
```

---

## الخطوة 5 — إعداد متغيرات البيئة

على السيرفر، أنشئ ملف `.env`:
```bash
nano .env
```

أضف هذا المحتوى (غيّر القيم بين `< >`):
```env
MONGODB_URI=mongodb+srv://dama_db_user:@dama.yvvpv1.mongodb.net/?appName=dama
MONGODB_PASS=apJnvbtjcg9pSzqc
SESSION_SECRET=dama_holding_super_secret_2024_very_long_key
APP_PORT=80
```

احفظ بـ `Ctrl+X` ثم `Y` ثم `Enter`

---

## الخطوة 6 — تشغيل النظام

```bash
docker compose --env-file .env up -d --build
```

> سيستغرق **10-20 دقيقة** في المرة الأولى
> بعدها سيعمل تلقائياً حتى عند إعادة تشغيل السيرفر

---

## الخطوة 7 — تفعيل HTTPS (اختياري لكن مهم للأمان)

```bash
apt install -y certbot
certbot certonly --standalone -d system.dama-business.com
```

ثم عدّل `nginx.conf` لتفعيل SSL.

---

## الدخول على النظام

بعد انتهاء البناء، ادخل على:
```
http://system.dama-business.com
```

بيانات الدخول:
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `Admin@123`

---

## أوامر مفيدة

| الأمر | الوصف |
|-------|-------|
| `docker compose ps` | حالة الخدمات |
| `docker compose logs api` | سجلات الـ API |
| `docker compose restart` | إعادة التشغيل |
| `docker compose down` | إيقاف النظام |
| `docker compose up -d` | تشغيل النظام |

---

## النسخ الاحتياطي (مهم)

قاعدة البيانات على MongoDB Atlas سحابية ومحفوظة تلقائياً.
للنسخ الاحتياطي اليدوي ادخل على:
https://cloud.mongodb.com ← **Backup**
