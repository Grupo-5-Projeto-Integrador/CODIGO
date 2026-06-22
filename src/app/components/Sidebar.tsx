import { useState } from "react";
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Store,
  GraduationCap,
  Shield,
  Wrench,
  AlertTriangle,
  Megaphone,
  Briefcase,
  Building,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
  X,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type MenuItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  path?: string;
  subItems?: { label: string; path: string; icon: typeof Home }[];
};

const menuItems: MenuItem[] = [
  { id: "dashboard-main", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard-main" },
  { id: "lojistas-main", label: "Lojistas", icon: Store, path: "/lojistas-main" },
  { id: "treinamentos", label: "Treinamentos", icon: GraduationCap, path: "/treinamentos" },
  { id: "seguros", label: "Seguros", icon: Shield, path: "/seguros" },
  { id: "manutencao", label: "Manutenção", icon: Wrench, path: "/manutencao" },
  {
    id: "sinistros",
    label: "Sinistros",
    icon: AlertTriangle,
    subItems: [
      { label: "Dashboard", path: "/dashboard", icon: Home },
      { label: "Novo Sinistro", path: "/novo-sinistro", icon: ShieldAlert },
      { label: "Histórico", path: "/historico", icon: FileText },
      { label: "Relatórios", path: "/relatorios", icon: FileSpreadsheet },
    ],
  },
  { id: "marketing", label: "Marketing", icon: Megaphone, path: "/marketing" },
  { id: "comercial", label: "Comercial", icon: Briefcase, path: "/comercial" },
  { id: "institucional", label: "Institucional", icon: Building, path: "/institucional" },
  { id: "relatorios-main", label: "Relatórios", icon: BarChart3, path: "/relatorios-main" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>("sinistros");

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className={`bg-[#8B1A1A] dark:bg-[#701515] text-white flex flex-col h-full transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <ImageWithFallback
              src="/flamboyant-logo.png"
              alt="Flamboyant Shopping Logo"
              className="w-8 h-8 object-contain shrink-0 brightness-0 invert"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">Flamboyant</span>
              <span className="text-[10px] opacity-80">Gestão Premium</span>
            </div>
          </div>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!collapsed)}
          className="p-1 hover:bg-white/10 rounded transition-colors hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="p-1 hover:bg-white/10 rounded transition-colors lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItem === item.id;

          return (
            <div key={item.id}>
              {hasSubItems ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#A52222] dark:hover:bg-[#8B1A1A] transition-colors ${isExpanded ? "bg-[#A52222] dark:bg-[#8B1A1A]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.path || "#"}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 hover:bg-[#A52222] dark:hover:bg-[#8B1A1A] transition-colors ${isActive ? "bg-[#A52222] dark:bg-[#8B1A1A]" : ""}`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </NavLink>
              )}

              {hasSubItems && isExpanded && !collapsed && (
                <div className="bg-[#701515] dark:bg-[#5A1111]">
                  {item.subItems!.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-[#8B1A1A] dark:hover:bg-[#701515] transition-colors ${isActive ? "bg-[#8B1A1A] dark:bg-[#701515] border-l-4 border-white" : ""}`
                        }
                      >
                        <SubIcon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{subItem.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <SidebarContent collapsed={isCollapsed} />
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden flex">
            <SidebarContent collapsed={false} />
          </div>
        </>
      )}
    </>
  );
}