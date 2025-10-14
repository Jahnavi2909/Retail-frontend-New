// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoSmall from "./LogoSmall";
import { useAuth } from "../context/AuthContext";
import AuthService from "../services/AuthService";

export default function Navbar() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fallback to stored user for immediate hydration on refresh
  const displayUser = user || AuthService.getStoredUser();

  const handleLogout = () => {
    if (logout) logout();
    AuthService.logout(); // clear tokens + user
    navigate("/login", { replace: true });
  };

  return (
    <header className="header" style={{ padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogoSmall text="SM" />
        <div>
          <div style={{ fontWeight: 700 }}>Small Business</div>
          <div style={{ fontSize: 12, opacity: 0.95 }}>Inventory & POS</div>
        </div>
      </div>

      <div className="right" style={{ position: "relative" }}>
        {displayUser ? (
          <div
            className="user-menu"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Hi, {displayUser.username || displayUser.email || "User"}
            {menuOpen && (
              <div
                className="dropdown"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: 5,
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  minWidth: 120,
                  zIndex: 10,
                }}
              >
                <button
                  className="btn ghost small"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
