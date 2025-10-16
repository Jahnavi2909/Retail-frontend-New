import React, { useEffect, useState } from "react";
import "../../styles/ManagerDashboard.css";
import { NavLink } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";

const API_BASE = "https://d1x2sux8i7gb9h.cloudfront.net/api";

const ManagerDashboard = () => {
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchSuppliersCount(),
        fetchPendingOrders(),
        fetchLowStockItems(),
        fetchRecentOrders(),
      ]);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load data. Please try again later.");
    }
  };

  // ✅ Fetch suppliers count
  const fetchSuppliersCount = async () => {
    const res = await axios.get(`${API_BASE}/suppliers`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` }
    });
    setSuppliersCount(res.data?.data?.length || 0);
  };

  // ✅ Fetch pending purchase orders
  const fetchPendingOrders = async () => {
    const res = await axios.get(`${API_BASE}/purchase-orders`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    const allOrders = res.data?.data || [];
    const pending = allOrders.filter((o) => o.status === "PENDING").length;
    setPendingOrders(pending);
  };

  // ✅ Fetch low stock items
  const fetchLowStockItems = async () => {
    const res = await axios.get(`${API_BASE}/reports/low-stock`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    setLowStockItems(res.data?.data?.length || 0);
  };

  // ✅ Fetch recent purchase orders
  const fetchRecentOrders = async () => {
    const res = await axios.get(`${API_BASE}/purchase-orders?page=0&size=5`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    setRecentOrders(res.data?.data?.content || []);
  };

  return (
    <div className="manager-dashboard">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="main-content">
        <header className="navbar">
          <h1>Manager Dashboard</h1>
          <div className="user-icon">🔔</div>
        </header>

        {error && <p className="error-message">{error}</p>}

        {/* KPI Cards */}
        <section className="kpi-cards">
          <div className="kpi-card">
            <h3>Total Suppliers</h3>
            <p>{suppliersCount}</p>
          </div>
          <div className="kpi-card">
            <h3>Pending Orders</h3>
            <p>{pendingOrders}</p>
          </div>
          <div className="kpi-card">
            <h3>Low Stock Items</h3>
            <p>{lowStockItems}</p>
          </div>
        </section>

        {/* Recent Orders Table */}
        <section className="table-section">
          <h2>Recent Purchase Orders</h2>
          {recentOrders.length === 0 ? (
            <p style={{ textAlign: "center" }}>No purchase orders found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>SUPPLIER</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.poNumber}</td>
                    <td>{order.supplier?.name || "N/A"}</td>
                    <td>{order.expectedDate?.split("T")[0]}</td>
                    <td>
                      <span
                        className={`status ${order.status?.toLowerCase() || "pending"
                          }`}
                      >
                        {order.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};

export default ManagerDashboard;