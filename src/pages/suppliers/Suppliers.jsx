import React, { useEffect, useState } from "react";
import "../../styles/Suppliers.css";
import { NavLink } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";

const API_BASE =
  "http://smartest-env.eba-febxxxwz.ap-south-1.elasticbeanstalk.com/api/suppliers";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    isActive: true,
  });
  const [toast, setToast] = useState(null);

  // ✅ Tailwind Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ Load suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(API_BASE, {
        headers: { Authorization: 'Bearer ${Cookies.get("sr_token")}' }
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setSuppliers(list);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      showToast("Failed to fetch suppliers", "error");
    }
  };

  // ✅ Handle form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ✅ Add or Update Supplier
  const handleAddOrUpdateSupplier = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      showToast("Please fill all required fields!", "error");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone?.trim() || "",
      address: formData.address?.trim() || null,
      contactPerson: formData.contactPerson?.trim() || null,
      isActive: formData.isActive,
    };

    try {
      if (editingSupplier) {
        // PUT
        const res = await axios.put(
          `${API_BASE}/${editingSupplier.id}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("sr_token")}`,
            },
          }
        );
        const updated = res.data?.data || res.data;
        setSuppliers((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        showToast("Supplier updated successfully!", "success");
      } else {
        // POST
        const res = await axios.post(API_BASE, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("sr_token")}`,
          },
        });
        const created = res.data?.data || res.data;
        setSuppliers((prev) => [...prev, created]);
        showToast("Supplier added successfully!", "success");
      }

      handleCancel();
    } catch (err) {
      console.error("Error saving supplier:", err);
      const msg =
        err.response?.data?.data ||
        err.response?.data?.message ||
        "Failed to save supplier.";
      showToast(msg, "error");
    }
  };

  // ✅ Edit supplier
  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contactPerson || "",
      isActive: supplier.isActive,
    });
    setShowForm(true);
  };

  // ✅ Delete supplier
  const handleDelete = async (supplierId) => {
    if (!window.confirm("Are you sure you want to delete this supplier?"))
      return;

    try {
      await axios.delete(`${API_BASE}/${supplierId}`, {
        headers: { Authorization:` Bearer ${Cookies.get("sr_token")} `},
      });

      // Remove deleted supplier and reindex rows
      setSuppliers((prev) =>
        prev
          .filter((s) => s.id !== supplierId)
          .map((s, index) => ({ ...s, displayIndex: index + 1 }))
      );

      showToast("Supplier deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting supplier:", err);
      showToast("Failed to delete supplier", "error");
    }
  };

  // ✅ Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      isActive: true,
    });
  };

  return (
    <div className="suppliers-page">
      {/* Sidebar */}
      
     <Sidebar/>
     

      {/* Main content */}
      <div className="main-content">
        <header className="navbar">
          <h1>Suppliers</h1>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            ➕ Add Supplier
          </button>
        </header>

        {/* Supplier Table */}
        <section className="supplier-table">
          <input
            type="text"
            placeholder="Search suppliers..."
            className="search-bar"
          />
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>CONTACT</th>
                <th>ADDRESS</th>
                <th>ACTIVE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No suppliers found
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier, index) => (
                  <tr key={supplier.id}>
                    <td>{index + 1}</td>
                    <td>{supplier.name}</td>
                    <td>{supplier.email}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.contactPerson || "-"}</td>
                    <td>{supplier.address || "-"}</td>
                    <td>{supplier.isActive ? "Yes" : "No"}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(supplier)}
                      >
                        ✏ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Modal Form */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h3>
              <form onSubmit={handleAddOrUpdateSupplier}>
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="contactPerson"
                  placeholder="Contact Person"
                  value={formData.contactPerson}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                />
                <label style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    style={{ marginRight: "8px" }}
                  />
                  Active
                </label>

                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    {editingSupplier ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ✅ Tailwind Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 px-4 py-2 rounded text-white shadow-md transition-all ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;