"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { API_URL } from "../../config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("route53_token");
    if (token) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up (Register)
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Registration failed. Username may be taken.");
        }

        setSuccessMessage("AWS Account created successfully! Please sign in.");
        setIsSignUp(false);
        setPassword("");
      } else {
        // Sign In (Login)
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Authentication failed. Check credentials.");
        }

        const data = await response.json();
        localStorage.setItem("route53_token", data.access_token);
        localStorage.setItem("route53_username", username);
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#ec7211">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className={styles.logoText}>Amazon Web Services</span>
        </div>
      </div>

      <div className={styles.loginBox}>
        <h1 className={styles.title}>{isSignUp ? "Create AWS account" : "Sign in"}</h1>

        {successMessage && <div className={styles.successMessage}>{successMessage}</div>}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isSignUp && (
            <div className={styles.userTypeSelector}>
              <label className={styles.radioLabel}>
                <input type="radio" name="userType" defaultChecked />
                <span className={styles.radioText}>Root user</span>
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="userType" disabled />
                <span className={styles.radioText} style={{ color: "#aab7c4" }}>IAM user (disabled)</span>
              </label>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              {isSignUp ? "Root user email address or username" : "Root user email address or username"}
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isSignUp ? "Choose username" : "e.g. admin"}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignUp ? "Choose password" : "Enter password"}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            style={{ marginTop: "10px", padding: "10px" }}
            disabled={loading}
          >
            {loading ? (isSignUp ? "Registering..." : "Signing in...") : (isSignUp ? "Register" : "Sign in")}
          </button>
        </form>

        <div className={styles.toggleMode}>
          {isSignUp ? (
            <span onClick={() => { setIsSignUp(false); setError(""); setSuccessMessage(""); }}>
              Already have an AWS account? <strong>Sign in</strong>
            </span>
          ) : (
            <span onClick={() => { setIsSignUp(true); setError(""); setSuccessMessage(""); }}>
              New to AWS? <strong>Create an AWS account</strong>
            </span>
          )}
        </div>

        <div className={styles.boxFooter}>
          <p>Demo credentials: <strong>admin</strong> / <strong>adminpassword</strong></p>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLinks}>
          <a href="#">Terms of Use</a>
          <a href="#">Privacy Policy</a>
          <span>© 2026, Amazon Web Services, Inc. or its affiliates.</span>
        </div>
      </div>
    </div>
  );
}
