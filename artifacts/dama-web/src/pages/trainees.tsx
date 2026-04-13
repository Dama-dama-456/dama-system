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
  useGetTrainees, useCreateTrainee, useUpdateTrainee, useDeleteTrainee,
  getGetTraineesQueryKey, TraineeInput, Trainee
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const DEPARTMENTS   = ["الوحدة التشغيلية","الموارد البشرية","اتصال مؤسسي","المالية","التسويق","إعلام"];
const TRAINING_TYPES = ["صيفي","تعاوني","برنامج خريجين","تمهير","تدريب داما"];

const EMPTY: TraineeInput = {
  fullName: "", email: "", phoneNumber: "",
  university: "", major: "", trainingType: "",
  startDate: "", endDate: "", department: "",
};

export default function Trainees() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: trainees, isLoading } = useGetTrainees();
  const createTrainee = useCreateTrainee();
  const updateTrainee = useUpdateTrainee();
  const deleteTrainee = useDeleteTrainee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TraineeInput>(EMPTY);
  const [search, setSearch] = useState("");
  const [dateError, setDateError] = useState("");

  const set = (patch: Partial<TraineeInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (trainees ?? []).filter(t =>
    [t.fullName, t.email, t.phoneNumber, t.university, t.major, t.trainingType, t.department]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); setDateError(""); }
  };

  const handleEdit = (t: Trainee) => {
    setFormData({
      fullName: t.fullName || "", email: t.email || "", phoneNumber: t.phoneNumber || "",
      university: t.university || "", major: t.major || "", trainingType: t.trainingType || "",
      startDate: t.startDate || "", endDate: t.endDate || "", department: t.department || "",
    });
    setEditingId(t._id);
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
      updateTrainee.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTraineesQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createTrainee.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTraineesQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteTrainee.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTraineesQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة المتدربين</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="trainees" entityLabel="المتدربين" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetTraineesQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة متدرب</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات متدرب" : "إضافة متدرب جديد"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>الاسم الكامل <span className="text-destructive">*</span></Label>
                      <Input required value={formData.fullName} onChange={e => set({ fullName: e.target.value })} placeholder="أدخل الاسم الكامل" />
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
                      <Label>الجامعة <span className="text-destructive">*</span></Label>
                      <Input required value={formData.university} onChange={e => set({ university: e.target.value })} placeholder="اسم الجامعة" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>التخصص</Label>
                      <Input value={formData.major} onChange={e => set({ major: e.target.value })} placeholder="مثال: علوم الحاسب" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>نوع التدريب <span className="text-destructive">*</span></Label>
                      <Select value={formData.trainingType || ""} onValueChange={v => set({ trainingType: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر نوع التدريب" /></SelectTrigger>
                        <SelectContent>{TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>القسم</Label>
                      <Select value={formData.department || ""} onValueChange={v => set({ department: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                        <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>تاريخ البدء</Label>
                      <Input type="date" value={formData.startDate} onChange={e => set({ startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>تاريخ الانتهاء</Label>
                      <Input type="date" value={formData.endDate} onChange={e => set({ endDate: e.target.value })}
                        min={formData.startDate || undefined} />
                      {dateError && <p className="text-xs text-destructive">{dateError}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createTrainee.isPending || updateTrainee.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في المتدربين..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم الكامل</TableHead>
                <TableHead>الجامعة</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>نوع التدريب</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>تاريخ البدء</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد متدربين"}</TableCell></TableRow>
              ) : (
                filtered.map(t => (
                  <TableRow key={t._id}>
                    <TableCell className="font-medium">{t.fullName}</TableCell>
                    <TableCell>{t.university}</TableCell>
                    <TableCell>{t.major}</TableCell>
                    <TableCell>{t.trainingType}</TableCell>
                    <TableCell>{t.department}</TableCell>
                    <TableCell dir="ltr" className="text-right">{t.startDate ? String(t.startDate).substring(0,10) : ""}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(t._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
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
