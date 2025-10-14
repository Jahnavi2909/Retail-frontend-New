import React, { useEffect, useState } from "react";
import "../../styles/PurchaseOrders.css";
import { NavLink } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";

const API_BASE =
  "http://smartest-env.eba-febxxxwz.ap-south-1.elasticbeanstalk.com/api/purchase-orders";

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState([]); // For dropdown

  const [newOrder, setNewOrder] = useState({
    poNumber: "",
    supplierId: "",
    expectedDate: "",
    notes: "",
    status: "Pending",
  });

  // ✅ Tailwind Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ Fetch suppliers + purchase orders
  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(
        "http://smartest-env.eba-febxxxwz.ap-south-1.elasticbeanstalk.com/api/suppliers",
        { headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } }
      );
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setSuppliers(list);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      showToast("Failed to fetch suppliers", "error");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(API_BASE, {
        headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(list);
    } catch (err) {
      console.error("Error fetching orders:", err);
      showToast("Failed to fetch purchase orders", "error");
    }
  };

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewOrder((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Add or Update order
  const handleAddOrUpdateOrder = async (e) => {
    e.preventDefault();

    if (!newOrder.supplierId || !newOrder.poNumber || !newOrder.expectedDate) {
      showToast("Please fill all required fields!", "error");
      return;
    }

    const payload = {
      poNumber: newOrder.poNumber.trim(),
      supplierId: Number(newOrder.supplierId), // ✅ backend expects supplierId
      expectedDate: newOrder.expectedDate,
      notes: newOrder.notes?.trim() || "",
      status: newOrder.status,
    };

    try {
      if (editingOrder) {
        // PUT - update
        const res = await axios.put(`${API_BASE}/${editingOrder.id}`, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("sr_token")}`,
          },
        });
        const updated = res.data?.data || res.data;
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
        showToast("Order updated successfully!", "success");
      } else {
        // POST - create new
        const res = await axios.post(API_BASE, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("sr_token")}`,
          },
        });
        const created = res.data?.data || res.data;
        setOrders((prev) => [...prev, created]);
        showToast("Order added successfully!", "success");
      }

      handleCancel();
    } catch (err) {
      console.error("Error saving order:", err);
      const msg =
        err.response?.data?.data ||
        err.response?.data?.message ||
        "Failed to save order.";
      showToast(msg, "error");
    }
  };

  // ✅ Delete order
  const handleDelete = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      await axios.delete(`${API_BASE}/${orderId}`, {
        headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
      });
      setOrders((prev) =>
        prev
          .filter((o) => o.id !== orderId)
          .map((o, index) => ({ ...o, displayIndex: index + 1 }))
      );
      showToast("Order deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting order:", err);
      showToast("Failed to delete order", "error");
    }
  };

  // ✅ Edit order
  const handleEdit = (order) => {
    setEditingOrder(order);
    setNewOrder({
      poNumber: order.poNumber || "",
      supplierId: order.supplierId || "",
      expectedDate: order.expectedDate || "",
      notes: order.notes || "",
      status: order.status || "Pending",
    });
    setShowForm(true);
  };

  // ✅ Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingOrder(null);
    setNewOrder({
      poNumber: "",
      supplierId: "",
      expectedDate: "",
      notes: "",
      status: "Pending",
    });
  };

  // ✅ Filter orders
  const filteredOrders = orders.filter((order) =>
    Object.values(order)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="purchase-page">
     
      <Sidebar/>
      

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Purchase Orders</h1>
          <button className="new-order-btn" onClick={() => setShowForm(true)}>
            ➕ New Order
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search Purchase Orders"
          className="search-bar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Orders Table */}
        <table className="orders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Expected Date</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order, index) => (
                <tr key={order.id || index}>
                  <td>{index + 1}</td>
                  <td>{order.poNumber}</td>
                  <td>
                    {
                      suppliers.find((s) => s.id === order.supplierId)?.name ||
                      order.supplierId
                    }
                  </td>
                  <td>{order.expectedDate}</td>
                  <td>{order.notes}</td>
                  <td>
                    <span
                      className={`status-badge ${order.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(order)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(order.id)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "15px" }}>
                  No matching orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Modal Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingOrder ? "Edit Purchase Order" : "New Purchase Order"}</h3>
            <form onSubmit={handleAddOrUpdateOrder}>
              <input
                type="text"
                name="poNumber"
                placeholder="PO Number"
                value={newOrder.poNumber}
                onChange={handleChange}
                required
              />

              <select
                name="supplierId"
                value={newOrder.supplierId}
                onChange={handleChange}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="expectedDate"
                value={newOrder.expectedDate}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="notes"
                placeholder="Notes"
                value={newOrder.notes}
                onChange={handleChange}
              />
              <select
                name="status"
                value={newOrder.status}
                onChange={handleChange}
              >
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Received">Received</option>
                <option value="In Progress">In Progress</option>
              </select>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingOrder ? "Update" : "Save"}
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

      {/* ✅ Toast Notification */}
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
  );
};

export default PurchaseOrders;
