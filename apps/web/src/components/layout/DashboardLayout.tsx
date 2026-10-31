import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  GraduationCap,
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/DropdownMenu";
import { Drawer } from "../ui/Drawer";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../ui/Breadcrumb";
import { useAuth } from "@/context";
import logoSvg from "../../assets/logo-placeholder.svg";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  {
    label: "Formulir Pendaftaran",
    href: "/portal/formulir",
    icon: FileText,
  },
  {
    label: "Pembayaran Biaya",
    href: "/portal/pembayaran",
    icon: CreditCard,
  },
  {
    label: "Ujian Seleksi Online",
    href: "/portal/ujian",
    icon: GraduationCap,
  },
  {
    label: "Status Kelulusan",
    href: "/portal/hasil",
    icon: CheckCircle2,
  },
  { label: "Unggah Dokumen", href: "/portal/berkas", icon: FolderOpen },
];

export interface DashboardLayoutProps {
  children?: React.ReactNode;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  navItems?: NavItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userRole,
  userName,
  userEmail,
  navItems = DASHBOARD_NAV_ITEMS,
}) => {
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const resolvedRole =
    userRole ||
    (user?.role === "admin"
      ? "Admin PMB"
      : user?.role === "keuangan"
        ? "Staf Keuangan"
        : user?.role === "penguji"
          ? "Penguji CBT"
          : "Calon Mahasiswa");

  const resolvedName = userName || user?.nama_lengkap || "Calon Mahasiswa";
  const resolvedEmail = userEmail || user?.email || "pmb@pignatelli.ac.id";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const currentNavItem = navItems.find((item) =>
    item.href === "/portal/dashboard"
      ? location.pathname === "/portal/dashboard"
      : location.pathname.startsWith(item.href),
  );

  const navContent = (onSelect?: () => void) => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-biru-800">
          <Link
            to="/portal/dashboard"
            onClick={onSelect}
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500 rounded-lg"
          >
            <img
              src={logoSvg}
              alt="Logo Universitas Pignatelli Triputra"
              className="h-10 w-auto object-contain brightness-110"
            />
          </Link>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-biru-950/70 px-2.5 py-1.5 border border-biru-800">
            <span className="h-2 w-2 rounded-full bg-biru-500 animate-pulse" />
            <span className="text-xs font-semibold text-biru-200 uppercase tracking-wider">
              {resolvedRole}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav aria-label="Menu Dashboard" className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/portal/dashboard"
                ? location.pathname === "/portal/dashboard"
                : location.pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onSelect}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-biru-800 text-putih shadow-soft-sm font-semibold"
                    : "text-biru-200 hover:bg-biru-800/60 hover:text-putih"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-biru-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-biru-700 px-2 py-0.5 text-xs text-biru-100">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Snippet */}
      <div className="p-4 border-t border-biru-800 bg-biru-950/50">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback initials={getInitials(resolvedName)} />
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-putih">
              {resolvedName}
            </p>
            <p className="truncate text-[11px] text-biru-200">
              {resolvedEmail}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-biru-50/50 text-biru-950 font-sans selection:bg-biru-100 selection:text-biru-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 bg-biru-900 border-r border-biru-800 text-putih shadow-soft-md">
        {navContent()}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <Drawer
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        side="left"
        title="Menu Navigasi"
      >
        <div className="-mx-6 -my-4 h-full bg-biru-900 text-putih">
          {navContent(() => setMobileSidebarOpen(false))}
        </div>
      </Drawer>

      {/* Right Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-biru-200 bg-putih/95 px-4 sm:px-6 backdrop-blur-md shadow-soft-sm">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-biru-200 bg-putih text-biru-900 shadow-soft-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/portal/dashboard">
                    Portal PMB
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {currentNavItem &&
                  currentNavItem.href !== "/portal/dashboard" && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{currentNavItem.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Topbar Actions */}
          <div className="flex items-center gap-3">
            {/* Notification button */}
            <button
              type="button"
              aria-label="Pemberitahuan"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-biru-200 bg-putih text-biru-800 shadow-soft-sm transition-colors hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-biru-600" />
            </button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl border border-biru-200 bg-putih p-1.5 pr-2.5 shadow-soft-sm transition-colors hover:bg-biru-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-500">
                <Avatar size="sm">
                  <AvatarFallback initials={getInitials(resolvedName)} />
                </Avatar>
                <span className="hidden md:inline-block text-xs font-semibold text-biru-950 max-w-[120px] truncate">
                  {resolvedName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-biru-700" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="right" className="w-56">
                <DropdownMenuLabel>Akun {resolvedRole}</DropdownMenuLabel>
                <div className="px-2.5 py-1 text-xs text-biru-700">
                  <p className="font-semibold text-biru-950">{resolvedName}</p>
                  <p className="truncate text-biru-600">{resolvedEmail}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/portal/dashboard")}>
                  <User className="h-4 w-4 text-biru-600" />
                  <span>Profil & Kata Sandi</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 text-biru-600" />
                  <span>Keluar dari Akun</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1200px]">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
};
