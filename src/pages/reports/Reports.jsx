// src/pages/reports/Reports.jsx
import React, { useState } from "react";
import axios from "axios";
import "../../styles/Reports.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";

const API_BASE =
  "http://smartest-env.eba-febxxxwz.ap-south-1.elasticbeanstalk.com/api/reports";

function formatCurrency(v) {
  if (v == null) return "₹0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toFixed(2)}`;
}

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null); // either object { from,to,transactions,grossTotal,... } or null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setError("");
    setReport(null);

    if (!from || !to) {
      setError("Please select both From and To dates.");
      return;
    }
    if (new Date(from) > new Date(to)) {
      setError("'From' date cannot be after 'To' date.");
      return;
    }

    try {
      setLoading(true);
      const fromISO = `${from}T00:00:00`;
      const toISO = `${to}T23:59:59`;

      const res = await axios.get(`${API_BASE}/sales`, {
        // your backend route might be /sales or /sales-summary — adjust as needed
        params: { from: fromISO, to: toISO },
        headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
      });

      // The backend uses envelope: { success, message, data: { ... } } or data: []
      const envelope = res?.data ?? res;
      const payload = envelope?.data;

      // If payload is an array (empty list), treat as "no data"
      if (Array.isArray(payload)) {
        setReport(null); // no summary available
      } else if (payload && typeof payload === "object") {
        // expected summary object with fields: from, to, transactions, grossTotal, netTotal, taxTotal, discountTotal
        const summary = {
          from: payload.from ?? from,
          to: payload.to ?? to,
          transactions: Number(payload.transactions ?? 0),
          grossTotal: Number(payload.grossTotal ?? 0),
          netTotal: Number(payload.netTotal ?? 0),
          taxTotal: Number(payload.taxTotal ?? 0),
          discountTotal: Number(payload.discountTotal ?? 0),
        };
        setReport(summary);
      } else {
        // no usable data
        setReport(null);
      }

      if (!payload || (Array.isArray(payload) && payload.length === 0)) {
        // optional: notify user explicitly
        // setError("No report data found for the selected dates.");
      }
    } catch (err) {
      console.error("Error loading sales report:", err);
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to fetch sales report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // prepare chart data (single bar group)
  const chartData = report
    ? [
        {
          name: `${report.from} → ${report.to}`,
          Gross: report.grossTotal,
          Tax: report.taxTotal,
          Net: report.netTotal,
        },
      ]
    : [];

  return (
    <div className="page-container">
      <Sidebar />

      <div className="main-content" style={{ padding: 24 }}>
        <h1 className="page-title">Sales Report Summary</h1>

        <div className="filter-bar" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <div>
            <button onClick={loadReports} disabled={loading} className="btn btn-primary">
              {loading ? "Loading…" : "Load Report"}
            </button>
          </div>

          {error && (
            <div style={{ color: "crimson", marginLeft: 12 }}>
              {error}
            </div>
          )}
        </div>

        {/* If no report found */}
        {!report && !loading && (
          <div style={{ marginBottom: 16, color: "#374151" }}>
            {error ? null : "No summary data: please select a date range and click 'Load Report'."}
          </div>
        )}

        {/* KPIs */}
        {report && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Date Range</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>{report.from} → {report.to}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Transactions</div>
              <div className="kpi-value">{report.transactions}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Gross Total</div>
              <div className="kpi-value">{formatCurrency(report.grossTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Net Total</div>
              <div className="kpi-value">{formatCurrency(report.netTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Tax Total</div>
              <div className="kpi-value">{formatCurrency(report.taxTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Discount Total</div>
              <div className="kpi-value">{formatCurrency(report.discountTotal)}</div>
            </div>
          </div>
        )}

        {/* Chart */}
        {report && (
          <div className="report-chart" style={{ marginBottom: 18, background: "#fff", borderRadius: 8, padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Sales Overview</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => (value == null ? "-" : `₹${Number(value).toFixed(2)}`)} />
                <Legend />
                <Bar dataKey="Gross" fill="#1565c0" name="Gross (₹)" />
                <Bar dataKey="Tax" fill="#f59e0b" name="Tax (₹)" />
                <Bar dataKey="Net" fill="#10b981" name="Net (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary Table */}
        <div className="report-table" style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Sales Summary Details</h2>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", fontSize: 13 }}>
                <th style={{ padding: 8 }}>From</th>
                <th style={{ padding: 8 }}>To</th>
                <th style={{ padding: 8 }}>Transactions</th>
                <th style={{ padding: 8 }}>Gross (₹)</th>
                <th style={{ padding: 8 }}>Tax (₹)</th>
                <th style={{ padding: 8 }}>Net (₹)</th>
                <th style={{ padding: 8 }}>Discount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {report ? (
                <tr>
                  <td style={{ padding: 8 }}>{report.from}</td>
                  <td style={{ padding: 8 }}>{report.to}</td>
                  <td style={{ padding: 8 }}>{report.transactions}</td>
                  <td style={{ padding: 8 }}>{report.grossTotal.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{report.taxTotal.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{report.netTotal.toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{report.discountTotal.toFixed(2)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 18, textAlign: "center", color: "#6b7280" }}>
                    {loading ? "Loading…" : "No summary available for the selected date range."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
