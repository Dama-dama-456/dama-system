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
  useGetEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  getGetEmployeesQueryKey,
  EmployeeInput,
  Employee
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ImportExcel } from "@/components/import-excel";
import { useRole } from "@/hooks/use-role";

const DEPARTMENTS = ["الوحدة التشغيلية","الموارد البشرية","اتصال مؤسسي","المالية","التسويق","إعلام"];

const STATUS_OPTIONS = [
  { value: "active",     label: "نشط" },
  { value: "on_leave",   label: "إجازة" },
  { value: "resigned",   label: "استقالة" },
  { value: "terminated", label: "إنهاء خدمة" },
];
const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
const statusColor = (s: string) => {
  if (s === "active")     return "bg-green-100 text-green-800";
  if (s === "on_leave")   return "bg-yellow-100 text-yellow-800";
  if (s === "resigned")   return "bg-gray-100 text-gray-600";
  if (s === "terminated") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-600";
};

const EMPTY: EmployeeInput = {
  fullName: "", nationalId: "", email: "", phoneNumber: "",
  position: "", department: "", dateOfJoining: "", salary: 0, status: "active",
};

export default function Employees() {
  const { canEdit, canDelete, canImport } = useRole();
  const { data: employees, isLoading } = useGetEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeInput>(EMPTY);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<EmployeeInput>) => setFormData(f => ({ ...f, ...patch }));

  const filtered = (employees ?? []).filter(e =>
    [e.fullName, e.nationalId, e.email, e.phoneNumber, e.position, e.department]
      .some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) { setFormData(EMPTY); setEditingId(null); }
  };

  const handleEdit = (emp: Employee) => {
    setFormData({
      fullName: emp.fullName || "",
      nationalId: emp.nationalId || "",
      email: emp.email || "",
      phoneNumber: emp.phoneNumber || "",
      position: emp.position || "",
      department: emp.department || "",
      dateOfJoining: emp.dateOfJoining || "",
      salary: emp.salary || 0,
      status: emp.status || "active",
    });
    setEditingId(emp._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateEmployee.mutate({ id: editingId, data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() }); setIsOpen(false); toast({ title: "تم التحديث بنجاح" }); },
      });
    } else {
      createEmployee.mutate({ data: formData }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() }); setIsOpen(false); toast({ title: "تمت الإضافة بنجاح" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteEmployee.mutate({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() }); toast({ title: "تم الحذف بنجاح" }); },
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة الموظفين</h2>
          <div className="flex items-center gap-2">
            <ImportExcel entity="employees" entityLabel="الموظفين" canImport={canImport}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() })} />
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
              {canEdit && <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة موظف</Button></DialogTrigger>}
              <DialogContent className="sm:max-w-[540px]" dir="rtl">
                <DialogHeader><DialogTitle>{editingId ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>الاسم الكامل <span className="text-destructive">*</span></Label>
                      <Input required value={formData.fullName} onChange={e => set({ fullName: e.target.value })} placeholder="أدخل الاسم الكامل" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم الهوية <span className="text-destructive">*</span></Label>
                      <Input required value={formData.nationalId} onChange={e => set({ nationalId: e.target.value })} placeholder="10 أرقام" dir="ltr" className="text-right" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>البريد الإلكتروني</Label>
                      <Input type="email" value={formData.email} onChange={e => set({ email: e.target.value })} placeholder="example@domain.com" dir="ltr" className="text-right" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الهاتف</Label>
                      <Input value={formData.phoneNumber} onChange={e => set({ phoneNumber: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" className="text-right" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>المسمى الوظيفي</Label>
                      <Input value={formData.position} onChange={e => set({ position: e.target.value })} placeholder="مثال: مدير قسم" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>القسم</Label>
                      <Select value={formData.department || ""} onValueChange={v => set({ department: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                        <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>تاريخ التعيين</Label>
                      <Input type="date" value={formData.dateOfJoining} onChange={e => set({ dateOfJoining: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الراتب</Label>
                      <Input type="number" min={0} value={formData.salary || ""} onChange={e => set({ salary: Number(e.target.value) })} placeholder="0" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>الحالة</Label>
                      <Select value={formData.status || "active"} onValueChange={v => set({ status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>حفظ</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-2 border rounded-md px-3 bg-background max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input placeholder="بحث في الموظفين..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 p-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent" />
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم الكامل</TableHead>
                <TableHead>المسمى الوظيفي</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{search ? "لا توجد نتائج مطابقة" : "لا يوجد موظفين"}</TableCell></TableRow>
              ) : (
                filtered.map(emp => (
                  <TableRow key={emp._id}>
                    <TableCell className="font-medium">{emp.fullName}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell dir="ltr" className="text-right">{emp.phoneNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(emp.status || "")}`}>
                        {statusLabel(emp.status || "")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}><Pencil className="h-4 w-4" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" onClick={() => handleDelete(emp._id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
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
