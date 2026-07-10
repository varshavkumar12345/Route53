"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./TopNav.module.css";

export default function TopNav() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [accountId, setAccountId] = useState("1234-5678-9012");

  useEffect(() => {
    const savedUser = localStorage.getItem("route53_username");
    if (savedUser) {
      setUsername(savedUser);
    }

    const token = localStorage.getItem("route53_token");
    if (token) {
      fetch("http://localhost:8000/api/auth/me", {
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
  }, []);

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
        <div className={styles.divider} />
        <span className={styles.serviceName} onClick={() => router.push("/")}>Route 53</span>
      </div>

      <div className={styles.searchBarContainer}>
        <input type="text" placeholder="Search for services, features, marketplace products, and docs" className={styles.searchInput} />
      </div>

      <div className={styles.rightSection}>
        <div className={styles.navItem}>
          <span className={styles.regionBadge}>Global</span>
        </div>
        <div className={styles.navItem}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
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
