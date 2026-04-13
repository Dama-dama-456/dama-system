import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser,
  useGetMe,
  getGetUsersQueryKey,
  UserInput,
  User
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Users() {
  const { data: meData } = useGetMe();
  const isAdmin = meData?.user?.role === "admin";
  
  const { data: users, isLoading } = useGetUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UserInput>({
    username: "",
    fullName: "",
    email: "",
    password: "",
    role: "viewer",
    isActive: true
  });

  const resetForm = () => {
    setFormData({
      username: "",
      fullName: "",
      email: "",
      password: "",
      role: "viewer",
      isActive: true
    });
    setEditingId(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username || "",
      fullName: user.fullName || "",
      email: user.email || "",
      password: "", // never show password, only send if changed
      role: user.role || "viewer",
      isActive: user.isActive ?? true
    });
    setEditingId(user._id);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateUser.mutate({ id: editingId, data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsOpen(false);
          toast({ title: "تم التحديث بنجاح" });
        }
      });
    } else {
      createUser.mutate({ data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsOpen(false);
          toast({ title: "تمت الإضافة بنجاح" });
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      deleteUser.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">غير مصرح لك بالوصول لهذه الصفحة</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h2>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button><Plus className="ml-2 h-4 w-4" /> إضافة مستخدم</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "تعديل بيانات مستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم</Label>
                  <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور {editingId && <span className="text-xs text-muted-foreground">(اتركه فارغاً لعدم التغيير)</span>}</Label>
                  <Input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>الصلاحية</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصلاحية..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                      <SelectItem value="manager">مدير</SelectItem>
                      <SelectItem value="viewer">مستعرض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse pt-2">
                  <Switch 
                    checked={formData.isActive} 
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} 
                  />
                  <Label>حساب مفعل</Label>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>حفظ</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الصلاحية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[100px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">جاري التحميل...</TableCell></TableRow>
              ) : users?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell dir="ltr" className="text-right">{u.username}</TableCell>
                    <TableCell>
                      {u.role === 'admin' ? 'مدير نظام' : u.role === 'manager' ? 'مدير' : 'مستعرض'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {u.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(u._id)} className="text-destructive" disabled={meData?.user?.id === u._id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
