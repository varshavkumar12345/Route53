"use client";

import React from "react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  activeItem?: string;
}

export default function Sidebar({ activeItem = "Hosted zones" }: SidebarProps) {
  const menuGroups = [
    {
      title: "DNS Management",
      items: ["Dashboard", "Hosted zones"]
    },
    {
      title: "Traffic flow",
      items: ["Traffic policies", "Policy records"]
    },
    {
      title: "Health checks",
      items: ["Health checks"]
    },
    {
      title: "Resolver",
      items: ["VPCs", "Rules"]
    }
  ];

  return (
    <aside className={styles.sidebar}>
      {menuGroups.map((group, index) => (
        <div key={index} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <ul className={styles.groupList}>
            {group.items.map((item) => {
              const isActive = item === activeItem;
              return (
                <li
                  key={item}
                  className={`${styles.listItem} ${isActive ? styles.activeItem : ""}`}
                >
                  <span className={styles.itemText}>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
