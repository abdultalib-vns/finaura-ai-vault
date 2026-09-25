import { useEffect, useRef, useState } from "react";
import { loadActivePopupAd, loadAdminConfigFromServer, trackEvent } from "../admin/adminStorage";
import { PopupAd } from "../admin/adminTypes";
import { Bell, Info, Gift, AlertTriangle, X, Trash2 } from "lucide-react";

const AD_PERMANENT_KEY = "popup_ad_never_show_";
const DISMISSED_NOTIFS_KEY = "dismissed_notif_ids";

const TYPE_COLORS: Record<string, string> = {
  info: "#0ea5e9",
  promo: "#7c3aed",
  warning: "#d97706",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: <Info size={16} />,
  promo: <Gift size={16} />,
  warning: <AlertTriangle size={16} />,
};

export interface CustomNotif {
  id: string;
  type: "info" | "warning" | "promo";
  title: string;
  message: string;
  ctaText?: string;
  ctaAction?: () => void;
}

function loadDismissedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_NOTIFS_KEY) || "[]"); }
  catch { return []; }
}
function saveDismissedIds(ids: string[]) {
  localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(ids));
}

export default function NotificationBell({ customNotifs = [] }: { customNotifs?: CustomNotif[] }) {
  const [ad, setAd] = useState<PopupAd | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>(loadDismissedIds);
  const [swipingId, setSwiping] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAdminConfigFromServer().finally(() => {
      setAd(loadActivePopupAd());
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const allNotifs: CustomNotif[] = [];
  
  if (ad && !dismissed) {
    const isPermanentlyDismissed = !!localStorage.getItem(AD_PERMANENT_KEY + ad.id);
    if (!isPermanentlyDismissed) {
      allNotifs.push({
        id: ad.id,
        type: ad.type as any,
        title: ad.title,
        message: ad.message,
        ctaText: ad.ctaText,
        ctaAction: () => {
          trackEvent("notification_bell_cta_click", ad.id);
          if (ad.ctaUrl) window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
          setOpen(false);
        }
      });
    }
  }

  allNotifs.push(...customNotifs);

  // Filter out deleted notifications
  const visibleNotifs = allNotifs.filter(n => !deletedIds.includes(n.id));

  if (visibleNotifs.length === 0) return null;

  function handleBellClick() {
    if (!open && ad) trackEvent("notification_bell_open", ad.id);
    setOpen((o) => !o);
  }

  function handleDelete(id: string) {
    // Animate out then remove
    setSwiping(id);
    setTimeout(() => {
      const next = [...deletedIds, id];
      setDeletedIds(next);
      saveDismissedIds(next);
      setSwiping(null);
      // If it's an ad, also permanently dismiss it
      if (ad && ad.id === id) {
        localStorage.setItem(AD_PERMANENT_KEY + id, "1");
        setDismissed(true);
      }
    }, 300);
  }

  function handleClearAll() {
    const allIds = visibleNotifs.map(n => n.id);
    const next = [...deletedIds, ...allIds];
    setDeletedIds(next);
    saveDismissedIds(next);
    // Dismiss any ads
    if (ad && allIds.includes(ad.id)) {
      localStorage.setItem(AD_PERMANENT_KEY + ad.id, "1");
      setDismissed(true);
    }
    setOpen(false);
  }

  const hasWarning = visibleNotifs.some(n => n.type === "warning");
  const bellColor = hasWarning ? TYPE_COLORS["warning"] : TYPE_COLORS[visibleNotifs[0].type] ?? "#2563eb";

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      <button
        className={`notif-bell-btn ${open ? "active" : ""}`}
        onClick={handleBellClick}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        <span className="notif-bell-dot" style={{ background: bellColor }} />
      </button>

      {open && (
        <div className="notif-dropdown" style={{ "--notif-color": bellColor, padding: 0 } as React.CSSProperties}>
          <div className="notif-dropdown-header" style={{ padding: "12px 16px" }}>
            <span className="notif-dropdown-label">Notifications ({visibleNotifs.length})</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {visibleNotifs.length > 1 && (
                <button
                  className="notif-clear-all-btn"
                  onClick={handleClearAll}
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              )}
              <button className="notif-dropdown-x" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
          </div>

          <div className="notif-dropdown-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
            {visibleNotifs.map((n, i) => {
              const color = TYPE_COLORS[n.type] ?? "#2563eb";
              const isDeleting = swipingId === n.id;
              return (
                <div
                  key={n.id}
                  className={`notif-item${isDeleting ? " notif-item-deleting" : ""}`}
                  style={{
                    borderBottom: i < visibleNotifs.length - 1 ? "1px solid var(--border)" : "none",
                    padding: "16px",
                    position: "relative",
                  }}
                >
                  <div className="notif-dropdown-icon-row" style={{ marginBottom: "8px" }}>
                    <span className="notif-dropdown-icon-wrap" style={{ background: color + "1a", color }}>
                      {TYPE_ICONS[n.type]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="notif-dropdown-type" style={{ color }}>
                        {n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                      </div>
                      <div className="notif-dropdown-title" style={{ fontSize: "0.95rem" }}>{n.title}</div>
                    </div>
                    <button
                      className="notif-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="notif-dropdown-message" style={{ marginBottom: n.ctaText ? "12px" : 0 }}>{n.message}</p>
                  
                  {n.ctaText && (
                    <button
                      className="notif-dropdown-cta"
                      style={{ background: color, width: "100%", padding: "8px", borderRadius: "8px", color: "white", fontSize: "0.85rem", fontWeight: 600, border: "none", cursor: "pointer" }}
                      onClick={n.ctaAction}
                    >
                      {n.ctaText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
