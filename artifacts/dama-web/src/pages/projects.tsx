import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetProjects, useCreateProject, useUpdateProject, useDeleteProject,
  useGetCompanies, useGetServices,
  getGetProjectsQueryKey, ProjectInput, Project, Company, Service
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const STATUS_OPTIONS = [
  { value: "planned",   label: "مخطط" },
  { value: "active",    label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "suspended", label: "معلق" },
];
const stLabel = (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label ?? v;
const stColor = (v: string) => {
  if (v === "planned")   return "bg-blue-100 text-blue-800";
  if (v === "active")    return "bg-green-100 text-green-800";
  if (v === "completed") return "bg-gray-100 text-gray-700";
  if (v === "suspended") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-600";
};

const EMPTY: ProjectInput = {
  projectName: "", companyId: "", serviceId: "", status: "active", startDate: "", endDate: "",
};

function getId(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return (v as Company | Service)._id;
}

export default function Projects() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: projects, isLoading } = useGetProjects();
  const { data: companies } = useGetCompanies();
  const { data: services } = useGetServices();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectInput>(EMPTY);
  const [search, setSearch] = useState("");
  const [dateError, setDateError] = useState("");

  const set = (patch: Partial<ProjectInput>) => setFormData(f => ({ ...f, ...patch }));

  const getCompanyName = (v: unknown) => {
    const id = getId(v);
    return companies?.find(c => c._id === id)?.companyName ?? id;
  };
  const getServiceName = (v: unknown) => {
    const id = getId(v);
    return services?.find(s => s._id === id)?.serviceName ?? id;
  };

  const filtered = (projects ?? []).filter(p => {
    const cName = getCompanyName(p.companyId);
    const sName = getServiceName(p.serviceId);
    return [p.projectName, cName, sName, stLabel(p.status || "")]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()));
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); setDateError(""); }
  };

  const handleEdit = (p: Project) => {
    setFormData({
      projectName: p.projectName || "",
      companyId: getId(p.companyId),
      serviceId: getId(p.serviceId),
      status: p.status || "active",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
    });
    setEditingId(p._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError("");
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      setDateError("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء");
      return;
    }
    if (editingId) {
      updateProject.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createProject.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteProject.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة المشاريع</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="projects" entityLabel="المشاريع" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة مشروع</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات مشروع" : "إضافة مشروع جديد"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>اسم المشروع <span className="text-destructive">*</span></Label>
                    <Input required value={formData.projectName} onChange={e => set({ projectName: e.target.value })} placeholder="اسم المشروع" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الشركة</Label>
                    <Select value={formData.companyId || ""} onValueChange={v => set({ companyId: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الشركة..." /></SelectTrigger>
                      <SelectContent>
                        {companies?.map(c => <SelectItem key={c._id} value={c._id}>{c.companyName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>الخدمة <span className="text-destructive">*</span></Label>
                    <Select value={formData.serviceId || ""} onValueChange={v => set({ serviceId: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الخدمة..." /></SelectTrigger>
                      <SelectContent>
                        {services?.map(s => <SelectItem key={s._id} value={s._id}>{s.serviceName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>الحالة</Label>
                    <Select value={formData.status || "active"} onValueChange={v => set({ status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>تاريخ البدء</Label>
                      <Input type="date" value={formData.startDate} onChange={e => set({ startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>تاريخ الانتهاء</Label>
                      <Input type="date" value={formData.endDate} onChange={e => set({ endDate: e.target.value })}
                        min={formData.startDate || undefined} />
                    </div>
                  </div>
                  {dateError && <p className="text-xs text-destructive">{dateError}</p>}
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في المشاريع..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المشروع</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ البدء</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد مشاريع"}</TableCell></TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">{p.projectName}</TableCell>
                    <TableCell>{getCompanyName(p.companyId)}</TableCell>
                    <TableCell>{getServiceName(p.serviceId)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stColor(p.status || "")}`}>
                        {stLabel(p.status || "")}
                      </span>
                    </TableCell>
                    <TableCell dir="ltr" className="text-right">{p.startDate ? String(p.startDate).substring(0,10) : "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{p.endDate ? String(p.endDate).substring(0,10) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
