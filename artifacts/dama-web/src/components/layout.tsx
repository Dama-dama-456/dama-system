import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  UserSquare, 
  Briefcase, 
  GraduationCap, 
  Building2, 
  Building, 
  LayoutGrid, 
  LogOut,
  FolderKanban,
  Settings
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data } = useGetMe();

  const navigation = [
    { name: "لوحة القيادة", href: "/dashboard", icon: LayoutGrid },
    { name: "الموظفين", href: "/employees", icon: Users },
    { name: "المستشارين", href: "/consultants", icon: UserSquare },
    { name: "المتدربين", href: "/trainees", icon: GraduationCap },
    { name: "الشركات", href: "/companies", icon: Building2 },
    { name: "الجهات غير الربحية", href: "/nonprofits", icon: Building },
    { name: "الشركات غير الربحية", href: "/nonprofit-companies", icon: Building2 },
    { name: "الخدمات", href: "/services", icon: Briefcase },
    { name: "المشاريع", href: "/projects", icon: FolderKanban },
  ];

  if (data?.user?.role === "admin") {
    navigation.push({ name: "المستخدمين", href: "/users", icon: Settings });
  }

  const handleLogout = () => {
    localStorage.removeItem("dama_token");
    setLocation("/login");
  };

  return (
    <div className="flex h-screen bg-muted/30">
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col border-l border-primary-border">
        <div className="h-16 flex items-center justify-center border-b border-white/10 px-6">
          <h1 className="text-xl font-bold tracking-tight">نظام داما القابضة للإدارة</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className={`ml-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-secondary-foreground" : "text-primary-foreground/60"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{data?.user?.fullName || "المستخدم"}</span>
              <span className="text-xs text-white/60">{data?.user?.role === "admin" ? "مدير النظام" : "مستخدم"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-6 bg-card border-b">
          <h2 className="text-xl font-semibold text-foreground">
            {navigation.find(n => location === n.href || location.startsWith(`${n.href}/`))?.name || "نظام الإدارة"}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}