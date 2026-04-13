import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetServices, useCreateService, useUpdateService, useDeleteService,
  getGetServicesQueryKey, ServiceInput, Service
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const EMPTY: ServiceInput = {
  serviceName: "", serviceCategory: "", description: "", basePrice: 0, isActive: true,
};

export default function Services() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: services, isLoading } = useGetServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<ServiceInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (services ?? []).filter(s =>
    [s.serviceName, s.serviceCategory, s.description]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (s: Service) => {
    setFormData({
      serviceName: s.serviceName || "", serviceCategory: s.serviceCategory || "",
      description: s.description || "", basePrice: s.basePrice || 0, isActive: s.isActive ?? true,
    });
    setEditingId(s._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateService.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createService.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteService.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة الخدمات</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="services" entityLabel="الخدمات" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetServicesQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة خدمة</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات خدمة" : "إضافة خدمة جديدة"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>اسم الخدمة <span className="text-destructive">*</span></Label>
                    <Input required value={formData.serviceName} onChange={e => set({ serviceName: e.target.value })} placeholder="اسم الخدمة" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>فئة الخدمة</Label>
                    <Input value={formData.serviceCategory} onChange={e => set({ serviceCategory: e.target.value })} placeholder="مثال: استشارات / تدريب / تطوير" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الوصف</Label>
                    <Input value={formData.description} onChange={e => set({ description: e.target.value })} placeholder="وصف مختصر للخدمة" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>السعر الأساسي</Label>
                    <Input type="number" min={0} value={formData.basePrice || ""} onChange={e => set({ basePrice: Number(e.target.value) })} placeholder="0" />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch checked={formData.isActive} onCheckedChange={v => set({ isActive: v })} />
                    <Label className="cursor-pointer">{formData.isActive ? "نشطة" : "غير نشطة"}</Label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createService.isPending || updateService.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في الخدمات..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الخدمة</TableHead>
                <TableHead>فئة الخدمة</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>السعر الأساسي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد خدمات"}</TableCell></TableRow>
              ) : (
                filtered.map(s => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.serviceName}</TableCell>
                    <TableCell>{s.serviceCategory}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.description}</TableCell>
                    <TableCell>{s.basePrice ? s.basePrice.toLocaleString("ar-SA") : "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {s.isActive ? "نشطة" : "غير نشطة"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(s._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
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
