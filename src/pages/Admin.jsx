import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import * as github from '@/lib/githubApi';

const TOKEN_KEY = 'reserve-admin-token';
const DEPLOY_POLL_INTERVAL_MS = 5000;

const emptyUser = () => ({
  firstName: '',
  lastName: '',
  privateNumber: '',
  idNumber: '',
});

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [tokenInput, setTokenInput] = useState('');
  const [loginChecking, setLoginChecking] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployComplete, setDeployComplete] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [formUser, setFormUser] = useState(emptyUser());
  const [formUserName, setFormUserName] = useState('');
  const [saving, setSaving] = useState(false);
  const deployPollRef = useRef(null);
  const deployTriggeredAtRef = useRef(0);

  const persistToken = (t) => {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
    setToken(t);
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

  const stopDeployPoll = useCallback(() => {
    if (deployPollRef.current) {
      clearInterval(deployPollRef.current);
      deployPollRef.current = null;
    }
  }, []);

  const startDeployPoll = useCallback(() => {
    stopDeployPoll();
    deployTriggeredAtRef.current = Date.now();
    deployPollRef.current = setInterval(async () => {
      try {
        const status = await github.getLatestDeployStatus(token);
        const isOurRun = status?.createdAt != null && status.createdAt >= deployTriggeredAtRef.current - 15000;
        if (status?.status === 'completed' && isOurRun) {
          stopDeployPoll();
          setDeploying(false);
          setDeployComplete(true);
          setTimeout(() => setDeployComplete(false), 8000);
        }
        if (status?.conclusion === 'failure' && isOurRun) {
          stopDeployPoll();
          setDeploying(false);
          setError('הבנייה נכשלה. בדוק ב-Actions.');
        }
      } catch {
        // keep polling
      }
    }, DEPLOY_POLL_INTERVAL_MS);
  }, [token, stopDeployPoll]);

  useEffect(() => {
    return () => stopDeployPoll();
  }, [stopDeployPoll]);

  const handleLogout = () => {
    stopDeployPoll();
    persistToken('');
    setTokenInput('');
    setUsers([]);
    setEditing(null);
    setAdding(false);
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const value = (e.target.elements?.token?.value ?? tokenInput).trim();
    if (!value) return;
    setError('');
    setLoginChecking(true);
    try {
      await github.listUsers(value);
      persistToken(value);
      setTokenInput('');
    } catch {
      setError('הטוקן שגוי');
    } finally {
      setLoginChecking(false);
    }
  };

  const triggerDeployAndWait = useCallback(async () => {
    if (!token) return;
    setDeploying(true);
    setDeployComplete(false);
    setError('');
    try {
      await github.triggerDeploy(token);
      startDeployPoll();
    } catch (e) {
      setError(e.message || 'Failed to trigger deploy');
      setDeploying(false);
    }
  }, [token, startDeployPoll]);

  const handleTriggerDeploy = async () => {
    await triggerDeployAndWait();
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
      setError('שם משתמש (נתיב) חובה');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('שם פרטי ושם משפחה חובה');
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
        await triggerDeployAndWait();
      } else if (editing) {
        if (editing.userName === name) {
          await github.updateUser(token, editing.userName, userData, editing._sha);
        } else {
          await github.createUser(token, name, userData);
          await github.deleteUser(token, editing.userName, editing._sha);
        }
        await loadUsers();
        cancelForm();
        await triggerDeployAndWait();
      }
    } catch (e) {
      setError(e.message || 'שמירה נכשלה');
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
      await triggerDeployAndWait();
    } catch (e) {
      setError(e.message || 'מחיקה נכשלה');
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4" dir="rtl">
        <form
          onSubmit={handleLoginSubmit}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
          method="post"
          autoComplete="on"
        >
          <h1 className="text-2xl font-bold text-slate-800 mb-1">פאנל ניהול</h1>
          <p className="text-slate-500 text-sm mb-6">התחבר עם GitHub כדי לערוך משתמשים</p>
          <p className="text-slate-600 text-sm mb-4">
            הכנס Personal Access Token עם הרשאות <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Contents</span> ו־<span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Actions</span>.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <input
            type="password"
            name="token"
            autoComplete="current-password"
            placeholder="ghp_... או github_pat_..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-5 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition"
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
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
      {/* Deploy overlay */}
      {(deploying || deployComplete) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            {deploying && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-slate-600 mx-auto mb-4" />
                <p className="text-slate-800 font-medium">מעדכן את האתר</p>
                <p className="text-slate-500 text-sm mt-1">ה-PDF והדף יתעדכנו בעוד דקה–דקה וחצי</p>
              </>
            )}
            {deployComplete && !deploying && (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-800 font-medium">האתר מעודכן</p>
                <p className="text-slate-500 text-sm mt-1">אפשר לפתוח את דף המשתמש ולהוריד PDF מעודכן</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm px-3 py-2 rounded-xl hover:bg-white/80 transition"
              onClick={handleLogout}
              title="התנתק"
            >
              <LogOut className="w-4 h-4" /> התנתק
            </button>
            <button
              type="button"
              className="flex items-center gap-2 text-sm bg-white border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
              onClick={handleTriggerDeploy}
              disabled={deploying}
              title="בנה ופרסם את האתר מחדש"
            >
              {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              עדכן את האתר
            </button>
          </div>
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
                <label className="block text-sm font-medium text-slate-600 mb-1.5">שם משתמש (נתיב באתר)</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-slate-300 focus:border-slate-300 outline-none"
                  value={formUserName}
                  onChange={(e) => setFormUserName(e.target.value)}
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
                {saving ? 'שומר...' : 'שמור ומעדכן את האתר'}
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
              {users.map((userName) => (
                <li key={userName} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/80 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-slate-800">{userName}</span>
                    <a
                      href={`${siteBase}/${userName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-700 text-sm flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> צפה בדף
                    </a>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      onClick={() => startEdit(userName)}
                      title="ערוך"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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

        <p className="mt-6 text-xs text-slate-400">
          הנתונים נשמרים ב-GitHub. אחרי כל שינוי האתר נבנה מחדש אוטומטית; ה-PDF יתעדכן כשהבנייה מסתיימת.
        </p>
      </div>
    </div>
  );
}
