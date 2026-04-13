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
  useGetCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  getGetCompaniesQueryKey, CompanyInput, Company
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const COMPANY_SIZES = ["ناشئة","صغيرة","متوسطة","كبيرة","مؤسسة"];

const EMPTY: CompanyInput = {
  companyName: "", crNumber: "", industry: "",
  companySize: "", address: "", contactPhone: "", contactEmail: "",
};

export default function Companies() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: companies, isLoading } = useGetCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<CompanyInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (companies ?? []).filter(c =>
    [c.companyName, c.crNumber, c.industry, c.address, c.contactPhone, c.contactEmail, c.companySize]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (c: Company) => {
    setFormData({
      companyName: c.companyName || "", crNumber: c.crNumber || "",
      industry: c.industry || "", companySize: c.companySize || "",
      address: c.address || "", contactPhone: c.contactPhone || "", contactEmail: c.contactEmail || "",
    });
    setEditingId(c._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateCompany.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createCompany.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteCompany.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة الشركات</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="companies" entityLabel="الشركات" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة شركة</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات شركة" : "إضافة شركة جديدة"}</DialogTitle></DialogHeader>
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
                      <Label>حجم الشركة</Label>
                      <Select value={formData.companySize || ""} onValueChange={v => set({ companySize: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر حجم الشركة" /></SelectTrigger>
                        <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
          <Input placeholder="بحث في الشركات..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الشركة</TableHead>
                <TableHead>رقم السجل التجاري</TableHead>
                <TableHead>القطاع</TableHead>
                <TableHead>حجم الشركة</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد شركات"}</TableCell></TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.companyName}</TableCell>
                    <TableCell dir="ltr" className="text-right">{c.crNumber}</TableCell>
                    <TableCell>{c.industry}</TableCell>
                    <TableCell>{c.companySize}</TableCell>
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
