"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  getCases, 
  getUsers, 
  createCase, 
  initDb, 
  User, 
  Case, 
  CaseStatus,
  getNotifications,
  markNotificationsAsRead,
  Notification
} from "@/lib/db";
import QRCode from "qrcode";
import LicensePlate from "@/components/LicensePlate";
import { 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  QrCode, 
  Copy, 
  Download, 
  Check, 
  Users, 
  Briefcase, 
  Clock, 
  ShieldCheck, 
  Bell, 
  X,
  ChevronRight,
  FolderOpen,
  UserCheck
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assistantFilter, setAssistantFilter] = useState<string>("all");

  // Create Case Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [assignedAssistantId, setAssignedAssistantId] = useState("");
  
  // Success state for case creation
  const [createdCase, setCreatedCase] = useState<Case | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Notification UI state
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDb();
    const storedUser = localStorage.getItem("kfz_current_user");
    if (!storedUser) {
      router.push("/admin");
      return;
    }
    const user = JSON.parse(storedUser) as User;
    setCurrentUser(user);

    // Initial data fetch
    fetchData(user);

    // Close notifications dropdown on click outside
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const fetchData = async (user: User) => {
    const list = await getCases(user);
    // Sort by created_at descending
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setCases(list);

    const users = await getUsers();
    setAllUsers(users);

    const notifs = await getNotifications();
    setNotifications(notifs);
  };

  const handleLogout = () => {
    localStorage.removeItem("kfz_current_user");
    router.push("/admin");
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) return;

    try {
      let assistantId = currentUser?.role === "admin" ? assignedAssistantId : currentUser?.id;
      if (currentUser?.role === "admin" && !assistantId) {
        assistantId = currentUser.id; // Automatically assign to Ali Senhaji (Admin) by default
      }
      const newCase = await createCase(licensePlate, assistantId || undefined);
      
      // Generate QR Code URL
      const clientUrl = `${window.location.origin}/client/${newCase.client_token}`;
      const qrDataUrl = await QRCode.toDataURL(clientUrl, { width: 300, margin: 2 });
      
      setQrCodeUrl(qrDataUrl);
      setCreatedCase(newCase);
      
      // Refresh case list
      if (currentUser) {
        fetchData(currentUser);
      }
    } catch (err) {
      console.error("Error creating case", err);
    }
  };

  const copyLink = () => {
    if (!createdCase) return;
    const clientUrl = `${window.location.origin}/client/${createdCase.client_token}`;
    navigator.clipboard.writeText(clientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setCreatedCase(null);
    setQrCodeUrl("");
    setLicensePlate("");
    setAssignedAssistantId("");
  };

  const handleMarkNotificationsRead = async () => {
    await markNotificationsAsRead();
    if (currentUser) {
      const notifs = await getNotifications();
      setNotifications(notifs);
    }
  };

  // Filtered cases logic
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.client_email && c.client_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.client_phone && c.client_phone.includes(searchTerm));
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    // Assistant filter is only applied if user is admin
    const matchesAssistant = currentUser?.role === "admin" 
      ? (
          assistantFilter === "all" || 
          c.assistant_id === assistantFilter ||
          (assistantFilter === "admin-id-1" && !c.assistant_id)
        )
      : true;

    return matchesSearch && matchesStatus && matchesAssistant;
  });

  // Count stats
  const activeCasesCount = cases.filter(c => c.status !== "Abgeschlossen").length;
  const inAppraisalCount = cases.filter(c => c.status === "Gutachten").length;
  const inLawyerCount = cases.filter(c => c.status === "Rechtsanwalt").length;
  const completedCount = cases.filter(c => c.status === "Abgeschlossen").length;

  if (!currentUser) return null;

  const assistants = allUsers;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/Logo.webp" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">KFZ-Gutachten</h1>
              <p className="text-xs text-slate-400">Ingenieurbüro Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Link to Settings for Admins */}
            {currentUser.role === "admin" && (
              <button
                onClick={() => router.push("/settings")}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 text-slate-200 px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Mitarbeiter verwalten</span>
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) handleMarkNotificationsRead();
                }}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-all relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 py-2 z-40 overflow-hidden transform origin-top-right transition-all">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-sm">Aktivitäten & Uploads</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={async () => {
                          localStorage.setItem("kfz_notifications", JSON.stringify([]));
                          setNotifications([]);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">
                        Keine neuen Benachrichtigungen
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false);
                            router.push(`/dashboard/case/${n.case_id}`);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-3 transition-colors cursor-pointer"
                        >
                          <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 font-medium">Kennzeichen: {n.license_plate}</p>
                            <p className="text-xs text-slate-800 font-semibold truncate mt-0.5">
                              {n.uploaded_by} hat eine Datei hochgeladen:
                            </p>
                            <p className="text-xs text-slate-600 truncate mt-0.5 font-mono">{n.file_name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'})} Uhr
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile and Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold">{currentUser.name}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {currentUser.role === "admin" ? "Administrator" : "Mitarbeiter"}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer"
                title="Ausloggen"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner with role notice */}
        <div className="mb-8 p-4 bg-slate-900 text-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
            <FileText className="w-48 h-48 text-white" />
          </div>
          <div className="z-10">
            <h2 className="text-xl font-bold">Hallo, {currentUser.name}!</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentUser.role === "admin" 
                ? "Hier finden Sie die Übersicht über alle Fälle des Ingenieurbüros." 
                : "Hier finden Sie Ihre Ihnen zugewiesenen KFZ-Gutachten."}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 px-5 py-3 rounded-xl font-semibold shadow-md shadow-sky-500/10 hover:shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Neuer Fall erstellen</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Aktive Fälle</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeCasesCount}</h3>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">In Gutachten</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{inAppraisalCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <ScaleIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Beim Anwalt</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{inLawyerCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Abgeschlossen</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{completedCount}</h3>
            </div>
          </div>
        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Kennzeichen oder E-Mail suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 pl-11 pr-4 py-2.5 rounded-xl outline-none transition-all text-sm focus:ring-2 focus:ring-sky-500/10"
              />
              <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Assistant Filter (Admin only) */}
              {currentUser.role === "admin" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mitarbeiter:</span>
                  <select
                    value={assistantFilter}
                    onChange={(e) => setAssistantFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">Alle Mitarbeiter</option>
                    {assistants.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="all">Alle Stati</option>
                  <option value="Gutachten">Gutachten</option>
                  <option value="Rechtsanwalt">Rechtsanwalt</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cases Table/List */}
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-700 text-lg">Keine Fälle gefunden</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Es wurden keine Fälle gefunden, die den Suchkriterien entsprechen. Erstellen Sie einen neuen Fall.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop/Tablet Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Kennzeichen</th>
                      <th className="py-4 px-6">Zugeordneter Mitarbeiter</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Erstellt am</th>
                      <th className="py-4 px-6">Kunden-Link</th>
                      <th className="py-4 px-6 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCases.map(c => {
                      const staff = allUsers.find(u => u.id === c.assistant_id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="scale-90 origin-left">
                              <LicensePlate plateNumber={c.license_plate} />
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-slate-400" />
                              {c.assistant_id === "admin-id-1" || !c.assistant_id
                                ? "Ali Senhaji"
                                : (staff?.name || "Mitarbeiter")}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            {new Date(c.created_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer hover:underline" title={`${typeof window !== "undefined" ? window.location.origin : ""}/client/${c.client_token}`} onClick={() => {
                                  const link = `${window.location.origin}/client/${c.client_token}`;
                                  navigator.clipboard.writeText(link);
                                  alert("Kunden-Link in die Zwischenablage kopiert!");
                              }}>
                                Kunden-Link
                              </span>
                              <button
                                onClick={() => {
                                  const link = `${window.location.origin}/client/${c.client_token}`;
                                  navigator.clipboard.writeText(link);
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-sky-600 hover:text-sky-800 transition-all cursor-pointer"
                                title="Link kopieren"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => router.push(`/dashboard/case/${c.id}`)}
                              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold transition-colors cursor-pointer"
                            >
                              <span>Ansehen</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredCases.map(c => {
                  const staff = allUsers.find(u => u.id === c.assistant_id);
                  return (
                    <div key={c.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="scale-85 origin-left">
                          <LicensePlate plateNumber={c.license_plate} />
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Zuständig:</span>
                          <span>
                            {c.assistant_id === "admin-id-1" || !c.assistant_id
                              ? "Ali Senhaji"
                              : (staff?.name || "Mitarbeiter")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Erstellt:</span>
                          <span>{new Date(c.created_at).toLocaleDateString("de-DE")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Kundenportal:</span>
                          <span className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer hover:underline" title={`${typeof window !== "undefined" ? window.location.origin : ""}/client/${c.client_token}`} onClick={() => {
                              const link = `${window.location.origin}/client/${c.client_token}`;
                              navigator.clipboard.writeText(link);
                              alert("Kunden-Link in die Zwischenablage kopiert!");
                          }}>
                            Kunden-Link
                          </span>
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/client/${c.client_token}`;
                              navigator.clipboard.writeText(link);
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded text-sky-600 cursor-pointer"
                            title="Link kopieren"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/case/${c.id}`)}
                        className="w-full text-center bg-slate-50 hover:bg-slate-100 text-sky-600 font-semibold py-2 px-4 rounded-xl text-sm transition-colors border border-slate-100 cursor-pointer"
                      >
                        Ansehen & Bearbeiten
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Case Creation & QR Code Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-all border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Neuen Fall erstellen</h3>
              <button 
                onClick={closeCreateModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!createdCase ? (
                /* Step 1: Input License Plate */
                <form onSubmit={handleCreateCase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Fahrzeug-Kennzeichen
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. DD OH 8989"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-800 font-bold font-mono text-center tracking-wider text-lg px-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>

                  {/* Assistant Assignment (Admin Only) */}
                  {currentUser.role === "admin" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Mitarbeiter zuordnen
                      </label>
                      <select
                        value={assignedAssistantId}
                        onChange={(e) => setAssignedAssistantId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white text-slate-700 text-sm rounded-xl px-4 py-3 outline-none transition-all cursor-pointer"
                      >
                        <option value="">Ali Senhaji (Haupt-Admin - Standard)</option>
                        {assistants.filter(a => a.role === "assistant").map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Fall erstellen</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Step 2: Success and QR Code display */
                <div className="flex flex-col items-center text-center space-y-5">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">Fall erfolgreich erstellt!</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Ein eindeutiges Kundenportal und ein QR-Code wurden generiert.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="border border-slate-100 p-4 bg-slate-50 rounded-2xl flex flex-col items-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="Kunden QR-Code" 
                      className="w-44 h-44 object-contain rounded-lg shadow-inner bg-white"
                    />
                    <div className="mt-2 scale-90">
                      <LicensePlate plateNumber={createdCase.license_plate} />
                    </div>
                  </div>

                  {/* Link Input Row */}
                  <div className="w-full flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/client/${createdCase.client_token}`}
                      className="flex-1 bg-transparent text-xs text-slate-500 outline-none px-2 select-all"
                    />
                    <button
                      onClick={copyLink}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Link kopieren"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <a
                      href={qrCodeUrl}
                      download={`QR_Code_${createdCase.license_plate}.png`}
                      className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>QR herunterladen</span>
                    </a>
                    <button
                      onClick={closeCreateModal}
                      className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function StatusBadge({ status }: { status: CaseStatus }) {
  switch (status) {
    case "Gutachten":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200/50">
          Gutachten
        </span>
      );
    case "Rechtsanwalt":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200/50">
          Rechtsanwalt
        </span>
      );
    case "Abgeschlossen":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/50">
          Abgeschlossen
        </span>
      );
    default:
      return null;
  }
}

function ScaleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h18" />
    </svg>
  );
}
