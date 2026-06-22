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
  Menu,
  CheckCheck,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Sidebar } from "./Sidebar";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";

type NotifKind = "urgente" | "sistema" | "documentacao";

const KIND_STYLE: Record<NotifKind, { icon: typeof Bell; tagClass: string; iconClass: string; tag: string }> = {
  urgente: {
    icon: AlertTriangle,
    tag: "URGENTE",
    tagClass: "bg-[#E04444]/15 text-[#E04444] border border-[#E04444]/30",
    iconClass: "text-[#E04444] bg-[#E04444]/15",
  },
  sistema: {
    icon: Server,
    tag: "SISTEMA",
    tagClass: "bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30",
    iconClass: "text-[#34D399] bg-[#34D399]/15",
  },
  documentacao: {
    icon: FileSearch,
    tag: "DOCUMENTAÇÃO",
    tagClass: "bg-[#60A5FA]/15 text-[#60A5FA] border border-[#60A5FA]/30",
    iconClass: "text-[#60A5FA] bg-[#60A5FA]/15",
  },
};

function toKind(type: string, priority: string): NotifKind {
  if (priority === "alta" || priority === "urgente") return "urgente";
  if (type === "documentacao") return "documentacao";
  return "sistema";
}

function tagLabel(type: string, priority: string): string {
  if (priority === "alta" || priority === "urgente") return "URGENTE";
  if (type === "sinistro") return "SINISTRO";
  if (type === "documentacao") return "DOCUMENTAÇÃO";
  if (type === "sistema") return "SISTEMA";
  return type.toUpperCase();
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `Há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs} h`;
  return `Há ${Math.floor(hrs / 24)} d`;
}

function userInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Layout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loading, error: notifError, fetch: fetchNotifs, markRead, markAllRead } = useNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("jp-theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("jp-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Recarrega ao abrir o painel
  useEffect(() => {
    if (showNotifications) fetchNotifs();
  }, [showNotifications, fetchNotifs]);

  // Polling a cada 60 segundos
  useEffect(() => {
    const id = setInterval(() => {
      fetchNotifs().catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  const displayName = user?.name ?? "Gestor";
  const displayCity = "Goiânia";

  const handleNotifClick = async (id: number, isRead: boolean, claimId?: string | null) => {
    setShowNotifications(false);
    if (!isRead) {
      await markRead(id).catch(() => {});
    }
    if (claimId) {
      navigate(`/sinistro/${claimId}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F4EF] dark:bg-[#0F1117] text-gray-900 dark:text-[#F1F5F9] transition-colors overflow-hidden">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 sm:h-16 bg-white dark:bg-[#1A1F2E] border-b border-gray-200 dark:border-[#2E3447] flex items-center justify-between px-3 sm:px-6 z-20 shrink-0 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#242938] rounded-lg transition-colors lg:hidden shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <ImageWithFallback
              src="/flamboyant-logo.png"
              alt="Flamboyant Shopping Logo"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-bold text-[#8B1A1A] dark:text-[#E04444]">Flamboyant</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 dark:text-[#64748B]">
                Gestão de Sinistros
              </p>
            </div>
            <p className="text-sm font-bold text-[#8B1A1A] dark:text-[#E04444] sm:hidden">Flamboyant</p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="p-2 text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#242938] rounded-full transition-colors"
              title={theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Sino de notificações */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 text-gray-500 dark:text-[#94A3B8] hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#242938] rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#8B1A1A] dark:bg-[#E04444] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-12 z-20 w-[min(380px,calc(100vw-1.5rem))] bg-white dark:bg-[#242938] border border-[#E8DCCB] dark:border-[#2E3447] rounded-2xl shadow-xl overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="px-4 py-3 border-b border-[#E8DCCB] dark:border-[#2E3447] bg-[#FAF7F2] dark:bg-[#1A1F2E] flex items-center justify-between">
                      <span className="text-sm font-bold text-[#8B1A1A] dark:text-[#F1F5F9]">Notificações</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold text-white bg-[#8B1A1A] dark:bg-[#E04444] rounded-full px-2 py-0.5">
                            {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                            title="Marcar todas como lidas"
                            className="p-1 rounded hover:bg-[#E8DCCB]/50 dark:hover:bg-[#2E3447] transition-colors"
                          >
                            <CheckCheck className="w-4 h-4 text-[#8B1A1A] dark:text-[#E04444]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista */}
                    <div className="divide-y divide-[#E8DCCB] dark:divide-[#2E3447] max-h-[60vh] overflow-y-auto">
                      {loading && notifications.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-400 dark:text-[#64748B]">
                          Carregando...
                        </div>
                      )}

                      {!loading && notifError && (
                        <div className="p-6 text-center text-sm text-red-500">
                          Erro ao carregar notificações
                        </div>
                      )}

                      {!loading && !notifError && notifications.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-400 dark:text-[#64748B]">
                          Nenhuma notificação
                        </div>
                      )}

                      {notifications.map((n) => {
                        const kind = toKind(n.type, n.priority);
                        const cfg = KIND_STYLE[kind];
                        const Icon = cfg.icon;
                        const label = tagLabel(n.type, n.priority);
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n.id, n.is_read, n.claim_id)}
                            className={`w-full text-left p-4 hover:bg-[#FAF7F2] dark:hover:bg-[#1A1F2E] transition-colors flex items-start gap-3 ${!n.is_read ? "bg-[#FAF7F2]/60 dark:bg-[#1A1F2E]/40" : ""}`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block text-[10px] font-bold tracking-wider rounded px-1.5 py-0.5 ${cfg.tagClass}`}>
                                  {label}
                                </span>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-[#8B1A1A] dark:bg-[#E04444] shrink-0" />
                                )}
                              </div>
                              <p className="text-sm font-bold text-gray-900 dark:text-[#F1F5F9] mt-1 truncate">{n.title}</p>
                              <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1 line-clamp-2">{n.message}</p>
                              {n.created_at && (
                                <p className="text-[11px] text-gray-400 dark:text-[#64748B] mt-1">
                                  {timeAgo(n.created_at)}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Rodapé */}
                    <button
                      onClick={() => { setShowNotifications(false); navigate("/historico"); }}
                      className="w-full px-4 py-3 text-sm font-semibold text-[#8B1A1A] dark:text-[#E04444] hover:bg-[#FAF7F2] dark:hover:bg-[#1A1F2E] border-t border-[#E8DCCB] dark:border-[#2E3447] flex items-center justify-center gap-2"
                    >
                      Ver todas <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Avatar do usuário */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 border-l border-gray-200 dark:border-[#2E3447]">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-900 dark:text-[#F1F5F9]">
                  {displayName} - {displayCity}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#64748B]">Administração</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#8B1A1A] dark:bg-[#E04444] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {userInitials(displayName)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scroll-smooth bg-[#F7F4EF] dark:bg-[#0F1117] transition-colors">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
