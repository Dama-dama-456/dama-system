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
  useGetConsultants, useCreateConsultant, useUpdateConsultant, useDeleteConsultant,
  getGetConsultantsQueryKey, ConsultantInput, Consultant
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const ACADEMIC_RANKS = ["بكالوريوس", "ماجستير", "دكتوراه"];
const AVAILABILITY_OPTIONS = [
  { value: "available", label: "متاح" },
  { value: "busy",      label: "مشغول" },
  { value: "inactive",  label: "غير نشط" },
];
const avLabel = (v: string) => AVAILABILITY_OPTIONS.find(o => o.value === v)?.label ?? v;
const avColor = (v: string) => {
  if (v === "available") return "bg-green-100 text-green-800";
  if (v === "busy")      return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-600";
};

const EMPTY: ConsultantInput = {
  fullName: "", nationalId: "", email: "", phoneNumber: "",
  specialty: "", academicRank: "", availability: "available", consultingField: "",
};

export default function Consultants() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: consultants, isLoading } = useGetConsultants();
  const createConsultant = useCreateConsultant();
  const updateConsultant = useUpdateConsultant();
  const deleteConsultant = useDeleteConsultant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConsultantInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<ConsultantInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (consultants ?? []).filter(c =>
    [c.fullName, c.nationalId, c.email, c.phoneNumber, c.specialty, c.consultingField, c.academicRank]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (c: Consultant) => {
    setFormData({
      fullName: c.fullName || "", nationalId: c.nationalId || "",
      email: c.email || "", phoneNumber: c.phoneNumber || "",
      specialty: c.specialty || "", academicRank: c.academicRank || "",
      availability: c.availability || "available", consultingField: c.consultingField || "",
    });
    setEditingId(c._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateConsultant.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetConsultantsQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createConsultant.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetConsultantsQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteConsultant.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetConsultantsQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة المستشارين</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="consultants" entityLabel="المستشارين" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetConsultantsQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة مستشار</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات مستشار" : "إضافة مستشار جديد"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>الاسم الكامل <span className="text-destructive">*</span></Label>
                      <Input required value={formData.fullName} onChange={e => set({ fullName: e.target.value })} placeholder="أدخل الاسم الكامل" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم الهوية <span className="text-destructive">*</span></Label>
                      <Input required value={formData.nationalId} onChange={e => set({ nationalId: e.target.value })} dir="ltr" className="text-right" placeholder="10 أرقام" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>البريد الإلكتروني <span className="text-destructive">*</span></Label>
                      <Input required type="email" value={formData.email} onChange={e => set({ email: e.target.value })} dir="ltr" className="text-right" placeholder="example@domain.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الهاتف</Label>
                      <Input value={formData.phoneNumber} onChange={e => set({ phoneNumber: e.target.value })} dir="ltr" className="text-right" placeholder="05xxxxxxxx" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>التخصص</Label>
                      <Input value={formData.specialty} onChange={e => set({ specialty: e.target.value })} placeholder="مثال: هندسة برمجيات" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الدرجة العلمية <span className="text-destructive">*</span></Label>
                      <Select value={formData.academicRank || ""} onValueChange={v => set({ academicRank: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر الدرجة العلمية" /></SelectTrigger>
                        <SelectContent>{ACADEMIC_RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>المجال الاستشاري</Label>
                      <Input value={formData.consultingField} onChange={e => set({ consultingField: e.target.value })} placeholder="مثال: استشارات مالية" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>التوافر</Label>
                      <Select value={formData.availability || "available"} onValueChange={v => set({ availability: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AVAILABILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createConsultant.isPending || updateConsultant.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في المستشارين..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم الكامل</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>الدرجة العلمية</TableHead>
                <TableHead>المجال الاستشاري</TableHead>
                <TableHead>التوافر</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد مستشارين"}</TableCell></TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.specialty}</TableCell>
                    <TableCell>{c.academicRank}</TableCell>
                    <TableCell>{c.consultingField}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${avColor(c.availability || "")}`}>
                        {avLabel(c.availability || "")}
                      </span>
                    </TableCell>
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
