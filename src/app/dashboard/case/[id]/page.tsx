"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getCaseById, 
  getFilesForCase, 
  getUsers, 
  updateCase, 
  uploadFile, 
  Case, 
  CaseFile, 
  User, 
  CaseStatus 
} from "@/lib/db";
import LicensePlate from "@/components/LicensePlate";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  FileText, 
  Shield, 
  UserPlus, 
  Upload, 
  Download, 
  Check, 
  AlertCircle,
  FileCheck,
  Image as ImageIcon,
  User as UserIcon,
  ChevronRight,
  Send,
  Eye,
  Copy
} from "lucide-react";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form inputs for editing
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>("Gutachten");
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Additional file upload state
  const [uploadType, setUploadType] = useState<CaseFile["file_type"]>("additional");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  const handleCopyEmail = () => {
    if (caseData?.client_email) {
      navigator.clipboard.writeText(caseData.client_email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyLocation = () => {
    if (caseData?.accident_location) {
      navigator.clipboard.writeText(caseData.accident_location);
      setCopiedLocation(true);
      setTimeout(() => setCopiedLocation(false), 2000);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("kfz_current_user");
    if (!storedUser) {
      router.push("/admin");
      return;
    }
    const user = JSON.parse(storedUser) as User;
    setCurrentUser(user);

    fetchCaseDetails(user);
  }, [caseId, router]);

  const fetchCaseDetails = async (user: User) => {
    setLoading(true);
    try {
      const data = await getCaseById(caseId, user);
      if (!data) {
        setErrorMsg("Fall nicht gefunden oder kein Zugriff.");
        setLoading(false);
        return;
      }
      setCaseData(data);
      setSelectedStatus(data.status);
      setSelectedAssistantId(data.assistant_id || "");

      const list = await getFilesForCase(caseId);
      setFiles(list);

      if (user.role === "admin") {
        const usersList = await getUsers();
        setAssistants(usersList.filter(u => u.role === "assistant"));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Fehler beim Laden des Falls.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateCase(caseId, {
        status: selectedStatus,
        assistant_id: selectedAssistantId || undefined,
      }, currentUser.role);

      setSuccessMsg("Änderungen erfolgreich gespeichert!");
      setTimeout(() => setSuccessMsg(""), 3000);
      
      // Refresh details
      fetchCaseDetails(currentUser);
    } catch (err) {
      setErrorMsg("Fehler beim Aktualisieren des Falls.");
    }
  };

  // Read upload files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !caseData) return;
    setUploadLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await uploadFile(
          caseId,
          uploadType,
          file.name,
          base64,
          currentUser.role
        );
        // Refresh files
        const list = await getFilesForCase(caseId);
        setFiles(list);
        setFileName("");
        
        // Show success alert
        setSuccessMsg(`Datei "${file.name}" erfolgreich hochgeladen!`);
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Upload fehlgeschlagen: " + (err.message || err));
      } finally {
        setUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Lade Fall-Details...</p>
      </div>
    );
  }

  if (errorMsg && !caseData) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-slate-800">Zugriff verweigert</h3>
        <p className="text-slate-500 mt-2">{errorMsg}</p>
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

  if (!caseData || !currentUser) return null;

  // Group files by type
  const scheckheftFiles = files.filter(f => f.file_type === "scheckheft");
  const accidentCardFiles = files.filter(f => f.file_type === "accident_card");
  const photoFiles = files.filter(f => f.file_type === "accident_photos");
  const additionalFiles = files.filter(f => f.file_type === "additional");

  const hasClientSubmitted = caseData.client_email || caseData.client_phone;

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
            <span className="text-sm font-medium">Zurück</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="scale-75 origin-center">
              <LicensePlate plateNumber={caseData.license_plate} />
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">(Internes Aktenzeichen)</span>
          </div>

          <div className="text-right text-xs text-slate-400 font-semibold text-slate-300">
            Zuständig: {caseData.assistant_id === "admin-id-1" || !caseData.assistant_id
              ? "Ali Senhaji"
              : (assistants.find(a => a.id === caseData.assistant_id)?.name || "Mitarbeiter")}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Client Details & Uploaded Files */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Success messages */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
              <Check className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Client Details Section */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <span>Schadensmeldung des Kunden</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                hasClientSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {hasClientSubmitted ? 'Ausgefüllt' : 'Wartet auf Angaben'}
              </span>
            </div>

            {!hasClientSubmitted ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-500 font-medium">Der Kunde hat das Formular noch nicht ausgefüllt.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Der Kunde kann über folgenden Link auf das Portal zugreifen:
                </p>
                <div className="mt-3 max-w-md mx-auto flex items-center bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/client/${caseData.client_token}`}
                    className="flex-1 bg-transparent text-xs text-slate-500 outline-none px-2 select-all"
                  />
                  <a
                    href={`/client/${caseData.client_token}`}
                    target="_blank"
                    className="bg-slate-900 text-white hover:bg-slate-800 p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Öffnen</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Case Details Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Kundenkontakt</h3>
                  <div className="space-y-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">E-Mail:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 break-all">{caseData.client_email || "-"}</span>
                        {caseData.client_email && (
                          <button
                            onClick={handleCopyEmail}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none"
                            title="E-Mail kopieren"
                          >
                            {copiedEmail ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Telefon:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 text-sm sm:text-base">{caseData.client_phone || "-"}</span>
                        {caseData.client_phone && (
                          <a
                            href={`https://wa.me/${caseData.client_phone.replace(/[^\d+]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center select-none"
                            title="Über WhatsApp kontaktieren"
                          >
                            <img 
                              src="/whatsapp-icon.png" 
                              alt="WhatsApp" 
                              width={28} 
                              height={28} 
                              className="w-7 h-7 object-contain"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-slate-400 text-xs">Eigenes Kennzeichen:</span>
                      <div className="scale-85 origin-left">
                        <LicensePlate plateNumber={caseData.license_plate} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Unfalldetails</h3>
                  <div className="space-y-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-1.5 py-1">
                      <span className="text-slate-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Ort:</span>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-slate-850 break-words leading-relaxed text-left max-w-[90%]">
                          {caseData.accident_location || "-"}
                        </span>
                        {caseData.accident_location && (
                          <button
                            onClick={handleCopyLocation}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none mt-0.5"
                            title="Ort kopieren"
                          >
                            {copiedLocation ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Datum:</span>
                      <span className="font-semibold">
                        {caseData.accident_date ? new Date(caseData.accident_date).toLocaleDateString("de-DE") : "-"}
                      </span>
                    </p>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-slate-400 text-xs">Gegner. Kennzeichen:</span>
                      {caseData.opponent_license_plate ? (
                        <div className="scale-85 origin-left">
                          <LicensePlate plateNumber={caseData.opponent_license_plate} />
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">-</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Versicherungsdaten des Gegners</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    <p className="flex flex-col gap-0.5">
                      <span className="text-slate-400 text-xs">Schadennummer:</span>
                      <span className="font-semibold text-slate-700">{caseData.damage_number || "Keine"}</span>
                    </p>
                    <p className="flex flex-col gap-0.5">
                      <span className="text-slate-400 text-xs">Versicherung Name:</span>
                      <span className="font-semibold text-slate-700 truncate">{caseData.opponent_insurance_name || "Unbekannt"}</span>
                    </p>
                    <p className="flex flex-col gap-0.5">
                      <span className="text-slate-400 text-xs">Versicherungsnummer:</span>
                      <span className="font-semibold text-slate-700">{caseData.opponent_insurance_number || "Keine"}</span>
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Scheckheftgepflegt?</span>
                    <span className="font-semibold text-slate-700">{caseData.is_scheckheft_maintained || "-"}</span>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Unfallkarte vorhanden?</span>
                    <span className="font-semibold text-slate-700">{caseData.is_accident_card_present || "-"}</span>
                  </div>
                </div>

                {/* Client Signature Canvas Render */}
                {caseData.signature_url && (
                  <div className="md:col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                    <span className="text-xs font-semibold text-slate-400 block mb-2">Digitale Unterschrift des Kunden</span>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-sm">
                      <img 
                        src={caseData.signature_url} 
                        alt="Unterschrift des Kunden" 
                        className="w-full max-h-36 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Uploaded Documents Grid */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
              <FileCheck className="w-5 h-5 text-sky-500" />
              <span>Hochgeladene Dateien ({files.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Scheckheft uploads */}
              <FileCategoryCard 
                title="Scheckheft" 
                files={scheckheftFiles} 
                icon={<FileText className="w-5 h-5 text-sky-600" />} 
              />

              {/* Unfallkarte uploads */}
              <FileCategoryCard 
                title="Unfallkarte" 
                files={accidentCardFiles} 
                icon={<FileText className="w-5 h-5 text-sky-600" />} 
              />

              {/* Photos uploads */}
              <FileCategoryCard 
                title="Fotos vom Unfallort" 
                files={photoFiles} 
                icon={<ImageIcon className="w-5 h-5 text-sky-600" />} 
              />

              {/* Additional files */}
              <FileCategoryCard 
                title="Sonstige Dokumente (Intern)" 
                files={additionalFiles} 
                icon={<FileText className="w-5 h-5 text-sky-600" />} 
              />

            </div>
          </section>
        </div>

        {/* Right 1 Column: Case Controls & File Uploading */}
        <div className="space-y-8">
          
          {/* Admin Management (Only visible to Admin) */}
          {currentUser.role === "admin" && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Shield className="w-5 h-5 text-sky-500" />
                <span>Fallverwaltung (Admin)</span>
              </h2>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Fall-Status ändern
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer font-semibold"
                >
                  <option value="Gutachten">Gutachten</option>
                  <option value="Rechtsanwalt">Rechtsanwalt</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </div>

              {/* Assistant Assignment Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Zuständigen Mitarbeiter zuweisen
                </label>
                <div className="relative">
                  <select
                    value={selectedAssistantId}
                    onChange={(e) => setSelectedAssistantId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pl-10 outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Ali Senhaji (Haupt-Admin - Standard)</option>
                    {assistants.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <UserPlus className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              {/* Update Button */}
              <button
                onClick={handleAdminUpdate}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-slate-900/5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Speichern</span>
              </button>
            </section>
          )}

          {/* File Upload Box (Mitarbeiter & Admin) */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-sky-500" />
              <span>Datei hochladen</span>
            </h2>

            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Kategorie
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as CaseFile["file_type"])}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="additional">Sonstiges Dokument</option>
                <option value="scheckheft">Scheckheft</option>
                <option value="accident_card">Unfallkarte</option>
                <option value="accident_photos">Unfallfoto</option>
              </select>
            </div>

            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                id="internal-file-upload"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadLoading}
              />
              <label
                htmlFor="internal-file-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-sky-400 hover:bg-sky-50/20 rounded-2xl py-8 px-4 text-center cursor-pointer transition-all uploader-box group"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-700 block">Datei auswählen</span>
                <span className="text-xs text-slate-400 mt-1 block">PDF, PNG oder JPG</span>
                {fileName && (
                  <span className="text-xs text-sky-600 font-mono font-medium block mt-2 animate-pulse truncate max-w-full">
                    {fileName}
                  </span>
                )}
              </label>
            </div>
            
            {uploadLoading && (
              <div className="text-xs text-center text-sky-600 animate-pulse">
                Upload läuft... Bitte warten.
              </div>
            )}
          </section>

          {/* Quick Case Status (Display-only for assistants) */}
          {currentUser.role !== "admin" && (
            <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Aktueller Fall-Status</span>
                <span className="font-bold text-lg mt-0.5 block">{caseData.status}</span>
              </div>
              <span className="text-xs text-slate-400 italic bg-slate-800 px-3 py-1.5 rounded-lg">
                Statusänderung nur durch Admin
              </span>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

// File category sub-card component
function FileCategoryCard({ 
  title, 
  files, 
  icon 
}: { 
  title: string; 
  files: CaseFile[]; 
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-bold text-sm text-slate-800">{title} ({files.length})</h4>
      </div>

      {files.length === 0 ? (
        <span className="text-xs text-slate-400 italic block py-2">Keine Dateien hochgeladen</span>
      ) : (
        <ul className="space-y-2">
          {files.map(f => (
            <li 
              key={f.id} 
              className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-2 text-xs shadow-inner"
            >
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-medium text-slate-700 truncate font-mono">{f.file_name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Von: {f.uploaded_by === "client" ? "Kunde" : f.uploaded_by === "admin" ? "Admin" : "Mitarbeiter"} 
                  {" • "} 
                  {new Date(f.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
              <a 
                href={f.file_url} 
                download={f.file_name} 
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-600 cursor-pointer shrink-0"
                title="Herunterladen"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
