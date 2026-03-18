import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  deleteUser as deleteDbUser,
  listUsers,
  saveUser as saveDbUser,
  verifyAdminPassword,
} from '@/lib/reserveDb';

const SESSION_KEY = 'reserve-admin-session';

const emptyUser = () => ({
  englishName: '',
  firstName: '',
  lastName: '',
  privateNumber: '',
  idNumber: '',
});

export default function Admin() {
  const [password, setPassword] = useState('');
  const [loginChecking, setLoginChecking] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [formUser, setFormUser] = useState(emptyUser());
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError('');
    try {
      const list = await listUsers();
      setUsers(list);
    } catch (e) {
      setError(e.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setPassword('');
    setUsers([]);
    setEditing(null);
    setAdding(false);
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const value = password.trim();
    if (!value) return;
    setError('');
    setLoginChecking(true);
    try {
      const isValid = await verifyAdminPassword(value);
      if (!isValid) {
        setError('הסיסמה שגויה');
        return;
      }
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
      setPassword('');
    } catch {
      setError('לא ניתן להתחבר למסד הנתונים');
    } finally {
      setLoginChecking(false);
    }
  };

  const startAdd = () => {
    setAdding(true);
    setEditing(null);
    setFormUser(emptyUser());
    setError('');
  };

  const startEdit = async (user) => {
    setError('');
    setAdding(false);
    try {
      if (user) {
        setEditing(user);
        setFormUser({
          englishName: user.englishName ?? '',
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          privateNumber: user.privateNumber ?? '',
          idNumber: user.idNumber ?? '',
        });
      }
    } catch (e) {
      setError(e.message || 'Failed to load user');
    }
  };

  const cancelForm = () => {
    setAdding(false);
    setEditing(null);
    setFormUser(emptyUser());
    setError('');
  };

  const saveUser = async () => {
    if (!authenticated) return;
    const { englishName, firstName, lastName, privateNumber, idNumber } = formUser;
    const name = englishName.trim().toLowerCase();
    if (!name) {
      setError('שם באנגלית (נתיב) חובה');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('שם פרטי ושם משפחה חובה');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveDbUser({
        englishName: name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        privateNumber: privateNumber.trim(),
        idNumber: idNumber.trim(),
      });
      await loadUsers();
      cancelForm();
    } catch (e) {
      setError(e.message || 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (englishName) => {
    if (!authenticated || !confirm(`למחוק את המשתמש "${englishName}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await deleteDbUser(englishName);
      await loadUsers();
      if (editing?.englishName === englishName) cancelForm();
    } catch (e) {
      setError(e.message || 'מחיקה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const siteBase = `${window.location.origin}${basePath}`;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
          method="post"
          autoComplete="on"
        >
          <h1 className="text-2xl font-bold text-slate-800 mb-1">פאנל ניהול</h1>
          <p className="text-slate-500 text-sm mb-6">התחבר עם סיסמת הניהול כדי לערוך משתמשים</p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <input
            type="password"
            autoComplete="current-password"
            placeholder="סיסמת ניהול"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-5 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            disabled={loginChecking}
          />
          <button
            type="submit"
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loginChecking}
          >
            {loginChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loginChecking ? 'בודק...' : 'התחבר'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <div className="max-w-2xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
          <button
            type="button"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm px-3 py-2 rounded-xl hover:bg-white/80 transition"
            onClick={handleLogout}
            title="התנתק"
          >
            <LogOut className="w-4 h-4" /> התנתק
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="mb-6 flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-slate-700 transition disabled:opacity-50"
            onClick={startAdd}
            disabled={adding || !!editing}
          >
            <Plus className="w-4 h-4" /> הוסף משתמש
          </button>
        </div>

        {(adding || editing) && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{adding ? 'משתמש חדש' : 'עריכת משתמש'}</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">שם באנגלית (נתיב באתר)</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 focus:border-slate-300 outline-none"
                  value={formUser.englishName}
                  onChange={(e) => setFormUser((u) => ({ ...u, englishName: e.target.value }))}
                  placeholder="למשל gal"
                  disabled={!!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">שם פרטי</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 outline-none"
                    value={formUser.firstName}
                    onChange={(e) => setFormUser((u) => ({ ...u, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">שם משפחה</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 outline-none"
                    value={formUser.lastName}
                    onChange={(e) => setFormUser((u) => ({ ...u, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">מספר אישי</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 outline-none"
                    value={formUser.privateNumber}
                    onChange={(e) => setFormUser((u) => ({ ...u, privateNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">ת.ז.</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 outline-none"
                    value={formUser.idNumber}
                    onChange={(e) => setFormUser((u) => ({ ...u, idNumber: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition disabled:opacity-50 flex items-center gap-2"
                onClick={saveUser}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button
                type="button"
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                onClick={cancelForm}
                disabled={saving}
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">אין משתמשים.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {users.map((user) => (
                <li key={user.englishName} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 transition">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800">{user.englishName}</div>
                    <div className="text-sm text-slate-500">
                      {user.firstName} {user.lastName}
                    </div>
                    <a
                      href={`${siteBase}/${user.englishName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-700 text-sm flex items-center gap-1 shrink-0 mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> צפה בדף
                    </a>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      onClick={() => startEdit(user)}
                      title="ערוך"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      onClick={() => deleteUser(user.englishName)}
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

        <p className="mt-6 text-xs text-slate-400">
          הנתונים נשמרים ישירות במסד הנתונים, והדף מתעדכן מיד בלי בניית אתר מחדש.
        </p>
      </div>
    </div>
  );
}
