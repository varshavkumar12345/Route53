"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "../components/TopNav";
import Sidebar from "../components/Sidebar";
import HostedZonesTable from "../components/HostedZonesTable";
import CreateZoneDrawer from "../components/CreateZoneDrawer";
import EditZoneDrawer from "../components/EditZoneDrawer";
import ZoneDetailsView from "../components/ZoneDetailsView";
import AWSNotification from "../components/AWSNotification";
import styles from "./page.module.css";
import { API_URL } from "../config";

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
  const [selectedDetailZoneId, setSelectedDetailZoneId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [infoBannerDismissed, setInfoBannerDismissed] = useState(false);
  
  // Real stats
  const [stats, setStats] = useState({
    zonesCount: 0,
    recordsCount: 0,
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("route53_token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/zones`, {
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
      fetch(`${API_URL}/api/auth/me`, {
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
              onZoneClick={(zoneId) => {
                setSelectedDetailZoneId(zoneId);
                setActiveView("ZoneDetails");
              }}
              onRefreshStats={fetchStats}
              onNotification={(type, msg) => setNotification({ type, message: msg })}
            />
          </>
        );

      case "ZoneDetails":
        return selectedDetailZoneId ? (
          <ZoneDetailsView
            zoneId={selectedDetailZoneId}
            onBackClick={() => {
              setSelectedDetailZoneId(null);
              setActiveView("Hosted zones");
            }}
          />
        ) : null;

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
        <Sidebar activeItem={activeView} onItemClick={(item) => handleSidebarClick(item)} />
        <main className={styles.content}>
          {!infoBannerDismissed && (
            <div className={styles.infoBanner}>
              <div className={styles.infoBannerIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--aws-blue-interactive)">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </div>
              <div className={styles.infoBannerContent}>
                <strong style={{ display: "block", marginBottom: "4px" }}>Introducing the new Route53 console experience</strong>
                <span>We've redesigned the domains pages to make it easier to use. <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--aws-blue-interactive)", textDecoration: "underline" }}>Let us know what you think</a>. Or you can <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--aws-blue-interactive)", textDecoration: "underline" }}>use the old console</a>.</span>
              </div>
              <button className={styles.infoBannerClose} onClick={() => setInfoBannerDismissed(true)} aria-label="Dismiss banner">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          )}

          {notification && (
            <AWSNotification 
              type={notification.type} 
              message={notification.message} 
              onDismiss={() => setNotification(null)} 
            />
          )}
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
            setNotification({ type: "success", message: "Successfully created hosted zone." });
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
            setNotification({ type: "success", message: "Successfully updated hosted zone." });
          }}
        />
      )}
    </div>
  );
}
