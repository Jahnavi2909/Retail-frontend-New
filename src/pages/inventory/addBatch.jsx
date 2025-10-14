// src/pages/inventory/AddBatch.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";
import InventoryService from "../../services/InventoryService";
import * as ProductsService from "../../services/ProductsService";

export default function AddBatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingBatch = location.state?.batch || null;

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    costPrice: "",
    expiryDate: "",
    location: "",
    batchNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const resp = await ProductsService.getProducts(0, 100);
        const list = resp?.content || resp?.data || [];
        setProducts(list);
      } catch (err) {
        console.warn("Could not load products", err);
      }
    }
    loadProducts();

    if (editingBatch) {
      setForm({
        productId: editingBatch.productId,
        quantity: editingBatch.quantity,
        costPrice: editingBatch.costPrice,
        expiryDate: editingBatch.expiryDate?.split("T")[0] ?? "",
        location: editingBatch.location ?? "",
        batchNumber: editingBatch.batchNumber,
      });
    }
  }, [editingBatch]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.productId) {
      alert("Please select a product");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        costPrice: Number(form.costPrice),
        expiryDate: form.expiryDate || null,
        location: form.location || "",
        batchNumber: form.batchNumber || "",
      };

      if (editingBatch) {
        await InventoryService.updateBatch(payload);
        alert("Batch updated successfully!");
      } else {
        await InventoryService.createBatch(payload);
        alert("Batch added successfully!");
      }

      navigate("/inventory/stock-by-product");
    } catch (err) {
      console.error("Add batch failed", err);
      alert("Failed to save batch (check console)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <header className="page-header">
          <h2>{editingBatch ? "Edit Batch" : "Add Batch"}</h2>
        </header>

        <div className="form-card">
          <form className="batch-form" onSubmit={onSubmit}>
            <div className="grid-2">
              <label>
                Product
                <select name="productId" value={form.productId} onChange={onChange}>
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Batch Number
                <input
                  type="text"
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={onChange}
                  placeholder="Enter Batch Number"
                />
              </label>
            </div>

            <div className="grid-2">
              <label>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={onChange}
                  placeholder="Quantity"
                />
              </label>

              <label>
                Cost Price
                <input
                  type="number"
                  name="costPrice"
                  value={form.costPrice}
                  onChange={onChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </label>
            </div>

            <div className="grid-2">
              <label>
                Expiry Date
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={onChange}
                />
              </label>

              <label>
                Location
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  placeholder="e.g., RACK-A1"
                />
              </label>
            </div>

            <div className="form-actions form-actions-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingBatch ? "Save Changes" : "Add Batch"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
