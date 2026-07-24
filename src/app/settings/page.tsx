"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  getUsers, 
  createAssistant, 
  updateUser,
  deleteUser,
  initDb, 
  User 
} from "@/lib/db";
import { 
  ArrowLeft, 
  UserPlus, 
  Mail, 
  UserCheck, 
  KeyRound, 
  ShieldAlert, 
  Check, 
  Users, 
  Clock,
  Pencil,
  Trash2,
  X
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Edit Modal fields
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Success / error states
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initDb();
    const storedUser = localStorage.getItem("kfz_current_user");
    if (!storedUser) {
      router.push("/admin");
      return;
    }
    const user = JSON.parse(storedUser) as User;
    setCurrentUser(user);

    if (user.role !== "admin") {
      // Non-admins can't view settings
      setLoading(false);
      return;
    }

    fetchAssistants();
  }, [router]);

  const fetchAssistants = async () => {
    try {
      const users = await getUsers();
      setAssistants(users.filter(u => u.role === "assistant"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setFormLoading(true);

    try {
      await createAssistant(name, email, password);
      setSuccess(`Mitarbeiter "${name}" wurde erfolgreich angelegt!`);
      
      // Clear form
      setName("");
      setEmail("");
      setPassword("");

      // Refresh list
      fetchAssistants();
    } catch (err: any) {
      setError(err.message || "Fehler beim Erstellen des Mitarbeiters.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword(u.password || "");
    setEditError("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError("");

    try {
      await updateUser(editingUser.id, {
        name: editName,
        email: editEmail,
        password: editPassword,
      });
      setSuccess(`Mitarbeiter "${editName}" wurde erfolgreich aktualisiert!`);
      setEditingUser(null);
      fetchAssistants();
    } catch (err: any) {
      setEditError(err.message || "Fehler beim Aktualisieren.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = async (u: User) => {
    if (window.confirm(`Mitarbeiter "${u.name}" wirklich löschen?`)) {
      try {
        await deleteUser(u.id);
        setSuccess(`Mitarbeiter "${u.name}" wurde gelöscht.`);
        fetchAssistants();
      } catch (err: any) {
        setError(err.message || "Fehler beim Löschen.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Lade Einstellungen...</p>
      </div>
    );
  }

  // Access check
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-slate-800">Zugriff verweigert</h3>
        <p className="text-slate-500 mt-2">
          Diese Seite steht nur Administratoren zur Verfügung. Bitte kontaktieren Sie den Systemadministrator.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zum Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 pb-16">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Zurück zum Dashboard</span>
          </button>
          
          <h1 className="text-base font-bold">Mitarbeiterverwaltung</h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Create Assistant Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <UserPlus className="w-5 h-5 text-sky-500" />
              <span>Assistenten anlegen</span>
            </h2>

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl flex items-start gap-2.5 animate-fade-in">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 text-sm rounded-xl flex items-start gap-2.5 animate-fade-in">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssistant} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Vollständiger Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-4 py-2.5 pl-10 rounded-xl outline-none transition-all placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-sky-500/10"
                  />
                  <UserCheck className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  E-Mail-Adresse / Benutzername
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mitarbeiter@gutachten.de"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-4 py-2.5 pl-10 rounded-xl outline-none transition-all placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-sky-500/10"
                  />
                  <Mail className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-4 py-2.5 pl-10 rounded-xl outline-none transition-all placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-sky-500/10"
                  />
                  <KeyRound className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 rounded-xl shadow-md shadow-sky-500/10 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{formLoading ? "Wird angelegt..." : "Mitarbeiter erstellen"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Columns: List of Assistants */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" />
                <span>Registrierte Assistenten / Mitarbeiter ({assistants.length})</span>
              </h2>
            </div>

            {assistants.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Keine Assistenten angelegt. Nutzen Sie das linke Formular, um den ersten Mitarbeiter anzulegen.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Benutzername / E-Mail</th>
                      <th className="py-4 px-6">Rolle</th>
                      <th className="py-4 px-6">Registriert am</th>
                      <th className="py-4 px-6 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {assistants.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-800">{a.name}</td>
                        <td className="py-4 px-6 text-slate-600 font-mono text-xs">{a.email}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                            Assistent
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(a.created_at).toLocaleDateString("de-DE")}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(a)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Bearbeiten"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(a)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal Popup */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-500" />
                <span>Mitarbeiter bearbeiten</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-3.5 py-2.5 pl-10 rounded-xl outline-none transition-all text-sm focus:ring-2 focus:ring-sky-500/10"
                  />
                  <UserCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  E-Mail-Adresse / Benutzername
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-3.5 py-2.5 pl-10 rounded-xl outline-none transition-all text-sm focus:ring-2 focus:ring-sky-500/10"
                  />
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 px-3.5 py-2.5 pl-10 rounded-xl outline-none transition-all text-sm font-mono focus:ring-2 focus:ring-sky-500/10"
                  />
                  <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-sm"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-sm disabled:opacity-50"
                >
                  {editLoading ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
