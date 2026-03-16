import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import * as github from '@/lib/githubApi';

const TOKEN_KEY = 'reserve-admin-token';

const emptyUser = () => ({
  firstName: '',
  lastName: '',
  privateNumber: '',
  idNumber: '',
});

export default function Admin() {
  const [token, setTokenState] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [editing, setEditing] = useState(null); // { userName, ...userData, _sha }
  const [adding, setAdding] = useState(false);
  const [formUser, setFormUser] = useState(emptyUser());
  const [formUserName, setFormUserName] = useState('');
  const [saving, setSaving] = useState(false);

  const setToken = (t) => {
    setTokenState(t);
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  };

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const list = await github.listUsers(token);
      setUsers(list);
    } catch (e) {
      setError(e.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleLogout = () => {
    setToken('');
    setUsers([]);
    setEditing(null);
    setAdding(false);
    setError('');
  };

  const handleTriggerDeploy = async () => {
    if (!token) return;
    setDeploying(true);
    setError('');
    try {
      await github.triggerDeploy(token);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to trigger deploy');
    } finally {
      setDeploying(false);
    }
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setFormUser(emptyUser());
    setFormUserName('');
    setError('');
  };

  const startEdit = async (userName) => {
    setError('');
    setAdding(false);
    try {
      const user = await github.getUser(token, userName);
      if (user) {
        setEditing({ userName, ...user });
        setFormUser({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          privateNumber: user.privateNumber ?? '',
          idNumber: user.idNumber ?? '',
        });
        setFormUserName(userName);
      }
    } catch (e) {
      setError(e.message || 'Failed to load user');
    }
  };

  const cancelForm = () => {
    setAdding(false);
    setEditing(null);
    setFormUser(emptyUser());
    setFormUserName('');
    setError('');
  };

  const saveUser = async () => {
    if (!token) return;
    const { firstName, lastName, privateNumber, idNumber } = formUser;
    const name = formUserName.trim().toLowerCase();
    if (!name) {
      setError('Username (path) is required');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }
    const userData = { firstName, lastName, privateNumber, idNumber };
    setSaving(true);
    setError('');
    try {
      if (adding) {
        await github.createUser(token, name, userData);
        await loadUsers();
        cancelForm();
      } else if (editing) {
        if (editing.userName === name) {
          await github.updateUser(token, editing.userName, userData, editing._sha);
        } else {
          await github.createUser(token, name, userData);
          await github.deleteUser(token, editing.userName, editing._sha);
        }
        await loadUsers();
        cancelForm();
      }
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userName, sha) => {
    if (!token || !confirm(`למחוק את המשתמש "${userName}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await github.deleteUser(token, userName, sha);
      await loadUsers();
      if (editing?.userName === userName) cancelForm();
    } catch (e) {
      setError(e.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (userName) => {
    try {
      const user = await github.getUser(token, userName);
      if (user?._sha) deleteUser(userName, user._sha);
    } catch {
      setError('לא ניתן לטעון משתמש למחיקה');
    }
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const siteBase = `${window.location.origin}${basePath}`;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">פאנל ניהול – התחברות</h1>
          <p className="text-sm text-gray-600 mb-4">
            הכנס GitHub Personal Access Token עם הרשאת <code className="bg-gray-100 px-1 rounded">repo</code> (או Fine-grained עם גישה לריפו הזה).
          </p>
          <input
            type="password"
            placeholder="ghp_..."
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            value={token}
            onChange={(e) => setTokenState(e.target.value)}
          />
          <button
            type="button"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium"
            onClick={() => setToken(token)}
          >
            התחבר
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">פאנל ניהול משתמשים</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              onClick={handleLogout}
              title="התנתק"
            >
              <LogOut className="w-4 h-4" /> התנתק
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-sm border border-gray-300 rounded px-2 py-1 hover:bg-gray-100"
              onClick={handleTriggerDeploy}
              disabled={deploying}
              title="הרץ בנייה ופרסום מחדש"
            >
              {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              עדכן את האתר
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded font-medium"
            onClick={startAdd}
            disabled={adding || !!editing}
          >
            <Plus className="w-4 h-4" /> הוסף משתמש
          </button>
        </div>

        {(adding || editing) && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">{adding ? 'משתמש חדש' : 'עריכת משתמש'}</h2>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">שם משתמש (נתיב באתר)</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formUserName}
                  onChange={(e) => setFormUserName(e.target.value)}
                  placeholder="e.g. gal"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">שם פרטי</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formUser.firstName}
                  onChange={(e) => setFormUser((u) => ({ ...u, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">שם משפחה</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formUser.lastName}
                  onChange={(e) => setFormUser((u) => ({ ...u, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">מספר אישי</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formUser.privateNumber}
                  onChange={(e) => setFormUser((u) => ({ ...u, privateNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">ת.ז.</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={formUser.idNumber}
                  onChange={(e) => setFormUser((u) => ({ ...u, idNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
                onClick={saveUser}
                disabled={saving}
              >
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded"
                onClick={cancelForm}
                disabled={saving}
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין משתמשים או שלא נטענו.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {users.map((userName) => (
                <li key={userName} className="flex items-center justify-between gap-2 p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-900">{userName}</span>
                    <a
                      href={`${siteBase}/${userName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-0.5 text-sm"
                    >
                      <ExternalLink className="w-3 h-3" /> צפה בדף
                    </a>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                      onClick={() => startEdit(userName)}
                      title="ערוך"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      onClick={() => handleDeleteClick(userName)}
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500">
          הנתונים נשמרים בקובצי JSON בריפו ב-GitHub. אחרי שינוי הרץ &quot;עדכן את האתר&quot; כדי לבנות ולפרסם מחדש.
        </p>
      </div>
    </div>
  );
}
