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
  CaseStatus,
  archiveCase
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
  const [assistantPayout, setAssistantPayout] = useState<string>("0");
  const [assistantPayoutPaid, setAssistantPayoutPaid] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Additional file upload state
  const [uploadType, setUploadType] = useState<CaseFile["file_type"]>("additional");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Edit fields state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editLicensePlate, setEditLicensePlate] = useState("");
  const [editOpponentLicensePlate, setEditOpponentLicensePlate] = useState("");
  const [editAccidentLocation, setEditAccidentLocation] = useState("");
  const [editAccidentDate, setEditAccidentDate] = useState("");
  const [editDamageNumber, setEditDamageNumber] = useState("");
  const [editOpponentInsuranceName, setEditOpponentInsuranceName] = useState("");
  const [editOpponentInsuranceNumber, setEditOpponentInsuranceNumber] = useState("");
  const [editIsScheckheftMaintained, setEditIsScheckheftMaintained] = useState("");
  const [editIsAccidentCardPresent, setEditIsAccidentCardPresent] = useState("");
  const [editIban, setEditIban] = useState("");
  const [editOpposingInsuranceContacted, setEditOpposingInsuranceContacted] = useState(false);

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
      setAssistantPayout(data.assistant_payout?.toString() || "0");
      setAssistantPayoutPaid(data.assistant_payout_paid || false);

      // Initialize edit fields
      setEditClientEmail(data.client_email || "");
      setEditClientPhone(data.client_phone || "");
      setEditLicensePlate(data.license_plate || "");
      setEditOpponentLicensePlate(data.opponent_license_plate || "");
      setEditAccidentLocation(data.accident_location || "");
      setEditAccidentDate(data.accident_date || "");
      setEditDamageNumber(data.damage_number || "");
      setEditOpponentInsuranceName(data.opponent_insurance_name || "");
      setEditOpponentInsuranceNumber(data.opponent_insurance_number || "");
      setEditIsScheckheftMaintained(data.is_scheckheft_maintained || "");
      setEditIsAccidentCardPresent(data.is_accident_card_present || "");
      setEditIban(data.iban || "");
      setEditOpposingInsuranceContacted(data.opposing_insurance_contacted || false);

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
      if (selectedStatus === "Archiviert" && caseData?.status !== "Archiviert") {
        const confirmArchive = window.confirm("Möchten Sie alle Dateien löschen und den Fall archivieren? Daten und Vergütung bleiben erhalten.");
        if (!confirmArchive) return;
        
        await archiveCase(caseId);
        
        await updateCase(caseId, {
          assistant_id: selectedAssistantId || undefined,
          assistant_payout: parseFloat(assistantPayout) || 0,
          assistant_payout_paid: assistantPayoutPaid,
        }, currentUser.role);
      } else {
        await updateCase(caseId, {
          status: selectedStatus,
          assistant_id: selectedAssistantId || undefined,
          assistant_payout: parseFloat(assistantPayout) || 0,
          assistant_payout_paid: assistantPayoutPaid,
        }, currentUser.role);
      }

      setSuccessMsg("Änderungen erfolgreich gespeichert!");
      setTimeout(() => setSuccessMsg(""), 3000);
      
      // Refresh details
      fetchCaseDetails(currentUser);
    } catch (err) {
      console.error(err);
      setErrorMsg("Fehler beim Aktualisieren des Falls.");
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateCase(caseId, {
        client_email: editClientEmail,
        client_phone: editClientPhone,
        license_plate: editLicensePlate,
        opponent_license_plate: editOpponentLicensePlate,
        accident_location: editAccidentLocation,
        accident_date: editAccidentDate,
        damage_number: editDamageNumber,
        opponent_insurance_name: editOpponentInsuranceName,
        opponent_insurance_number: editOpponentInsuranceNumber,
        is_scheckheft_maintained: editIsScheckheftMaintained,
        is_accident_card_present: editIsAccidentCardPresent,
        iban: editIban,
        opposing_insurance_contacted: editOpposingInsuranceContacted,
      }, currentUser.role);

      setSuccessMsg("Kunden- und Unfalldetails erfolgreich aktualisiert!");
      setTimeout(() => setSuccessMsg(""), 3000);
      setIsEditingDetails(false);
      fetchCaseDetails(currentUser);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Fehler beim Aktualisieren der Details: " + (err.message || err));
    }
  };

  const handleCancelEditing = () => {
    if (caseData) {
      setEditClientEmail(caseData.client_email || "");
      setEditClientPhone(caseData.client_phone || "");
      setEditLicensePlate(caseData.license_plate || "");
      setEditOpponentLicensePlate(caseData.opponent_license_plate || "");
      setEditAccidentLocation(caseData.accident_location || "");
      setEditAccidentDate(caseData.accident_date || "");
      setEditDamageNumber(caseData.damage_number || "");
      setEditOpponentInsuranceName(caseData.opponent_insurance_name || "");
      setEditOpponentInsuranceNumber(caseData.opponent_insurance_number || "");
      setEditIsScheckheftMaintained(caseData.is_scheckheft_maintained || "");
      setEditIsAccidentCardPresent(caseData.is_accident_card_present || "");
      setEditIban(caseData.iban || "");
      setEditOpposingInsuranceContacted(caseData.opposing_insurance_contacted || false);
    }
    setIsEditingDetails(false);
  };

  const handlePreviewFile = (fileUrl: string, fileName: string) => {
    setPreviewImage(fileUrl);
    setPreviewFileName(fileName);
  };

  const handleDownloadDirect = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct download failed:", error);
      // Fallback
      window.open(url, "_blank");
    }
  };

  const handleToggleSelectFile = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  const handleDownloadSelected = async () => {
    const filesToDownload = files.filter(f => selectedFileIds.includes(f.id));
    if (filesToDownload.length === 0) return;

    setBulkDownloading(true);
    setDownloadProgress(0);
    
    try {
      let progress = 0;
      for (const file of filesToDownload) {
        await handleDownloadDirect(file.file_url, file.file_name);
        progress++;
        setDownloadProgress(progress);
        // Brief delay to prevent browser download congestion
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setSuccessMsg("Ausgewählte Dateien erfolgreich heruntergeladen!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Fehler beim Herunterladen der Dateien.");
    } finally {
      setBulkDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Read upload files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          </div>

          <div />
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

          {currentUser.role === "assistant" && (caseData.status === "Abgeschlossen" || caseData.status === "Archiviert") && caseData.assistant_payout && caseData.assistant_payout > 0 ? (
            caseData.assistant_payout_paid ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl space-y-2 shadow-sm animate-fade-in">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Ihre Vergütung für diesen Fall: {caseData.assistant_payout} € (Ausgezahlt)</span>
                </h3>
                <p className="text-sm text-emerald-700 font-medium">
                  Die Vergütung wurde bereits auf Ihr Bankkonto überwiesen. Vielen Dank für Ihre hervorragende Unterstützung!
                </p>
              </div>
            ) : (
              <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl space-y-2 shadow-sm animate-fade-in">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Ihre Vergütung für diesen Fall: {caseData.assistant_payout} € (Ausstehend)</span>
                </h3>
                <p className="text-sm text-amber-700 font-medium">
                  Bitte erstellen Sie eine Rechnung über diesen exakten Betrag und senden Sie diese per E-Mail oder WhatsApp an die Geschäftsführung, um Ihre Auszahlung zu erhalten.
                </p>
              </div>
            )
          ) : null}

          {/* Client Details Section */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <span>Schadensmeldung des Kunden</span>
              </h2>
              <div className="flex items-center gap-3">
                {caseData.status !== "Gutachten" ? (
                  <span className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Bearbeitung gesperrt: Fall beim Anwalt</span>
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (isEditingDetails) {
                        handleCancelEditing();
                      } else {
                        setIsEditingDetails(true);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 hover:bg-sky-100 text-sky-600 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors cursor-pointer select-none"
                  >
                    <span>{isEditingDetails ? "Abbrechen" : "✏️ Bearbeiten"}</span>
                  </button>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  hasClientSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {hasClientSubmitted ? 'Ausgefüllt' : 'Wartet auf Angaben'}
                </span>
              </div>
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
            ) : isEditingDetails ? (
              <form onSubmit={handleUpdateDetails} className="space-y-6 animate-fade-in text-sm text-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Kundenkontakt */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Kundenkontakt</h3>
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">E-Mail-Adresse</label>
                      <input
                        type="email"
                        value={editClientEmail}
                        onChange={(e) => setEditClientEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                        placeholder="beispiel@mail.de"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Telefonnummer</label>
                      <input
                        type="tel"
                        value={editClientPhone}
                        onChange={(e) => setEditClientPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                        placeholder="+49 170 1234567"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Eigenes Kennzeichen</label>
                      <input
                        type="text"
                        value={editLicensePlate}
                        onChange={(e) => setEditLicensePlate(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                        placeholder="LB-XX 123"
                      />
                    </div>
                  </div>

                  {/* Unfalldetails */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Unfalldetails</h3>
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Unfallort</label>
                      <input
                        type="text"
                        value={editAccidentLocation}
                        onChange={(e) => setEditAccidentLocation(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                        placeholder="Ludwigsburg Hauptplatz"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Unfalldatum</label>
                      <input
                        type="date"
                        value={editAccidentDate}
                        onChange={(e) => setEditAccidentDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">Gegner. Kennzeichen</label>
                      <input
                        type="text"
                        value={editOpponentLicensePlate}
                        onChange={(e) => setEditOpponentLicensePlate(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                        placeholder="S-YY 987"
                      />
                    </div>
                  </div>

                  {/* Versicherungsdaten */}
                  <div className="md:col-span-2 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Versicherungsdaten des Gegners</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600">Schadennummer</label>
                        <input
                          type="text"
                          value={editDamageNumber}
                          onChange={(e) => setEditDamageNumber(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                          placeholder="SCH-4929"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600">Versicherung Name</label>
                        <input
                          type="text"
                          value={editOpponentInsuranceName}
                          onChange={(e) => setEditOpponentInsuranceName(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                          placeholder="Allianz"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-600">Versicherungsnummer</label>
                        <input
                          type="text"
                          value={editOpponentInsuranceNumber}
                          onChange={(e) => setEditOpponentInsuranceNumber(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors"
                          placeholder="V-938102"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Zusatzdaten & Finanzen */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Scheckheftgepflegt?</label>
                      <select
                        value={editIsScheckheftMaintained}
                        onChange={(e) => setEditIsScheckheftMaintained(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors cursor-pointer"
                      >
                        <option value="">Nicht angegeben</option>
                        <option value="Ja">Ja</option>
                        <option value="Nein">Nein</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Unfallkarte vorhanden?</label>
                      <select
                        value={editIsAccidentCardPresent}
                        onChange={(e) => setEditIsAccidentCardPresent(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors cursor-pointer"
                      >
                        <option value="">Nicht angegeben</option>
                        <option value="Ja">Ja</option>
                        <option value="Nein">Nein</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-600 mb-1">IBAN für Auszahlung</label>
                      <input
                        type="text"
                        value={editIban}
                        onChange={(e) => setEditIban(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-sky-500 rounded-xl px-3 py-2 outline-none transition-colors font-mono"
                        placeholder="DE89..."
                      />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <input
                        type="checkbox"
                        id="editOpposingInsuranceContacted"
                        checked={editOpposingInsuranceContacted}
                        onChange={(e) => setEditOpposingInsuranceContacted(e.target.checked)}
                        className="w-4 h-4 text-sky-600 border-slate-200 rounded focus:ring-sky-500 cursor-pointer"
                      />
                      <label htmlFor="editOpposingInsuranceContacted" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                        Gegnerische Versicherung kontaktiert?
                      </label>
                    </div>
                  </div>

                  {/* Signature Read-only Preview (Strictly static, signature is never editable!) */}
                  {caseData.signature_url && (
                    <div className="md:col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                      <span className="text-xs font-semibold text-slate-400 block mb-2">Digitale Unterschrift des Kunden (Schreibgeschützt)</span>
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

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer select-none"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="bg-[#38bdf8] hover:bg-[#0ea5e9] text-white font-extrabold px-8 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer select-none"
                  >
                    Speichern
                  </button>
                </div>
              </form>
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
                            href={`https://wa.me/${getCleanedWhatsAppNumber(caseData.client_phone)}`}
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
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">IBAN für Auszahlung</span>
                    <span className="font-semibold text-slate-700 font-mono break-all">{caseData.iban || "Nicht angegeben"}</span>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Gegnerische Versicherung kontaktiert?</span>
                    <span className={`font-semibold ${caseData.opposing_insurance_contacted ? "text-amber-600 font-bold" : "text-slate-700"}`}>
                      {caseData.opposing_insurance_contacted ? "Ja" : "Nein"}
                    </span>
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

              {/* Assistant Payout (Only if status is Abgeschlossen) */}
              {selectedStatus === "Abgeschlossen" && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Vergütung für Mitarbeiter (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assistantPayout}
                      onChange={(e) => setAssistantPayout(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold"
                      placeholder="z.B. 150.00"
                    />
                  </div>

                  {/* Bezahlt (Paid) Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                    <span className="text-xs font-bold text-slate-500 font-semibold">Auszahlungsstatus:</span>
                    <button
                      type="button"
                      onClick={() => setAssistantPayoutPaid(!assistantPayoutPaid)}
                      className={`text-xs font-extrabold px-4 py-2 rounded-lg transition-all active:scale-[0.98] select-none cursor-pointer ${
                        assistantPayoutPaid 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" 
                          : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                      }`}
                    >
                      {assistantPayoutPaid ? "✅ Bezahlt" : "⏳ Offen / Bezahlt?"}
                    </button>
                  </div>
                </div>
              )}

              {/* Update Button */}
              <button
                onClick={handleAdminUpdate}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-slate-900/5 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Speichern</span>
              </button>
            </section>
          )}

          {/* File Upload Box */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-sky-500" />
              <span>Datei hochladen</span>
            </h2>

            {currentUser?.role === "assistant" && caseData.status !== "Gutachten" ? (
              <div className="p-4 bg-amber-50 border border-amber-100 text-amber-850 text-xs rounded-xl flex items-center gap-2.5 font-semibold shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>Das Hochladen von Dateien ist für Mitarbeiter im Status 'Rechtsanwalt' nicht mehr möglich.</span>
              </div>
            ) : (
              <>
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
              </>
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

        {/* Uploaded Documents Grid (Full Width) */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-sky-500" />
              <span>Hochgeladene Dateien ({files.length})</span>
            </h2>
            
            {files.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer select-none"
                >
                  {selectedFileIds.length === files.length ? "Auswahl aufheben" : "Alle auswählen"}
                </button>
                
                <button
                  onClick={handleDownloadSelected}
                  disabled={selectedFileIds.length === 0 || bulkDownloading}
                  className={`flex items-center gap-1.5 font-bold px-4 py-2 rounded-xl text-xs transition-all select-none cursor-pointer ${
                    selectedFileIds.length === 0 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                      : "bg-sky-500 hover:bg-sky-600 text-white shadow-md hover:shadow-sky-500/25"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {bulkDownloading 
                    ? `Herunterladen... (${downloadProgress}/${selectedFileIds.length})` 
                    : `Ausgewählte herunterladen (${selectedFileIds.length})`}
                </button>
              </div>
            )}
          </div>

          {caseData.status === "Archiviert" && (
            <div className="p-4 bg-amber-50 border border-amber-100 text-amber-850 text-xs rounded-xl flex items-center gap-2.5 shadow-sm font-semibold animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <span>Dieser Fall wurde archiviert. Alle hochgeladenen Dokumente und Bilder wurden zur Speicherplatzfreigabe gelöscht.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Scheckheft uploads */}
            <FileCategoryCard 
              title="Scheckheft" 
              files={scheckheftFiles} 
              icon={<FileText className="w-5 h-5 text-sky-600" />} 
              onPreviewFile={handlePreviewFile}
              selectedFileIds={selectedFileIds}
              onToggleSelectFile={handleToggleSelectFile}
              onDownloadDirect={handleDownloadDirect}
            />

            {/* Unfallkarte uploads */}
            <FileCategoryCard 
              title="Unfallkarte" 
              files={accidentCardFiles} 
              icon={<FileText className="w-5 h-5 text-sky-600" />} 
              onPreviewFile={handlePreviewFile}
              selectedFileIds={selectedFileIds}
              onToggleSelectFile={handleToggleSelectFile}
              onDownloadDirect={handleDownloadDirect}
            />

            {/* Photos uploads */}
            <FileCategoryCard 
              title="Fotos vom Unfallort" 
              files={photoFiles} 
              icon={<ImageIcon className="w-5 h-5 text-sky-600" />} 
              onPreviewFile={handlePreviewFile}
              selectedFileIds={selectedFileIds}
              onToggleSelectFile={handleToggleSelectFile}
              onDownloadDirect={handleDownloadDirect}
            />

            {/* Additional files */}
            <FileCategoryCard 
              title="Sonstige Dokumente (Intern)" 
              files={additionalFiles} 
              icon={<FileText className="w-5 h-5 text-sky-600" />} 
              onPreviewFile={handlePreviewFile}
              selectedFileIds={selectedFileIds}
              onToggleSelectFile={handleToggleSelectFile}
              onDownloadDirect={handleDownloadDirect}
            />

          </div>
        </section>

      </main>

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
          onClick={() => {
            setPreviewImage(null);
            setPreviewFileName("");
          }}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/20">
              <span className="text-sm font-semibold text-slate-350 truncate pr-4">{previewFileName || "Bildvorschau"}</span>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setPreviewFileName("");
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-lg font-bold"
              >
                &times;
              </button>
            </div>
            {/* Image Container */}
            <div className="p-6 flex items-center justify-center bg-slate-950 overflow-auto min-h-[300px] max-h-[70vh]">
              <img
                src={previewImage}
                alt="Vorschau"
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-800 bg-slate-950/20">
              <button
                onClick={() => handleDownloadDirect(previewImage, previewFileName || "image.png")}
                className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                <Download className="w-4 h-4" />
                Herunterladen
              </button>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setPreviewFileName("");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to check if file is an image
const isImageFile = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext || '');
};

// File category sub-card component
function FileCategoryCard({ 
  title, 
  files, 
  icon,
  onPreviewFile,
  selectedFileIds,
  onToggleSelectFile,
  onDownloadDirect
}: { 
  title: string; 
  files: CaseFile[]; 
  icon: React.ReactNode;
  onPreviewFile: (url: string, name: string) => void;
  selectedFileIds: string[];
  onToggleSelectFile: (fileId: string) => void;
  onDownloadDirect: (url: string, name: string) => void;
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
              <div className="flex items-center flex-1 min-w-0 mr-2">
                <input
                  type="checkbox"
                  checked={selectedFileIds.includes(f.id)}
                  onChange={() => onToggleSelectFile(f.id)}
                  className="mr-2 w-4 h-4 rounded border-slate-200 text-sky-500 focus:ring-sky-500 cursor-pointer shrink-0"
                />
                {isImageFile(f.file_name) && (
                  <div 
                    onClick={() => onPreviewFile(f.file_url, f.file_name)}
                    className="w-12 h-12 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 mr-2.5 cursor-pointer hover:opacity-90 hover:border-sky-400 transition-all select-none"
                    title="Vorschau anzeigen"
                  >
                    <img src={f.file_url} alt="Miniaturansicht" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-700 truncate font-mono">{f.file_name}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Von: {f.uploaded_by === "client" ? "Kunde" : f.uploaded_by === "admin" ? "Admin" : "Mitarbeiter"} 
                    {" • "} 
                    {new Date(f.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isImageFile(f.file_name) && (
                  <button
                    type="button"
                    onClick={() => onPreviewFile(f.file_url, f.file_name)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 hover:text-sky-600 rounded-md transition-colors text-slate-500 cursor-pointer select-none"
                    title="Vorschau"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => onDownloadDirect(f.file_url, f.file_name)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-650 cursor-pointer select-none"
                  title="Herunterladen"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const getCleanedWhatsAppNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  const prefixes = ["49", "43", "41", "33", "31", "32", "48", "420", "39", "34", "44"];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix + "0")) {
      cleaned = prefix + cleaned.substring(prefix.length + 1);
      break;
    }
  }
  if (cleaned.startsWith("0")) {
    cleaned = "49" + cleaned.substring(1);
  }
  return cleaned;
};
