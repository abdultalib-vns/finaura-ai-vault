import { useEffect, useState } from "react";
import { loadAdminTheme } from "./adminStorage";

interface Props {
  onFinish: () => void;
}

export default function AdminSplash({ onFinish }: Props) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [isDark, setIsDark] = useState(() => {
    try {
      const adminDark = localStorage.getItem("admin_ui_dark");
      if (adminDark !== null) return adminDark === "1";
    } catch {}
    if (typeof window !== "undefined") {
      const htmlEl = document.documentElement;
      if (htmlEl.classList.contains("dark-mode")) return true;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const htmlEl = document.documentElement;
    const hasDarkClass = htmlEl.classList.contains("dark-mode");
    const adminDark = localStorage.getItem("admin_ui_dark");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(adminDark !== null ? adminDark === "1" : (hasDarkClass || systemDark));
  }, []);

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("hold"), 800);
    const holdTimer = setTimeout(() => setPhase("exit"), 2000);
    const exitTimer = setTimeout(() => onFinish(), 2600);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onFinish]);

  const bgImage = isDark
    ? "/Background_Image_(DarkMode).png"
    : "/Background_Image_(LightMode).png";

  return (
    <div className={`splash-screen splash-${phase} ${isDark ? "dark-mode splash-dark" : "splash-light"}`}>
      {/* Theme-aware background image */}
      <img
        src={bgImage}
        alt=""
        className="splash-bg-image"
        aria-hidden="true"
      />

      {/* Top-left corner of the screen badge: Admin Panel */}
      <div className="splash-version-badge admin-splash-badge">Admin Panel</div>

      {/* Central content card */}
      <div className="splash-premium-card">
        {/* App Icon */}
        <div className="splash-icon-wrapper">
          <div className="splash-icon-halo">
            <img src="/icon-512.png" alt="FinAura Admin" className="splash-icon" />
          </div>
        </div>

        {/* App Name - "Aura" uses accent color via var(--primary) */}
        <h1 className="splash-title">
          <span className="splash-title-fin">Fin</span>
          <span className="splash-title-aura">Aura</span>
        </h1>

        {/* Tagline */}
        <p className="splash-tagline">AI-Powered Personal Finance Vault</p>

        {/* Progress bar + text */}
        <div className="splash-premium-loader">
          <div className="splash-progress-track">
            <div className="splash-progress-bar" />
          </div>
          <span className="splash-loader-text">Entering into Admin Panel</span>
        </div>
      </div>

      {/* Footer */}
      <div className="splash-premium-footer">
        {/* Safety Badges */}
        <img
          src="/SafetyBadges.png"
          alt="Safe and Secured • 100% Local • 100% Offline"
          className="splash-safety-badges"
        />

        <div className="splash-attribution-block">
          <p className="splash-footer-line">
            Engineered by{" "}
            <a
              href="https://velolaunch-aistudio.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="splash-velolaunch-link"
            >
              VeloLaunch
            </a>
          </p>
          <p className="splash-footer-line">
            A Division of{" "}
            <a
              href="https://www.smartvistaitsolutions.in"
              target="_blank"
              rel="noopener noreferrer"
              className="splash-smartvista-link"
            >
              Smart Vista IT Solutions
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
