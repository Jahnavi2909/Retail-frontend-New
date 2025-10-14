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

const Reports = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesReport, setSalesReport] = useState(null);

  // ✅ Fetch Report with validation
  const loadReports = async () => {
    if (!from || !to) {
      alert("Please select both From and To dates.");
      return;
    }

    if (new Date(from) > new Date(to)) {
      alert("Invalid date range! 'From' date cannot be after the 'To' date.");
      return;
    }

    try {
      // Convert dates to ISO format required by backend
      const fromISO = `${from}T00:00:00`;
      const toISO = `${to}T23:59:59`;

      const res = await axios.get(`${API_BASE}/sales`, {
        params: { from: fromISO, to: toISO },
        headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
      });

      const report = res.data?.data;
      setSalesReport(report);

      if (!report) alert("No report data found for the selected dates.");
    } catch (err) {
      console.error("Error loading sales report:", err);
      alert("Failed to fetch sales report. Please try again later.");
    }
  };

  // ✅ Prepare chart data
  const chartData = salesReport
    ? [
        {
          label: "Sales Summary",
          totalSales: salesReport.totalSales || 0,
          totalTax: salesReport.totalTax || 0,
          netRevenue: salesReport.netRevenue || 0,
        },
      ]
    : [];

  return (
    <div className="page-container">
      <Sidebar/>

      <div className="main-content">
        <h1 className="page-title">Sales Report Summary</h1>

        {/* Filters */}
        <div className="filter-bar">
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button onClick={loadReports}>Load Report</button>
        </div>

        {/* Bar Chart */}
        {salesReport && (
          <div className="report-chart">
            <h2>Sales Overview</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="totalSales"
                  fill="#2563eb"
                  name="Total Sales (₹)"
                />
                <Bar dataKey="totalTax" fill="#facc15" name="Total Tax (₹)" />
                <Bar
                  dataKey="netRevenue"
                  fill="#10b981"
                  name="Net Revenue (₹)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        <div className="report-table">
          <h2>Sales Summary Details</h2>
          <table>
            <thead>
              <tr>
                <th>Total Sales (₹)</th>
                <th>Total Tax (₹)</th>
                <th>Net Revenue (₹)</th>
              </tr>
            </thead>
            <tbody>
              {salesReport ? (
                <tr>
                  <td>{salesReport.totalSales?.toFixed(2) || "0.00"}</td>
                  <td>{salesReport.totalTax?.toFixed(2) || "0.00"}</td>
                  <td>{salesReport.netRevenue?.toFixed(2) || "0.00"}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    No data found. Please select a valid date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;

