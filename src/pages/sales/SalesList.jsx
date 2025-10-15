// src/pages/sales/SalesList.jsx
import React, { useEffect, useState } from "react";
import SalesService from "../../services/SalesService"; // must implement getSales & getSaleById
import Sidebar from "../../components/Sidebar";
import "../../styles.css";

/**
 * SalesList page
 * - fetches GET /api/sales?page&size expecting PageResponse<SaleDto>
 * - renders table with the fields you provided
 * - shows details drawer with items for a selected sale
 */
export default function SalesList() {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [resp, setResp] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = async (p = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await SalesService.getSales(p, PAGE_SIZE);
      // expected shape: { content: [...], page, size, totalElements, totalPages }
      setResp(data || { content: [], page: p, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
    } catch (err) {
      console.error("getSales error", err);
      setError("Failed to load sales.");
      setResp({ content: [], page: p, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const data = await SalesService.getSaleById(id);
      setSelectedSale(data);
    } catch (err) {
      console.error("getSaleById", err);
      setSelectedSale(null);
      alert("Failed to load sale details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => setSelectedSale(null);

  const formatCurrency = (v) => {
    if (v == null) return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `₹${n.toFixed(2)}`;
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  const start = resp.totalElements === 0 ? 0 : resp.page * resp.size + 1;
  const end = Math.min((resp.page + 1) * resp.size, resp.totalElements);

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <h1 className="page-title">Sales</h1>

        <div className="table-card">
          {loading ? (
            <div style={{ padding: 20 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 20, color: "crimson" }}>{error}</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="dash-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cashier ID</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Tax</th>
                      <th>Discount</th>
                      <th>Payment</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resp.content && resp.content.length ? (
                      resp.content.map((s) => {
                        const itemsCount = Array.isArray(s.items) ? s.items.length : s.itemsCount ?? 0;
                        return (
                          <tr key={s.id}>
                            <td>{s.id}</td>
                            <td>{s.cashierId ?? "-"}</td>
                            <td>{formatDate(s.createdAt)}</td>
                            <td>{itemsCount}</td>
                            <td>{formatCurrency(s.total)}</td>
                            <td>{formatCurrency(s.taxTotal)}</td>
                            <td>{formatCurrency(s.discountTotal)}</td>
                            <td>{(s.paymentMode || "").toUpperCase()}</td>
                            <td style={{ textAlign: "right" }}>
                              <button onClick={() => openDetails(s.id)} className="btn btn-small">Details</button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>No sales found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="results">Showing {start} to {end} of {resp.totalElements} results</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn"
                    onClick={() => { if (resp.page > 0) { load(resp.page - 1); } }}
                    disabled={resp.page === 0}
                  >
                    Prev
                  </button>
                  <button
                    className="btn"
                    onClick={() => { if (resp.page + 1 < (resp.totalPages || 1)) { load(resp.page + 1); } }}
                    disabled={resp.page + 1 >= (resp.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Details drawer/modal */}
        {selectedSale && (
          <div
            className="details-drawer"
            style={{
              position: "fixed",
              top: 80,
              right: 24,
              width: 520,
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              padding: 16,
              zIndex: 1200,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Sale #{selectedSale.id}</h3>
              <button className="btn btn-ghost" onClick={closeDetails}>Close</button>
            </div>

            {detailsLoading ? (
              <div style={{ padding: 12 }}>Loading…</div>
            ) : (
              <>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <div><strong>Date:</strong> {formatDate(selectedSale.createdAt)}</div>
                  <div><strong>Cashier:</strong> {selectedSale.cashierId ?? "-"}</div>
                  <div><strong>Payment:</strong> {(selectedSale.paymentMode || "").toUpperCase()}</div>
                </div>

                <h4 style={{ marginTop: 12 }}>Items</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 4px" }}>Product</th>
                      <th style={{ padding: "6px 4px" }}>Qty</th>
                      <th style={{ padding: "6px 4px" }}>Unit</th>
                      <th style={{ padding: "6px 4px" }}>Tax%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale.items || []).map((it, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 4px" }}>{it.productName ?? it.name ?? it.productId}</td>
                        <td style={{ padding: "8px 4px", textAlign: "center" }}>{it.quantity}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>{formatCurrency(it.unitPrice)}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>{Number(it.taxRate || 0).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <div><strong>Subtotal:</strong> {formatCurrency(selectedSale.total ? (Number(selectedSale.total) - Number(selectedSale.taxTotal || 0) + Number(selectedSale.discountTotal || 0)) : 0)}</div>
                  <div><strong>Tax:</strong> {formatCurrency(selectedSale.taxTotal)}</div>
                  <div><strong>Discount:</strong> {formatCurrency(selectedSale.discountTotal)}</div>
                  <div style={{ marginTop: 6, fontSize: 16 }}><strong>Total:</strong> {formatCurrency(selectedSale.total)}</div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
