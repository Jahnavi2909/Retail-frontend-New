// src/pages/sales/SalePOS.jsx
import React, { useEffect, useRef, useState } from "react";
import "../../styles/SalePOS.css";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Search, ShoppingCart, Trash2, LogOut } from "lucide-react";
import { getProducts, searchProducts } from "../../services/ProductsService";
import SalesService from "../../services/SalesService";
import AuthService from "../../services/AuthService";
import { useNavigate } from "react-router-dom";
import RazorPay from "../../components/Rayzorpay";

export default function SalePOS() {
  const navigate = useNavigate();

  // product states
  const [products, setProducts] = useState([]);
  const [fallbackProducts, setFallbackProducts] = useState([]);

  // search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // cart
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [loadingFinalize, setLoadingFinalize] = useState(false);

  // cashier
  const [cashierIdInput, setCashierIdInput] = useState("");

  // scanner
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const lastScannedRef = useRef(null);
  const scanCooldownRef = useRef(null);

  // load initial products
  useEffect(() => {
    (async () => {
      try {
        const res = await getProducts();
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.content)) list = res.content;
        else if (Array.isArray(res?.data?.content)) list = res.data.content;
        setFallbackProducts(list);
        setProducts(list.slice(0, 20));
      } catch (err) {
        console.warn("Initial product load failed", err);
      }
    })();
  }, []);

  // search products
  const performProductSearch = async (term) => {
    const q = (term || "").toString().trim();
    setSearchError("");
    setSearchLoading(true);
    try {
      const resp = await searchProducts({ name: q, sku: q, page: 0, size: 50 });
      const list = Array.isArray(resp) ? resp : resp?.content ?? resp?.data ?? [];
      setProducts(Array.isArray(list) ? list : []);
      if (!list || list.length === 0) setSearchError("No products found.");
    } catch (err) {
      console.error("searchProducts error:", err);
      setSearchError("Search failed â€” showing local results.");
      const arr = fallbackProducts.length ? fallbackProducts : [];
      const ql = q.toLowerCase();
      const filtered = arr.filter((item) =>
        [item.name, item.sku, item.category].some((f) =>
          String(f || "").toLowerCase().includes(ql)
        )
      );
      setProducts(filtered);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") performProductSearch(searchTerm);
  };

  const onSearchClick = () => performProductSearch(searchTerm);

  // cart actions
  const handleAddToCart = (product) => {
    if (!product) return;
    setCart((prev) => {
      const key = product.id ?? product.productId;
      const existing = prev.find((c) => c.id === key);
      if (existing) {
        return prev.map((c) => (c.id === key ? { ...c, qty: c.qty + 1 } : c));
      }
      const unitPrice = Number(product.unitPrice ?? product.price ?? product.mrp ?? 0);
      const taxRate = Number(product.taxRate ?? product.tax ?? 0);
      return [...prev, { id: key, name: product.name ?? product.title ?? "Item", qty: 1, unitPrice, taxRate }];
    });
  };

  const handleRemove = (id) => setCart((prev) => prev.filter((c) => c.id !== id));

  const handleQtyChange = (id, qtyRaw) => {
    const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)));
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const taxTotal = cart.reduce((s, i) => s + i.unitPrice * i.qty * (i.taxRate / 100), 0);
  const discountTotal = (subtotal * discount) / 100;
  const total = +(subtotal + taxTotal - discountTotal).toFixed(2);

  const validateCashierId = () => {
    const v = cashierIdInput === "" ? null : Number(cashierIdInput);
    return Number.isInteger(v) && v > 0;
  };

  const handleCancel = () => {
    setCart([]);
    setDiscount(0);
  };

  // QR scanner
  const handleScannedCode = async (raw) => {
    if (!raw) return;
    const code = String(raw).trim();
    if (!code) return;
    if (lastScannedRef.current === code) return;
    lastScannedRef.current = code;
    clearTimeout(scanCooldownRef.current);
    try {
      const resp = await searchProducts({ name: code, sku: code, page: 0, size: 10 });
      const list = Array.isArray(resp) ? resp : resp?.content ?? resp?.data ?? [];
      let product = list.length ? list[0] : null;
      if (!product) {
        product = fallbackProducts.find(
          (p) =>
            String(p.sku || "").toLowerCase() === code.toLowerCase() ||
            String(p.id || "").toLowerCase() === code.toLowerCase()
        );
      }
      if (product) handleAddToCart(product);
    } catch (err) {
      console.error("scan processing error", err);
    } finally {
      scanCooldownRef.current = setTimeout(() => (lastScannedRef.current = null), 900);
    }
  };

  // finalize sale after successful payment
  const handlePaymentSuccess = async () => {
    if (!validateCashierId()) {
      alert("Please enter a valid Cashier ID before proceeding.");
      return;
    }
    if (cart.length === 0) {
      alert("Add at least one product to cart before finalizing sale.");
      return;
    }

    const itemsPayload = cart.map((c) => ({
      productId: Number(c.id),
      quantity: Number(c.qty),
      unitPrice: Number(c.unitPrice),
      taxRate: Number(c.taxRate),
    }));

    const payload = {
      cashierId: Number(cashierIdInput),
      total: Number(total.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      paymentMode: "RAZORPAY",
      createdAt: new Date().toISOString(),
      items: itemsPayload,
    };

    try {
      setLoadingFinalize(true);
      const res = await SalesService.createSale(payload);
      const saleId = res?.id ?? res?.saleId ?? res?.data?.id ?? null;
      alert(`âœ… Sale created successfully${saleId ? ` (id: ${saleId})` : ""}`);
      handleCancel();
    } catch (err) {
      console.error("Sale creation error:", err);
      alert("âŒ Failed to create sale record after payment.");
    } finally {
      setLoadingFinalize(false);
    }
  };

  const handleLogout = () => {
    try {
      AuthService.logout();
    } catch {}
    navigate("/login");
  };

  return (
    <div className="pos-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2>Smart Retails</h2>

        <div className="cashier-block">
          <label className="label-small">Cashier ID (number)</label>
          <input
            type="number"
            className="input-small"
            placeholder="Enter cashier id"
            value={cashierIdInput}
            onChange={(e) => setCashierIdInput(e.target.value)}
            min="1"
          />
        </div>

        <ul className="sidebar-nav">
          <li onClick={() => navigate("/products")} className="nav-item">
            ðŸ“¦ Products
          </li>
          <li
            onClick={() => navigate("/pos")}
            className={`nav-item ${window.location.pathname === "/pos" ? "active" : ""}`}
          >
            ðŸ§¾ Billing / POS
          </li>
        </ul>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => setCameraEnabled((s) => !s)} className="btn" style={{ width: "100%" }}>
            {cameraEnabled ? "Disable Camera Scanner" : "Enable Camera Scanner"}
          </button>
          {cameraEnabled && (
            <div style={{ marginTop: 8 }}>
              <small className="muted">Point the camera at a barcode/QR to auto-add product.</small>
              <div style={{ marginTop: 8 }}>
                <Scanner
                  onResult={(text) => text && handleScannedCode(text)}
                  onError={(err) => console.warn("QR error", err)}
                  components={{ finder: false }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="pos-main">
        <div className="pos-header">
          <h1>Point of Sale</h1>
        </div>

        <div className="pos-content">
          {/* Search */}
          <div className="product-section">
            <div className="search-bar pos-search">
              <input
                type="text"
                placeholder="Search product by name, SKU or barcode"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={onSearchKeyDown}
                className="search-input"
              />
              <button className="btn search-btn" onClick={onSearchClick} disabled={searchLoading}>
                {searchLoading ? "Searchingâ€¦" : <><Search size={14} /> Search</>}
              </button>
            </div>

            {searchError && <div className="search-error">{searchError}</div>}

            <div className="product-list grid">
              {products.length === 0 ? (
                <div className="no-products">No products. Search to load matches.</div>
              ) : (
                products.map((p) => (
                  <div key={p.id ?? p.productId} className="product-card">
                    <div className="product-card-top">
                      <div className="product-title">{p.name}</div>
                      <div className="product-sub">{p.sku ?? p.id ?? p.productId} â€¢ {p.category ?? "Uncategorized"}</div>
                    </div>
                    <div className="product-card-bottom">
                      <div className="product-price">â‚¹{(p.unitPrice ?? p.price ?? 0).toFixed(2)}</div>
                      <button onClick={() => handleAddToCart(p)} className="btn add-btn">+ Add</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="cart-section">
            <div className="cart-header">
              <ShoppingCart size={18} />
              <h3>Cart</h3>
            </div>

            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Tax %</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <input
                        type="number"
                        value={item.qty}
                        min="1"
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      />
                    </td>
                    <td>â‚¹{item.unitPrice.toFixed(2)}</td>
                    <td>{item.taxRate.toFixed(2)}%</td>
                    <td>
                      â‚¹{(item.unitPrice * item.qty * (1 + item.taxRate / 100)).toFixed(2)}
                    </td>
                    <td>
                      <button className="remove-btn" onClick={() => handleRemove(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 18 }}>
                      Cart is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="cart-summary">
              <p>Subtotal: â‚¹{subtotal.toFixed(2)}</p>
              <p>Tax Total: â‚¹{taxTotal.toFixed(2)}</p>
              <p>Discount ({discount}%): -â‚¹{discountTotal.toFixed(2)}</p>
              <h3>Total: â‚¹{total.toFixed(2)}</h3>
            </div>

            <div className="discount-payment" style={{ marginTop: 12 }}>
              <div className="discount-block">
                <label>Discount (%)</label>
                <input
                  type="number"
                  placeholder="Enter discount"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value || 0))}
                />
              </div>
            </div>

            {/* âœ… Razorpay Integration */}
            <div style={{ marginTop: 20 }}>
              <RazorPay
                amount={total}
                onSuccess={handlePaymentSuccess}
                validateCashierId={validateCashierId}
                onCancel={handleCancel}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
