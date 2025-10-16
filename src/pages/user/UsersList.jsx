// src/pages/user/UsersList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import UsersService from "../../services/UsersService";
import "../../styles.css";

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // initial load
    loadUsers();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // If navigated back with state.updated, reload list
    if (location && location.state && location.state.updated) {
      loadUsers()
        .then(() => {
          // clear history state so this effect doesn't retrigger repeatedly
          try {
            window.history.replaceState({}, "", location.pathname);
          } catch (e) { /* ignore */ }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line
  }, [location && location.state && location.state.updated]);

  // normalize many shapes into array
  function normalizeUserList(resp) {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.content)) return resp.content;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.users)) return resp.users;
    // sometimes server returns { success:true, data: { ... } }
    if (resp.data && Array.isArray(resp.data.content)) return resp.data.content;
    if (resp.data && Array.isArray(resp.data)) return resp.data;
    // single user object
    if (typeof resp === "object" && (resp.username || resp.id || resp._id)) return [resp];
    console.warn("UsersList: unexpected users response shape", resp);
    return [];
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await UsersService.getUsers();
      const list = normalizeUserList(res);
      setUsers(list);
    } catch (err) {
      console.error("getUsers failed", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  // Format role into readable text (Admin, Manager, Cashier)
  function formatRole(role) {
    if (!role) return "";
    // role may be array, object, or string
    let r = role;
    if (Array.isArray(role)) r = role[0];
    if (typeof role === "object") {
      r = role.name ?? role.role ?? JSON.stringify(role);
    }
    if (typeof r !== "string") r = String(r);
    // remove ROLE_ or role_ or ROLE- patterns
    r = r.replace(/^ROLE[_\-]/i, "").replace(/^role[_\-]/i, "");
    r = r.toLowerCase();
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  async function togglePasswordReveal(id) {
    const current = revealedPasswords[id];
    if (current && current.visible) {
      setRevealedPasswords(prev => ({ ...prev, [id]: { ...prev[id], visible: false } }));
      return;
    }

    try {
      const res = await UsersService.getUser(id);
      const user = res?.data ?? res;
      const pwd = user?.password ?? user?.plainPassword ?? null;
      if (pwd) {
        setRevealedPasswords(prev => ({ ...prev, [id]: { value: pwd, visible: true } }));
      } else {
        setRevealedPasswords(prev => ({ ...prev, [id]: { value: null, visible: true } }));
        alert("Password not available from server. Use reset password flow if needed.");
      }
    } catch (err) {
      console.error("Failed to fetch user for password reveal", err);
      alert("Could not retrieve password (see console).");
    }
  }

  function onCreate() {
    navigate("/auth/user/new");
  }

  function onEdit(id) {
    navigate(`/auth/user/${id}/edit`);
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await UsersService.deleteUser(id);
      await loadUsers();
      alert("User deleted");
    } catch (err) {
      console.error("deleteUser error", err);
      alert("Delete failed (see console).");
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header">
          <h2>Users</h2>
          <div className="header-actions">
            <button className="btn-primary" onClick={onCreate}>+ Create User</button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading">Loading…</div>
          ) : (
            <div className="table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 28 }}>No users found</td>
                    </tr>
                  ) : users.map((u, idx) => {
                    const id = u.id ?? u._id ?? u.username ?? idx;
                    const rp = revealedPasswords[id] || {};
                    const shown = rp.visible && rp.value ? rp.value : null;
                    const noPlaintext = rp.visible && rp.value === null;

                    return (
                      <tr key={id}>
                        <td>{idx + 1}</td>
                        <td>{u.username}</td>
                        <td>{formatRole(u.role)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "monospace" }}>
                              {shown ? shown : "••••••••"}
                            </span>
                            <button
                              className="action-btn"
                              onClick={() => togglePasswordReveal(id)}
                              title={rp.visible ? "Hide password" : "Show password"}
                            >
                              {rp.visible ? "🙈" : "👁️"}
                            </button>
                            {noPlaintext && <small style={{ color: "#8b9aa6" }}> (not available)</small>}
                          </div>
                        </td>
                        <td >
                          <button className="action-btn action-edit" onClick={() => onEdit(id)}>Edit</button>
                          <button className="action-btn action-delete" onClick={() => onDelete(id)} style={{ marginLeft: 8 }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
