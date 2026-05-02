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
  useGetNonprofitCompanies, useCreateNonprofitCompany, useUpdateNonprofitCompany, useDeleteNonprofitCompany,
  getGetNonprofitCompaniesQueryKey, NonprofitCompanyInput, NonprofitCompany
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const CONTRACT_STATUSES = ["ساري المفعول","منتهي","لا يوجد"];

const EMPTY: NonprofitCompanyInput = {
  companyName: "", crNumber: "", industry: "",
  contractStatus: "", address: "", contactPhone: "", contactEmail: "",
};

export default function NonprofitCompanies() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: companies, isLoading } = useGetNonprofitCompanies();
  const createCompany = useCreateNonprofitCompany();
  const updateCompany = useUpdateNonprofitCompany();
  const deleteCompany = useDeleteNonprofitCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NonprofitCompanyInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<NonprofitCompanyInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (companies ?? []).filter(c =>
    [c.companyName, c.crNumber, c.industry, c.address, c.contactPhone, c.contactEmail, c.contractStatus]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (c: NonprofitCompany) => {
    setFormData({
      companyName: c.companyName || "", crNumber: c.crNumber || "",
      industry: c.industry || "",
      contractStatus: c.contractStatus || "",
      address: c.address || "", contactPhone: c.contactPhone || "", contactEmail: c.contactEmail || "",
    });
    setEditingId(c._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateCompany.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitCompaniesQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createCompany.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitCompaniesQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteCompany.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetNonprofitCompaniesQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">الشركات غير الربحية</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="nonprofit-companies" entityLabel="الشركات غير الربحية" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetNonprofitCompaniesQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة شركة</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات شركة" : "إضافة شركة غير ربحية جديدة"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>اسم الشركة <span className="text-destructive">*</span></Label>
                      <Input required value={formData.companyName} onChange={e => set({ companyName: e.target.value })} placeholder="الاسم الرسمي للشركة" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم السجل التجاري <span className="text-destructive">*</span></Label>
                      <Input required value={formData.crNumber} onChange={e => set({ crNumber: e.target.value })} dir="ltr" className="text-right" placeholder="xxxxxxxxxx" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>القطاع</Label>
                      <Input value={formData.industry} onChange={e => set({ industry: e.target.value })} placeholder="مثال: تقنية المعلومات" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>حالة العقد</Label>
                      <Select value={formData.contractStatus || ""} onValueChange={v => set({ contractStatus: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر حالة العقد" /></SelectTrigger>
                        <SelectContent>{CONTRACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
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
                      <Label>البريد الإلكتروني</Label>
                      <Input type="email" value={formData.contactEmail} onChange={e => set({ contactEmail: e.target.value })} dir="ltr" className="text-right" placeholder="info@company.com" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في الشركات غير الربحية..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الشركة</TableHead>
                <TableHead>رقم السجل التجاري</TableHead>
                <TableHead>القطاع</TableHead>
                <TableHead>حالة العقد</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد شركات غير ربحية"}</TableCell></TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.companyName}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.crNumber}</TableCell>
                    <TableCell>{c.industry}</TableCell>
                    <TableCell>{c.contractStatus}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.contactPhone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(c._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
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