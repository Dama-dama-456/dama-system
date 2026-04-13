import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserSquare, Briefcase, GraduationCap,
  Building2, Building, FolderKanban, Activity, Database,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── helpers ──────────────────────────────────────────────────────────────────

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const empStatusLabel: Record<string, string> = {
  active: "نشط", on_leave: "إجازة", resigned: "استقالة", terminated: "إنهاء خدمة",
};
const empStatusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800", on_leave: "bg-yellow-100 text-yellow-800",
  resigned: "bg-gray-100 text-gray-600", terminated: "bg-red-100 text-red-800",
};
const projStatusLabel: Record<string, string> = {
  planned: "مخطط", active: "قيد التنفيذ", completed: "مكتمل", suspended: "معلق",
};
const projStatusColor: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800", active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-700", suspended: "bg-yellow-100 text-yellow-800",
};
const avLabel: Record<string, string> = { available: "متاح", busy: "مشغول", inactive: "غير نشط" };
const avColor: Record<string, string> = {
  available: "bg-green-100 text-green-800", busy: "bg-yellow-100 text-yellow-800", inactive: "bg-gray-100 text-gray-600",
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const statCards = [
    {
      title: "الموظفين",
      value: stats?.employees,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
      sub: `${stats?.activeEmployees || 0} نشط`,
    },
    {
      title: "المستشارين",
      value: stats?.consultants,
      icon: UserSquare,
      color: "text-purple-600 bg-purple-50",
      sub: `${stats?.availableConsultants || 0} متاح`,
    },
    {
      title: "المتدربين",
      value: stats?.trainees,
      icon: GraduationCap,
      color: "text-orange-600 bg-orange-50",
    },
    {
      title: "الشركات",
      value: stats?.companies,
      icon: Building2,
      color: "text-green-600 bg-green-50",
    },
    {
      title: "الجهات غير الربحية",
      value: stats?.nonprofits,
      icon: Building,
      color: "text-teal-600 bg-teal-50",
    },
    {
      title: "الخدمات",
      value: stats?.services,
      icon: Briefcase,
      color: "text-indigo-600 bg-indigo-50",
      sub: `${stats?.activeServices || 0} نشطة`,
    },
    {
      title: "المشاريع",
      value: stats?.projects,
      icon: FolderKanban,
      color: "text-rose-600 bg-rose-50",
      sub: `${stats?.activeProjects || 0} قيد التنفيذ`,
    },
  ];

  const isAdmin = (() => {
    try {
      const token = localStorage.getItem("dama_token");
      if (!token) return false;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role === "admin";
    } catch { return false; }
  })();

  const handleSeedData = async () => {
    if (!confirm("سيتم إضافة بيانات تجريبية للاختبار. هل تريد المتابعة؟")) return;
    setSeeding(true);
    try {
      const token = localStorage.getItem("dama_token");
      const res = await fetch(`${BASE}/api/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: "فشل الإضافة", description: data.message, variant: "destructive" }); return; }
      toast({ title: "تمت إضافة بيانات الاختبار" });
      queryClient.invalidateQueries();
    } catch {
      toast({ title: "خطأ في الشبكة", variant: "destructive" });
    } finally { setSeeding(false); }
  };

  const empTotal = stats?.employees || 0;
  const projTotal = stats?.projects || 0;
  const conTotal  = stats?.consultants || 0;

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">لوحة التحكم</h2>
            <p className="text-muted-foreground text-sm mt-1">نظرة عامة على جميع بيانات النظام</p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleSeedData} disabled={seeding} className="gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              {seeding ? "جاري الإضافة..." : "إضافة بيانات تجريبية"}
            </Button>
          )}
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </CardHeader>
                  <CardContent><Skeleton className="h-8 w-1/3 mb-2" /><Skeleton className="h-3 w-1/2" /></CardContent>
                </Card>
              ))
            : statCards.map((s, i) => (
                <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                    <div className={`p-2 rounded-md ${s.color}`}><s.icon className="h-4 w-4" /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{s.value ?? 0}</div>
                    {s.sub && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" />{s.sub}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
          }
        </div>

        {/* ── Distribution Row ──────────────────────────────────────────────── */}
        {!isLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Employee status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" /> توزيع حالات الموظفين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <StatusBar label="نشط"         value={stats.activeEmployees    || 0} total={empTotal} color="bg-green-500" />
                <StatusBar label="إجازة"        value={stats.onLeaveEmployees   || 0} total={empTotal} color="bg-yellow-400" />
                <StatusBar label="استقالة"      value={stats.resignedEmployees  || 0} total={empTotal} color="bg-gray-400" />
                <StatusBar label="إنهاء خدمة"  value={stats.terminatedEmployees|| 0} total={empTotal} color="bg-red-400" />
              </CardContent>
            </Card>

            {/* Project status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-rose-600" /> توزيع حالات المشاريع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <StatusBar label="قيد التنفيذ"  value={stats.activeProjects    || 0} total={projTotal} color="bg-green-500" />
                <StatusBar label="مخطط"         value={stats.plannedProjects   || 0} total={projTotal} color="bg-blue-400" />
                <StatusBar label="مكتمل"        value={stats.completedProjects || 0} total={projTotal} color="bg-gray-400" />
                <StatusBar label="معلق"         value={stats.suspendedProjects || 0} total={projTotal} color="bg-yellow-400" />
              </CardContent>
            </Card>

            {/* Consultant availability */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserSquare className="h-4 w-4 text-purple-600" /> توافر المستشارين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <StatusBar label="متاح"    value={stats.availableConsultants || 0} total={conTotal} color="bg-green-500" />
                <StatusBar label="مشغول"   value={stats.busyConsultants      || 0} total={conTotal} color="bg-yellow-400" />
                <StatusBar label="غير نشط" value={stats.inactiveConsultants  || 0} total={conTotal} color="bg-gray-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Recent Data Tables ────────────────────────────────────────────── */}
        {!isLoading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Recent Employees */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" /> أحدث الموظفين المضافين
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(stats.recentEmployees as any[])?.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">لا يوجد بيانات</p>
                ) : (
                  <div className="divide-y">
                    {(stats.recentEmployees as any[])?.map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{e.fullName}</p>
                          <p className="text-xs text-muted-foreground">{e.position || "—"} · {e.department || "—"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${empStatusColor[e.status] || "bg-gray-100 text-gray-600"}`}>
                          {empStatusLabel[e.status] || e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-rose-600" /> أحدث المشاريع المضافة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(stats.recentProjects as any[])?.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">لا يوجد بيانات</p>
                ) : (
                  <div className="divide-y">
                    {(stats.recentProjects as any[])?.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{p.projectName}</p>
                          <p className="text-xs text-muted-foreground">{p.companyName || "—"} · {p.serviceName || "—"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${projStatusColor[p.status] || "bg-gray-100 text-gray-600"}`}>
                          {projStatusLabel[p.status] || p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Consultants */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserSquare className="h-4 w-4 text-purple-600" /> أحدث المستشارين المضافين
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(stats.recentConsultants as any[])?.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">لا يوجد بيانات</p>
                ) : (
                  <div className="divide-y">
                    {(stats.recentConsultants as any[])?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground">{c.specialty || "—"} · {c.academicRank || "—"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${avColor[c.availability] || "bg-gray-100 text-gray-600"}`}>
                          {avLabel[c.availability] || c.availability}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Training types */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-orange-600" /> أنواع التدريب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1">
                {(stats.trainingTypes as any[])?.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">لا يوجد بيانات</p>
                ) : (
                  (stats.trainingTypes as any[])?.map((t: any, i: number) => (
                    <StatusBar
                      key={i}
                      label={t.type}
                      value={t.count}
                      total={stats.trainees || 1}
                      color={["bg-orange-400","bg-amber-400","bg-yellow-400","bg-lime-400"][i % 4]}
                    />
                  ))
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {/* Skeleton for tables */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-4 w-1/3" /></CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <div className="space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
