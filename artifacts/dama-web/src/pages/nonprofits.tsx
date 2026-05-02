import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useGetNonprofits, useCreateNonprofit, useUpdateNonprofit, useDeleteNonprofit,
  getGetNonprofitsQueryKey, NonprofitInput, Nonprofit
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const EMPTY: NonprofitInput = {
  establishmentName: "", licenseNumber: "", sector: "",
  address: "", website: "", contactPhone: "", contactEmail: "",
};


export default function Nonprofits() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: nonprofits, isLoading } = useGetNonprofits();
  const createNonprofit = useCreateNonprofit();
  const updateNonprofit = useUpdateNonprofit();
  const deleteNonprofit = useDeleteNonprofit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NonprofitInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<NonprofitInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (nonprofits ?? []).filter(n =>
    [n.establishmentName, n.licenseNumber, n.sector, n.address, n.contactPhone]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (n: Nonprofit) => {
    setFormData({
      establishmentName: n.establishmentName || "", licenseNumber: n.licenseNumber || "",
      sector: n.sector || "", address: n.address || "",
      website: n.website || "", contactPhone: n.contactPhone || "", contactEmail: n.contactEmail || "",
    });
    setEditingId(n._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateNonprofit.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitsQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createNonprofit.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitsQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteNonprofit.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitsQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">الجهات غير الربحية</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="nonprofits" entityLabel="الجهات غير الربحية" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetNonprofitsQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة جهة</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات جهة" : "إضافة جهة جديدة"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label>اسم المنشأة <span className="text-destructive">*</span></Label>
                      <Input required value={formData.establishmentName} onChange={e => set({ establishmentName: e.target.value })} placeholder="الاسم الرسمي للجهة" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم الترخيص</Label>
                      <Input value={formData.licenseNumber} onChange={e => set({ licenseNumber: e.target.value })} dir="ltr" className="text-right" placeholder="رقم الترخيص" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>القطاع</Label>
                      <Input value={formData.sector} onChange={e => set({ sector: e.target.value })} placeholder="مثال: خيري / تعليمي" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>العنوان</Label>
                      <Input value={formData.address} onChange={e => set({ address: e.target.value })} placeholder="العنوان التفصيلي" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الهاتف</Label>
                      <Input value={formData.contactPhone} onChange={e => set({ contactPhone: e.target.value })} dir="ltr" className="text-right" placeholder="05xxxxxxxx" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الموقع الإلكتروني</Label>
                      <Input value={formData.website} onChange={e => set({ website: e.target.value })} dir="ltr" className="text-right" placeholder="www.example.org" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>البريد الإلكتروني</Label>
                      <Input type="email" value={formData.contactEmail} onChange={e => set({ contactEmail: e.target.value })} dir="ltr" className="text-right" placeholder="info@example.org" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createNonprofit.isPending || updateNonprofit.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في الجهات..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المنشأة</TableHead>
                <TableHead>رقم الترخيص</TableHead>
                <TableHead>القطاع</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد جهات"}</TableCell></TableRow>
              ) : (
                filtered.map(n => (
                  <TableRow key={n._id}>
                    <TableCell className="font-medium">{n.establishmentName}</TableCell>
                    <TableCell dir="ltr" className="text-right">{n.licenseNumber}</TableCell>
                    <TableCell>{n.sector}</TableCell>
                    <TableCell>{n.address}</TableCell>
                    <TableCell dir="ltr" className="text-right">{n.contactPhone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(n)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(n._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
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