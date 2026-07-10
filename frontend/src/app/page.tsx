"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import HostedZonesTable from "../components/HostedZonesTable";
import CreateZoneDrawer from "../components/CreateZoneDrawer";
import EditZoneDrawer from "../components/EditZoneDrawer";
import styles from "./page.module.css";

interface HostedZone {
  id: string;
  name: string;
  type: string;
  description?: string;
  comment?: string;
  record_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [accountId, setAccountId] = useState("1234-5678-9012");
  
  // Navigation & View toggling
  const [activeView, setActiveView] = useState("Dashboard");
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editZoneId, setEditZoneId] = useState<string | null>(null);
  
  // Real stats
  const [stats, setStats] = useState({
    zonesCount: 0,
    recordsCount: 0,
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("route53_token");
      if (!token) return;

      const response = await fetch("http://localhost:8000/api/zones", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: HostedZone[] = await response.json();
        const totalRecords = data.reduce((sum, zone) => sum + zone.record_count, 0);
        setStats({
          zonesCount: data.length,
          recordsCount: totalRecords,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("route53_token");
    const savedUser = localStorage.getItem("route53_username");
    if (!token) {
      router.push("/login");
    } else {
      setAuthenticated(true);
      if (savedUser) setUsername(savedUser);
      fetchStats();

      // Fetch dynamic profile to get unique AWS Account ID
      fetch("http://localhost:8000/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        if (data.username) setUsername(data.username);
        if (data.aws_account_id) {
          const raw = data.aws_account_id;
          const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
          setAccountId(formatted);
        }
      })
      .catch(err => console.error("Failed to load user info in Dashboard Page:", err));
    }
  }, [router]);

  if (authenticated === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading AWS Console...</span>
      </div>
    );
  }

  // Handle Sidebar item selection
  const handleSidebarClick = (item: string) => {
    setActiveView(item);
  };

  const renderContent = () => {
    switch (activeView) {
      case "Dashboard":
        return (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Route 53 Dashboard</h1>
            </div>

            <div className="aws-panel">
              <h2 className="aws-panel-title">DNS management</h2>
              <p className={styles.panelDescription}>
                Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service.
                It is designed to give developers and businesses an extremely reliable and cost-effective way to route end users to Internet applications.
              </p>
              <div className={styles.statsGrid}>
                <div className={styles.statCard} style={{ cursor: "pointer" }} onClick={() => setActiveView("Hosted zones")}>
                  <span className={styles.statLabel}>Hosted zones</span>
                  <span className={styles.statValue}>{stats.zonesCount}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>DNS Records (seeding)</span>
                  <span className={styles.statValue}>{stats.recordsCount}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Health checks</span>
                  <span className={styles.statValue}>0</span>
                </div>
              </div>
              <div className={styles.actions}>
                <button 
                  className="btn-primary"
                  onClick={() => setDrawerOpen(true)}
                >
                  Create hosted zone
                </button>
              </div>
            </div>

            <div className="aws-panel">
              <h2 className="aws-panel-title">AWS Region & Account Status</h2>
              <table className={styles.statusTable}>
                <tbody>
                  <tr>
                    <td className={styles.tableLabel}>AWS Account ID</td>
                    <td className={styles.tableValue}>{accountId}</td>
                  </tr>
                  <tr>
                    <td className={styles.tableLabel}>Current Role / User</td>
                    <td className={styles.tableValue}>{username}</td>
                  </tr>
                  <tr>
                    <td className={styles.tableLabel}>Console Region</td>
                    <td className={styles.tableValue}>Global (DNS is a global service)</td>
                  </tr>
                  <tr>
                    <td className={styles.tableLabel}>API Status</td>
                    <td className={styles.tableValue}>
                      <span className={styles.statusIndicator}>●</span> Connected
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

      case "Hosted zones":
        return (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>Hosted zones</h1>
            </div>
            <HostedZonesTable 
              onCreateClick={() => setDrawerOpen(true)}
              onEditClick={(zoneId) => setEditZoneId(zoneId)}
              onRefreshStats={fetchStats}
            />
          </>
        );

      default:
        // Mock views for other sections
        return (
          <>
            <div className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>{activeView}</h1>
            </div>
            <div className="aws-panel">
              <h2 className="aws-panel-title">Coming Soon</h2>
              <p className={styles.panelDescription} style={{ fontStyle: "italic" }}>
                The "{activeView}" management console is currently simulated. This section will be implemented in subsequent phases.
              </p>
              <button className="btn-secondary" onClick={() => setActiveView("Dashboard")}>
                Return to Dashboard
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.container}>
      <TopNav />
      <div className={styles.mainLayout}>
        {/* Custom sidebar wrapper to catch clicks */}
        <div style={{ display: "flex", flexShrink: 0 }} onClick={(e) => {
          const target = e.target as HTMLElement;
          const listItem = target.closest("li");
          if (listItem && listItem.textContent) {
            handleSidebarClick(listItem.textContent.trim());
          }
        }}>
          <Sidebar activeItem={activeView} />
        </div>
        <main className={styles.content}>
          {renderContent()}
        </main>
      </div>

      {drawerOpen && (
        <CreateZoneDrawer 
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => {
            fetchStats();
            // Force refresh active table view if currently rendering
            if (activeView === "Hosted zones") {
              setActiveView("Dashboard");
              setTimeout(() => setActiveView("Hosted zones"), 10);
            }
          }}
        />
      )}
      {editZoneId && (
        <EditZoneDrawer 
          zoneId={editZoneId}
          onClose={() => setEditZoneId(null)}
          onSuccess={() => {
            fetchStats();
            // Force refresh active table view if currently rendering
            if (activeView === "Hosted zones") {
              setActiveView("Dashboard");
              setTimeout(() => setActiveView("Hosted zones"), 10);
            }
          }}
        />
      )}
    </div>
  );
}
