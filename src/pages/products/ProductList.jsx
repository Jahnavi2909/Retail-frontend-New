// src/pages/products/ProductList.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Pagination from "../../components/Pagination";
import useDebounce from "../../utils/useDebounce";
import * as ProductsService from "../../services/ProductsService";
import AuthService from "../../services/AuthService";
import "../../styles.css";

export default function ProductList() {
  const PAGE_SIZE = 5;
  const [filterType, setFilterType] = useState("sku");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const [pageResp, setPageResp] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // fallback large fetch size when server search fails
  const sizeFallback = 1000;

  // determine role from stored user (works with string/array/object shapes)
  const getNormalizedRole = (roleRaw) => {
    if (!roleRaw) return "";
    let r = roleRaw;
    if (Array.isArray(roleRaw) && roleRaw.length) r = roleRaw[0];
    if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
    return String(r || "").toUpperCase().replace(/^ROLE[_\-]/, "");
  };

  const storedUser = AuthService.getStoredUser();
  const normalizedRole = getNormalizedRole(
    storedUser?.role ?? storedUser?.roles ?? storedUser?.authority ?? storedUser?.authorities
  );
  const isAdmin = normalizedRole.includes("ADMIN");

  const load = async (p = 0) => {
    setLoading(true);
    try {
      // If there is a search term, try server search first
      if (debouncedQuery && debouncedQuery.trim() !== "") {
        const params = filterType === "sku" ? { sku: debouncedQuery } : { name: debouncedQuery };
        try {
          const res = await ProductsService.searchProducts({ ...params, page: p, size: PAGE_SIZE });
          if (res && res.content && res.content.length > 0) {
            setPageResp(res);
            setPage(p);
          } else {
            // server returned empty => fallback to client-side search (fetch larger set)
            const all = await ProductsService.getProducts(0, sizeFallback);
            const list = (all && all.content) || [];
            const q = debouncedQuery.trim().toLowerCase();
            const filtered = list.filter((item) => {
              if (!item) return false;
              const checks = [
                (item.name || "").toString().toLowerCase(),
                (item.sku || "").toString().toLowerCase(),
                (item.category || "").toString().toLowerCase(),
              ];
              return checks.some((s) => s.includes(q));
            });
            // Build a pageResp-like object from filtered list
            const totalElements = filtered.length;
            const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;
            const startIdx = p * PAGE_SIZE;
            const pageContent = filtered.slice(startIdx, startIdx + PAGE_SIZE);
            setPageResp({ content: pageContent, page: p, size: PAGE_SIZE, totalElements, totalPages });
            setPage(p);
          }
        } catch (err) {
          // if the search endpoint failed entirely, fallback to client-side
          console.warn("searchProducts failed, falling back to client-side filter:", err);
          const all = await ProductsService.getProducts(0, sizeFallback);
          const list = (all && all.content) || [];
          const q = debouncedQuery.trim().toLowerCase();
          const filtered = list.filter((item) => {
            if (!item) return false;
            const checks = [
              (item.name || "").toString().toLowerCase(),
              (item.sku || "").toString().toLowerCase(),
              (item.category || "").toString().toLowerCase(),
            ];
            return checks.some((s) => s.includes(q));
          });
          const totalElements = filtered.length;
          const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;
          const startIdx = p * PAGE_SIZE;
          const pageContent = filtered.slice(startIdx, startIdx + PAGE_SIZE);
          setPageResp({ content: pageContent, page: p, size: PAGE_SIZE, totalElements, totalPages });
          setPage(p);
        }
      } else {
        // normal list
        const res = await ProductsService.getProducts(p, PAGE_SIZE);
        setPageResp(res || { content: [], page: p, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
        setPage(p);
      }
    } catch (err) {
      console.error("Load products error", err);
      setPageResp({ content: [], page: p, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  // reset to first page when query or filter changes
  useEffect(() => {
    setPage(0);
    load(0);
    // eslint-disable-next-line
  }, [debouncedQuery, filterType]);

  useEffect(() => {
    load(0);
    // eslint-disable-next-line
  }, []);

  const start = pageResp.totalElements === 0 ? 0 : pageResp.page * pageResp.size + 1;
  const end = Math.min((pageResp.page + 1) * pageResp.size, pageResp.totalElements);

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;
    try {
      await ProductsService.deleteProduct(id);
      // reload current page (if current page becomes empty after delete, go previous)
      const newPageResp = await ProductsService.getProducts(pageResp.page, PAGE_SIZE);
      if ((newPageResp.content || []).length === 0 && pageResp.page > 0) {
        load(pageResp.page - 1);
      } else {
        load(pageResp.page);
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed");
    }
  };

  // number of columns in table (adjust when actions column hidden)
  const colCount = isAdmin ? 7 : 6;

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="products-page">
          <div className="page-header">
            <h2>Products</h2>
            <div className="header-actions">
              <input
                className="search-input"
                placeholder="Search by product name, SKU, category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              {/* Only show Add Product if admin */}
              {isAdmin && <Link to="/products/new" className="btn-primary">+ Add Product</Link>}
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state">Loading…</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th>SKU</th>
                        <th>CATEGORY</th>
                        <th>UNIT PRICE</th>
                        <th>TAX</th>
                        <th>ACTIVE</th>
                        {isAdmin && <th style={{ width: 160, textAlign: "right" }}>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pageResp.content && pageResp.content.length ? (
                        pageResp.content.map((p) => (
                          <tr key={p.id ?? p.sku}>
                            <td className="name-col">{p.name}</td>
                            <td>{p.sku}</td>
                            <td>{p.category}</td>
                            <td>{p.unitPrice ? `₹${Number(p.unitPrice).toFixed(2)}` : ""}</td>
                            <td>{p.taxRate ? `${p.taxRate}%` : ""}</td>
                            <td><input type="checkbox" checked={!!p.isActive} readOnly /></td>

                            {isAdmin ? (
                              <td style={{ textAlign: "right" }}>
                                <Link to={`/products/${p.id}/edit`} className="action-btn action-edit">Edit</Link>
                                <button
                                  className="action-btn action-delete"
                                  onClick={() => handleDelete(p.id)}
                                  style={{ marginLeft: 8 }}
                                >
                                  Delete
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={colCount} style={{ textAlign: "center", padding: 36 }}>No products</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer">
                  <div className="results">Showing {start} to {end} of {pageResp.totalElements} results</div>
                  <Pagination
                    page={pageResp.page || 0}
                    totalPages={Math.max(1, pageResp.totalPages || 1)}
                    onChange={(p) => { setPage(p); load(p); }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
