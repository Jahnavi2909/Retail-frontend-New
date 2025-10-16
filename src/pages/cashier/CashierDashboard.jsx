import { useEffect, useState } from "react";
import "../../styles/CashierDashboard.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import '../../styles/SalePOS.css'
import Sidebar from "../../components/Sidebar";

const API_BASE = "https://d1x2sux8i7gb9h.cloudfront.net/api";

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dailySales, setDailySales] = useState(0);
  const [error, setError] = useState(null);

  // 🔹 Load all dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([fetchProducts(), fetchTransactions(), fetchSales()]);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError("Failed to load dashboard data. Please try again later.");
    }
  };

  // ✅ Fetch products
  const fetchProducts = async () => {
    const res = await axios.get(`${API_BASE}/products?page=0&size=5`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    setProducts(res.data?.data?.content || []);
  };

  // ✅ Fetch recent transactions
  const fetchTransactions = async () => {
    const res = await axios.get(`${API_BASE}/sales`, {
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    setTransactions(res.data?.data || []);
  };

  // ✅ Fetch today’s total sales
  const fetchSales = async () => {
    const today = new Date().toISOString().split("T")[0];
    const from = `${today}T00:00:00`;
    const to = `${today}T23:59:59`;

    const res = await axios.get(`${API_BASE}/reports/sales`, {
      params: { from, to },
      headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
    });
    setDailySales(res.data?.data?.totalSales || 0);
  };

  const handleGoToPOS = () => navigate("/pos");

  return (
    <div className="cashier-container">
      <Sidebar/>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1>Cashier Dashboard</h1>
        </header>

        {/* Sales Summary */}
        <section className="sales-summary">
          <div className="sales-card">
            <h3>Today's Sales</h3>
            <p className="sales-amount">₹{dailySales.toFixed(2)}</p>
          </div>

          <button className="pos-button" onClick={handleGoToPOS}>
            Go to POS
          </button>
        </section>

        {/* Transactions Section */}
        <section className="transactions-section">
          <h2>Recent Transactions</h2>

          {transactions.length === 0 ? (
            <p style={{ textAlign: "center", color: "#555" }}>No transactions found.</p>
          ) : (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.date?.split("T")[0]}</td>
                    <td>₹{tx.amount?.toFixed(2)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          tx.status?.toLowerCase() === "completed"
                            ? "completed"
                            : "pending"
                        }`}
                      >
                        {tx.status || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Product List */}
        <section className="products-section">
          <h2>Top Products</h2>
          {error ? (
            <p className="error-message">{error}</p>
          ) : products.length === 0 ? (
            <p>Loading products...</p>
          ) : (
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Price (₹)</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.price}</td>
                    <td>{p.stockQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
};

export default CashierDashboard;


