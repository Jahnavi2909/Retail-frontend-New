// src/pages/inventory/StockByProduct.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";
import InventoryService from "../../services/InventoryService";
import * as ProductsService from "../../services/ProductsService";

export default function StockByProduct() {
  const [rows, setRows] = useState([]); // merged rows
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAllStocks();
  }, []);

  async function loadAllStocks() {
    setLoading(true);
    try {
      const productsResp = await ProductsService.getProducts(0, 100);
      const productList = productsResp?.content || productsResp?.data || productsResp || [];

      const allBatches = [];
      await Promise.all(
        productList.map(async (product) => {
          try {
            const stockResp = await InventoryService.getStockByProduct(product.id);
            const batches = stockResp?.data ?? stockResp ?? [];
            const arr = Array.isArray(batches) ? batches : batches.content || [];
            arr.forEach((b) => {
              allBatches.push({ ...b, productId: product.id, productName: product.name });
            });
          } catch (err) {
            console.warn(`No stock for ${product.name}`, err);
          }
        })
      );

      // Merge duplicates by productId + batchNumber
      const mergedMap = {};
      for (const b of allBatches) {
        const productId = b.productId ?? b.product?.id ?? b.productId;
        const batchNumber = (b.batchNumber ?? String(b.batch ?? "").trim()) || null;
        const key = `${productId}::${batchNumber ?? "NO_BATCH"}`;

        const qty = Number(b.quantity ?? 0);
        const cost = b.costPrice != null ? Number(b.costPrice) : 0;

        if (!mergedMap[key]) {
          mergedMap[key] = {
            key,
            productId,
            productName: b.productName ?? b.product?.name ?? "-",
            batchNumber: batchNumber,
            quantity: qty,
            costPrice: cost,
            expiryDate: b.expiryDate ?? b.expiry ?? null,
            locations: b.location ? [b.location] : [],
            mergedCount: 1,
          };
        } else {
          const m = mergedMap[key];
          const totalQty = (m.quantity || 0) + qty;
          const totalCost = m.costPrice * m.quantity + cost * qty;
          m.quantity = totalQty;
          m.costPrice = totalQty > 0 ? totalCost / totalQty : m.costPrice;
          if (b.expiryDate || b.expiry) {
            const cand = new Date(b.expiryDate ?? b.expiry);
            const cur = m.expiryDate ? new Date(m.expiryDate) : null;
            if (!cur || (cand && cand < cur)) m.expiryDate = cand.toISOString();
          }
          if (b.location && !m.locations.includes(b.location)) m.locations.push(b.location);
          m.mergedCount++;
        }
      }

      const mergedArr = Object.values(mergedMap).map((m) => ({
        key: m.key,
        productId: m.productId,
        productName: m.productName,
        batchNumber: m.batchNumber,
        quantity: m.quantity,
        costPrice: m.costPrice,
        totalCost: (m.quantity * m.costPrice).toFixed(2),
        expiryDate: m.expiryDate ? new Date(m.expiryDate).toISOString() : null,
        location: m.locations && m.locations.length ? m.locations.join(", ") : null,
        mergedCount: m.mergedCount || 1,
      }));

      setRows(mergedArr);
    } catch (err) {
      console.error("Error loading and merging stocks:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.productName ?? "").toLowerCase().includes(q) ||
      String(r.batchNumber ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="page-header">
          <div>
            <h2>Stock by Product</h2>
            <p className="page-subtitle">Merged stock batches (duplicates merged)</p>
          </div>
          <div className="header-actions">
            <input
              type="text"
              className="search-input"
              placeholder="Search by product or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Link to="/inventory/add-batch" className="btn-primary">
              + Add Batch
            </Link>
          </div>
        </header>

        <section className="stock-container">
          <div className="card table-card">
            <table className="stock-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>Product</th>
                  <th style={{ textAlign: "center" }}>Batch Number</th>
                  <th style={{ textAlign: "center" }}>Quantity</th>
                  <th style={{ textAlign: "center" }}>Cost Price</th>
                  <th style={{ textAlign: "center" }}>Total Cost</th>
                  <th style={{ textAlign: "center" }}>Expiry Date</th>
                  <th style={{ textAlign: "center" }}>Location(s)</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No batches found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr key={r.key || `${idx}`}>
                      <td style={{ textAlign: "center" }}>{r.productName ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{r.batchNumber ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{r.quantity ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        {r.costPrice != null ? Number(r.costPrice).toFixed(2) : "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>{r.totalCost ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>{r.location ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
