import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  Bell,
  Sun,
  Moon,
  AlertTriangle,
  Server,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Sidebar } from "./Sidebar";
import { fetchNotifications, markNotificationAsRead } from "../../apiClient";

const KIND_STYLE: Record<string, { icon: typeof Bell; tagClass: string; iconClass: string }> = {
  urgente: {
    icon: AlertTriangle,
    tagClass: "bg-[#E04444]/15 text-[#E04444] border border-[#E04444]/30",
    iconClass: "text-[#E04444] bg-[#E04444]/15",
  },
  sistema: {
    icon: Server,
    tagClass: "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30",
    iconClass: "text-[#34D399] bg-[#34D399]/15",
  },
  sinistro: {
    icon: AlertTriangle,
    tagClass: "bg-[#8B1A1A]/15 text-[#8B1A1A] dark:text-[#E04444] border border-[#8B1A1A]/30 dark:border-[#E04444]/30",
    iconClass: "text-[#8B1A1A] dark:text-[#E04444] bg-[#8B1A1A]/15 dark:bg-[#E04444]/15",
  },
  documentacao: {
    icon: FileSearch,
    tagClass: "bg-[#60A5FA]/15 text-[#60A5FA] border border-[#60A5FA]/30",
    iconClass: "text-[#60A5FA] bg-[#60A5FA]/15",
  },
};

const ADMIN_USER = {
  name: "Gestor",
  city: "Goiânia",
  initials: "G",
};

export function Layout() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("jp-theme") as "light" | "dark") || "light";
  });

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNotifClick = async (n: any) => {
    setShowNotifications(false);
    try {
      await markNotificationAsRead(n.id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === n.id ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }

    if (n.claim_id) {
      navigate(`/sinistro/${n.claim_id}`);
    } else {
      navigate("/historico");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getKind = (n: any): string => {
    if (n.priority === "alta") return "urgente";
    if (n.type === "sinistro") return "sinistro";
    if (n.type === "sistema") return "sistema";
    return "documentacao";
  };

  const getTagName = (n: any): string => {
    if (n.priority === "alta") return "URGENTE";
    if (n.type === "sinistro") return "SINISTRO";
    if (n.type === "sistema") return "SISTEMA";
    return "MENSAGEM";
  };

  const formatTime = (createdAtStr: string) => {
    try {
      const date = new Date(createdAtStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Agora mesmo";
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      return `Há ${diffDays} d`;
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("jp-theme", theme);
  }, [theme]);

  return (
    <div className="flex h-screen w-full bg-[#F7F4EF] dark:bg-[#0F1117] text-gray-900 dark:text-[#F1F5F9] transition-colors">
      {/* Sidebar */}
      <Sidebar theme={theme} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white dark:bg-[#1A1F2E] border-b border-gray-200 dark:border-[#2E3447] flex items-center justify-between px-6 z-20 flex-shrink-0 transition-colors">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="https://jornaldobras.com.br/images/noticias/17126/29043715_Flamb_Prin.png.png"
              alt="Flamboyant Shopping Logo"
              className="h-9 w-auto object-contain transition-all duration-300 rounded"
              style={
                theme === "light"
                  ? { filter: "grayscale(1) brightness(0.15) contrast(1.2)" }
                  : undefined
              }
            />
            <div className="leading-tight">
              <p className="text-sm font-bold text-[#8B1A1A] dark:text-[#E04444]">JP Mall</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-[#64748B]">
                Gestão de Sinistros
              </p>
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            className="p-2 text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#242938] rounded-full transition-colors"
            title={theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#242938] rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#8B1A1A] dark:bg-[#E04444] rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-12 z-20 w-[380px] bg-white dark:bg-[#242938] border border-[#E8DCCB] dark:border-[#2E3447] rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E8DCCB] dark:border-[#2E3447] bg-[#FAF7F2] dark:bg-[#1A1F2E] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#8B1A1A] dark:text-[#F1F5F9]">
                      Notificações
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-white bg-[#8B1A1A] dark:bg-[#E04444] rounded-full px-2 py-0.5">
                        {unreadCount} não lidas
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-[#E8DCCB] dark:divide-[#2E3447] max-h-[440px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-400 dark:text-[#64748B]">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const kind = getKind(n);
                        const cfg = KIND_STYLE[kind] || KIND_STYLE.documentacao;
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`w-full text-left p-4 hover:bg-[#FAF7F2] dark:hover:bg-[#1A1F2E] transition-colors flex items-start gap-3 relative ${
                              !n.is_read ? "bg-[#8B1A1A]/5 dark:bg-[#E04444]/5 font-medium" : "opacity-75"
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`inline-block text-[10px] font-bold tracking-wider rounded px-1.5 py-0.5 ${cfg.tagClass}`}>
                                  {getTagName(n)}
                                </span>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:bg-[#E04444] shrink-0 animate-ping" />
                                )}
                              </div>
                              <p className={`text-sm mt-1 text-gray-900 dark:text-[#F1F5F9] ${!n.is_read ? "font-bold" : ""}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-[#64748B] mt-1">
                                {formatTime(n.created_at)}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/historico");
                    }}
                    className="w-full px-4 py-3 text-sm font-semibold text-[#8B1A1A] dark:text-[#E04444] hover:bg-[#FAF7F2] dark:hover:bg-[#1A1F2E] border-t border-[#E8DCCB] dark:border-[#2E3447] flex items-center justify-center gap-2"
                  >
                    Ver todas <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-200 dark:border-[#2E3447]">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">
                {ADMIN_USER.name} - {ADMIN_USER.city}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-[#64748B]">Administração</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#8B1A1A] dark:bg-[#E04444] text-white font-bold flex items-center justify-center text-sm">
              {ADMIN_USER.initials}
            </div>
          </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#F7F4EF] dark:bg-[#0F1117] transition-colors">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
