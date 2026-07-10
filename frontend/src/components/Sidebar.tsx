"use client";

import React, { useState } from "react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

export default function Sidebar({ activeItem = "Hosted zones", onItemClick }: SidebarProps) {
  // Pre-expand groups by default to match the screenshot
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "IP-based routing": true,
    "Traffic flow": true,
    "Domains": true,
    "Resolver": true
  });

  const toggleGroup = (groupName: string) => {
    setExpanded(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleItemSelect = (item: string) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const groups = [
    {
      title: "IP-based routing",
      items: ["CIDR collections"]
    },
    {
      title: "Traffic flow",
      items: ["Traffic policies", "Policy records"]
    },
    {
      title: "Domains",
      items: ["Registered domains", "Requests"]
    },
    {
      title: "Resolver",
      items: ["VPCs", "Inbound endpoints", "Outbound endpoints", "Rules", "Query logging", "Outposts"]
    }
  ];

  return (
    <aside className={styles.sidebar}>
      {/* Sidebar Header */}
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>Route 53</span>
        <button className={styles.closeButton} aria-label="Close sidebar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <nav className={styles.navMenu}>
        {/* Top level standalone links */}
        <div className={styles.menuItem} onClick={() => handleItemSelect("Dashboard")}>
          <span className={`${styles.itemLink} ${activeItem === "Dashboard" ? styles.activeLink : ""}`}>
            Dashboard
          </span>
        </div>
        <div className={styles.menuItem} onClick={() => handleItemSelect("Hosted zones")}>
          <span className={`${styles.itemLink} ${activeItem === "Hosted zones" ? styles.activeLink : ""}`}>
            Hosted zones
          </span>
        </div>
        <div className={styles.menuItem} onClick={() => handleItemSelect("Health checks")}>
          <span className={`${styles.itemLink} ${activeItem === "Health checks" ? styles.activeLink : ""}`}>
            Health checks
          </span>
        </div>

        {/* Collapsible groups */}
        {groups.map((group) => {
          const isOpen = !!expanded[group.title];
          return (
            <div key={group.title} className={styles.groupContainer}>
              <div className={styles.groupTitleRow} onClick={() => toggleGroup(group.title)}>
                <span className={styles.arrowIcon}>
                  {isOpen ? "▼" : "▶"}
                </span>
                <span className={styles.groupTitleText}>{group.title}</span>
              </div>
              
              {isOpen && (
                <div className={styles.groupChildrenList}>
                  {group.items.map((item) => {
                    const isActive = activeItem === item;
                    return (
                      <div
                        key={item}
                        className={styles.childItem}
                        onClick={() => handleItemSelect(item)}
                      >
                        <span className={`${styles.childLink} ${isActive ? styles.activeLink : ""}`}>
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom standalone links */}
        <div className={styles.menuItem} onClick={() => handleItemSelect("DNS Firewall")}>
          <span className={`${styles.itemLink} ${activeItem === "DNS Firewall" ? styles.activeLink : ""}`}>
            DNS Firewall
          </span>
        </div>
        <div className={styles.menuItem} onClick={() => handleItemSelect("Application Recovery Controller")}>
          <span className={`${styles.itemLink} ${activeItem === "Application Recovery Controller" ? styles.activeLink : ""}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Application Recovery Controller
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ opacity: 0.7 }}>
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
            </svg>
          </span>
        </div>
      </nav>
    </aside>
  );
}
