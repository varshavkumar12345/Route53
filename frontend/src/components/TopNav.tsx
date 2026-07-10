"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./TopNav.module.css";
import { API_URL } from "../config";

export default function TopNav() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [accountId, setAccountId] = useState("1234-5678-9012");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedUser = localStorage.getItem("route53_username");
    if (savedUser) {
      setUsername(savedUser);
    }

    const token = localStorage.getItem("route53_token");
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        if (data.username) setUsername(data.username);
        if (data.aws_account_id) {
          const raw = data.aws_account_id;
          const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
          setAccountId(formatted);
        }
      })
      .catch(err => {
        console.error("Failed to load user info in TopNav:", err);
      });
    }

    // Set theme preference on load
    const savedTheme = localStorage.getItem("route53_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("route53_theme", nextTheme);
  };

  const handleSignOut = () => {
    localStorage.removeItem("route53_token");
    localStorage.removeItem("route53_username");
    router.push("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.logoContainer} onClick={() => router.push("/")}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#ec7211">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className={styles.logoText}>AWS</span>
        </div>

        <div className={styles.servicesButton}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
          </svg>
          <span className={styles.servicesText}>Services</span>
        </div>

        <div className={styles.divider} />
        <span className={styles.serviceName} onClick={() => router.push("/")}>Route 53</span>
      </div>

      <div className={styles.searchBarContainer}>
        <div className={styles.searchWrapper}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#aab7c4" className={styles.searchIcon}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className={styles.searchInput}
          />
          <span className={styles.shortcutHint}>[Alt+S]</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        {/* CloudShell Icon */}
        <div className={styles.navIconItem} title="CloudShell">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zM17 10h2v6h-2v-6zm-9 2v2H6v-2h2zm2-2h4v2h-4v-2z" />
          </svg>
        </div>

        {/* Notifications Icon */}
        <div className={styles.navIconItem} title="Notifications">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </div>

        {/* Settings Icon */}
        <div className={styles.navIconItem} title="Settings">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </div>

        {/* Help Icon */}
        <div className={styles.navIconItem} title="Support">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
          </svg>
        </div>

        {/* Theme Toggle Icon */}
        <div className={styles.navIconItem} onClick={toggleTheme} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10 0-4.7 3.3-8.6 7.8-9.7.5-.1 1 .2 1.2.6.2.5.1 1.1-.3 1.4-1.9 1.5-2.9 3.8-2.9 6.2 0 4.4 3.6 8 8 8 2.4 0 4.7-1 6.2-2.9.3-.4.9-.5 1.4-.3.5.2.8.7.6 1.2-1.1 4.5-5 7.8-9.7 7.8z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/>
            </svg>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.navItem} title="Region">
          <span className={styles.regionBadge}>Global</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ marginLeft: "4px" }}>
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        <div className={styles.divider} />

        <div className={styles.accountDropdown}>
          <span className={styles.accountText}>{username} @ {accountId}</span>
          <button onClick={handleSignOut} className={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
