"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCaseByToken, updateCase, uploadFile, getFilesForCase, Case, CaseFile, initDb } from "@/lib/db";
import confetti from "canvas-confetti";
import LicensePlate from "@/components/LicensePlate";
import { 
  Mail, 
  Phone, 
  Car, 
  MapPin, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Trash2, 
  PenTool, 
  FileCheck,
  AlertCircle,
  ImageIcon,
  Send,
  Download
} from "lucide-react";

export default function ClientPortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [existingFiles, setExistingFiles] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields State
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [opponentPlate, setOpponentPlate] = useState("");
  const [accidentLocation, setAccidentLocation] = useState("");
  const [accidentDate, setAccidentDate] = useState("");
  const [damageNumber, setDamageNumber] = useState("");
  const [opponentInsuranceName, setOpponentInsuranceName] = useState("");
  const [opponentInsuranceNumber, setOpponentInsuranceNumber] = useState("");
  
  // Scheckheft choice & files
  const [scheckheftChoice, setScheckheftChoice] = useState("Ja");
  const [scheckheftOther, setScheckheftOther] = useState("");
  const [scheckheftFile, setScheckheftFile] = useState<{name: string; base64: string} | null>(null);

  // Unfallkarte choice & files
  const [unfallkarteChoice, setUnfallkarteChoice] = useState("Nein");
  const [unfallkarteOther, setUnfallkarteOther] = useState("");
  const [unfallkarteFile, setUnfallkarteFile] = useState<{name: string; base64: string} | null>(null);

  // Accident Photos
  const [accidentPhotos, setAccidentPhotos] = useState<Array<{name: string; base64: string}>>([]);

  // Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Client revisits state: if case is already filled, show status and upload additional files
  const [revisitUploadLoading, setRevisitUploadLoading] = useState(false);
  const [revisitFileMsg, setRevisitFileMsg] = useState("");

  useEffect(() => {
    initDb();
    fetchCaseByToken();
  }, [token]);

  const fetchCaseByToken = async () => {
    setLoading(true);
    try {
      const data = await getCaseByToken(token);
      if (data) {
        setCaseData(data);
        setLicensePlate(data.license_plate);
        
        // If client already submitted, load existing data & files
        if (data.client_email) {
          setEmail(data.client_email);
          setPhone(data.client_phone || "");
          setOpponentPlate(data.opponent_license_plate || "");
          setAccidentLocation(data.accident_location || "");
          setAccidentDate(data.accident_date || "");
          setDamageNumber(data.damage_number || "");
          setOpponentInsuranceName(data.opponent_insurance_name || "");
          setOpponentInsuranceNumber(data.opponent_insurance_number || "");
          
          if (data.is_scheckheft_maintained) {
            if (["Ja", "Nein"].includes(data.is_scheckheft_maintained)) {
              setScheckheftChoice(data.is_scheckheft_maintained);
            } else {
              setScheckheftChoice("Andere");
              setScheckheftOther(data.is_scheckheft_maintained.replace("Andere: ", ""));
            }
          }

          if (data.is_accident_card_present) {
            if (["Ja", "Nein"].includes(data.is_accident_card_present)) {
              setUnfallkarteChoice(data.is_accident_card_present);
            } else {
              setUnfallkarteChoice("Andere");
              setUnfallkarteOther(data.is_accident_card_present.replace("Andere: ", ""));
            }
          }
          setSubmitted(true);
        }
        
        const filesList = await getFilesForCase(data.id);
        setExistingFiles(filesList);
      }
    } catch (err) {
      console.error("Error loading client case", err);
    } finally {
      setLoading(false);
    }
  };

  // Canvas signature handling
  useEffect(() => {
    if (submitted || loading || !caseData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configure drawing styles
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Adjust canvas resolution for high-DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [submitted, loading, caseData]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getEventCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setSignatureSaved(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureSaved(false);
  };

  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Read upload files helper
  const processFile = (file: File, callback: (result: {name: string; base64: string}) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      callback({
        name: file.name,
        base64: event.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleFileDrop = (
    e: React.DragEvent<HTMLDivElement>, 
    target: "scheckheft" | "unfallkarte" | "photos"
  ) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (target === "scheckheft") {
      processFile(files[0], setScheckheftFile);
    } else if (target === "unfallkarte") {
      processFile(files[0], setUnfallkarteFile);
    } else {
      // Photos (Multiple)
      Array.from(files).forEach(f => {
        processFile(f, (res) => {
          setAccidentPhotos(prev => [...prev, res]);
        });
      });
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>, 
    target: "scheckheft" | "unfallkarte" | "photos"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === "scheckheft") {
      processFile(files[0], setScheckheftFile);
    } else if (target === "unfallkarte") {
      processFile(files[0], setUnfallkarteFile);
    } else {
      // Photos (Multiple)
      Array.from(files).forEach(f => {
        processFile(f, (res) => {
          setAccidentPhotos(prev => [...prev, res]);
        });
      });
    }
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData) return;

    // Validate Signature
    const canvas = canvasRef.current;
    if (!canvas || !signatureSaved) {
      alert("Bitte unterschreiben Sie das Formular vor dem Senden.");
      return;
    }

    const signatureUrl = canvas.toDataURL("image/png");

    const scheckheftText = scheckheftChoice === "Andere" ? `Andere: ${scheckheftOther}` : scheckheftChoice;
    const unfallkarteText = unfallkarteChoice === "Andere" ? `Andere: ${unfallkarteOther}` : unfallkarteChoice;

    try {
      // Update Case Details
      await updateCase(caseData.id, {
        client_email: email,
        client_phone: phone,
        license_plate: licensePlate.toUpperCase().trim(),
        opponent_license_plate: opponentPlate.toUpperCase().trim(),
        accident_location: accidentLocation,
        accident_date: accidentDate,
        damage_number: damageNumber,
        opponent_insurance_name: opponentInsuranceName,
        opponent_insurance_number: opponentInsuranceNumber,
        is_scheckheft_maintained: scheckheftText,
        is_accident_card_present: unfallkarteText,
        signature_url: signatureUrl,
      });

      // Upload files
      if (scheckheftFile) {
        await uploadFile(caseData.id, "scheckheft", scheckheftFile.name, scheckheftFile.base64, "client");
      }
      if (unfallkarteFile) {
        await uploadFile(caseData.id, "accident_card", unfallkarteFile.name, unfallkarteFile.base64, "client");
      }
      for (const photo of accidentPhotos) {
        await uploadFile(caseData.id, "accident_photos", photo.name, photo.base64, "client");
      }

      // Success Confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSubmitted(true);
      fetchCaseByToken(); // Reload to show status & existing files
    } catch (err: any) {
      console.error(err);
      alert(`Fehler beim Übermitteln des Formulars: ${err.message || err}`);
    }
  };

  // Handle client uploading additional files later
  const handleAdditionalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !caseData) return;
    setRevisitUploadLoading(true);
    setRevisitFileMsg("");

    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
              await uploadFile(caseData.id, "additional", file.name, base64, "client");
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsDataURL(file);
        });
      }
      setRevisitFileMsg("Dateien erfolgreich hochgeladen und Administrator benachrichtigt!");
      
      // Refresh files list
      const filesList = await getFilesForCase(caseData.id);
      setExistingFiles(filesList);
    } catch (err: any) {
      console.error(err);
      setRevisitFileMsg(`Fehler beim Upload: ${err.message || err}`);
    } finally {
      setRevisitUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Lade Kundenportal...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-slate-800">Ungültiger Link</h3>
        <p className="text-slate-500 mt-2 max-w-sm">
          Der aufgerufene Link ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihren Gutachter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col items-center">
      {/* Top Banner (Recreating visual header from screenshot) */}
      <div className="w-full bg-slate-900 flex flex-col items-center text-center py-6 px-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 accent-banner" />
        <div className="bg-red-600 text-white text-[10px] sm:text-xs font-black tracking-widest px-4 py-1.5 rounded-full uppercase accent-banner shadow-sm animate-pulse mb-3 mt-1">
          UNFALL GEHABT? WIR HELFEN SOFORT!
        </div>
        
        {/* Car graphic placeholder */}
        <div className="w-24 h-24 bg-slate-800 rounded-full border border-slate-700/80 flex items-center justify-center text-sky-500 mb-2">
          <Car className="w-12 h-12" />
        </div>
        
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-serif">
          Ingenieurbüro LUDWIGSBURG
        </h1>
        <p className="text-xs text-slate-400 font-medium">KFZ-Sachverständige & Unfall-Gutachten</p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl bg-white shadow-xl my-6 rounded-2xl overflow-hidden border border-slate-200">
        
        {/* Wavy layout divider */}
        <div className="h-6 top-wave-bg" />

        {/* Portal Header */}
        <div className="px-6 sm:px-12 py-6 text-center border-b border-slate-100">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-serif">
            KFZ-Gutachten Ingenieurbüro
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Bitte füllen Sie das folgende Formular vollständig aus, damit wir Ihr Schadensgutachten erstellen können.
          </p>
        </div>

        {/* Status Tracker (Only if form was already submitted) */}
        {submitted && (
          <div className="mx-6 sm:mx-12 mt-8 p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] w-28 h-28 bg-sky-500/10 rounded-full blur-2xl" />
            <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-widest">
              Ihr aktueller Fall-Status
            </h3>
            
            {/* Status indicators */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  caseData.status === "Gutachten" ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20" : "bg-slate-800 text-slate-400"
                }`}>
                  1
                </div>
                <span className="text-[10px] mt-1 font-semibold text-slate-400">Gutachten</span>
              </div>
              <div className="h-0.5 flex-1 bg-slate-800 mx-2" />
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  caseData.status === "Rechtsanwalt" ? "bg-purple-500 text-white ring-4 ring-purple-500/20" : "bg-slate-800 text-slate-400"
                }`}>
                  2
                </div>
                <span className="text-[10px] mt-1 font-semibold text-slate-400">Rechtsanwalt</span>
              </div>
              <div className="h-0.5 flex-1 bg-slate-800 mx-2" />
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  caseData.status === "Abgeschlossen" ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20" : "bg-slate-800 text-slate-400"
                }`}>
                  3
                </div>
                <span className="text-[10px] mt-1 font-semibold text-slate-400">Abgeschlossen</span>
              </div>
            </div>

            {/* Current status description */}
            <p className="text-xs text-slate-300 mt-6 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              {caseData.status === "Gutachten" && "ℹ️ Wir bearbeiten derzeit die Aufnahme Ihres Schadensfalls."}
              {caseData.status === "Rechtsanwalt" && "⚖️ Ihr Fall wurde an den zuständigen Anwalt zur Durchsetzung Ihrer Ansprüche übergeben."}
              {caseData.status === "Abgeschlossen" && "✅ Die Schadensabwicklung ist abgeschlossen. Das Gutachten wurde erstellt und übermittelt."}
            </p>

            {/* Revisit document uploader */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Weitere Dokumente hochladen
              </h4>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  id="client-revisit-upload"
                  multiple
                  onChange={handleAdditionalUpload}
                  className="hidden"
                  disabled={revisitUploadLoading}
                />
                <label
                  htmlFor="client-revisit-upload"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Dateien auswählen</span>
                </label>
                {revisitUploadLoading && <span className="text-xs text-sky-400 animate-pulse">Upload läuft...</span>}
                {revisitFileMsg && <span className="text-xs text-emerald-400">{revisitFileMsg}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Form area */}
        <div className="px-6 sm:px-12 py-8 relative">
          
          {submitted ? (
            /* Submitted Form state: display only */
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-extrabold text-slate-800 text-lg">Formular erfolgreich gesendet!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ihre Angaben liegen vor. Sie können diese Seite jederzeit wieder aufrufen, um den Bearbeitungsstatus zu prüfen.
                </p>
              </div>

              {/* Display submitted values summary */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-sm text-slate-700">
                <h4 className="font-bold text-slate-800 text-sm">Zusammenfassung Ihrer Angaben</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <p><span className="text-slate-400 text-xs block">E-Mail:</span> <span className="font-semibold">{email}</span></p>
                  <p><span className="text-slate-400 text-xs block">Telefonnummer:</span> <span className="font-semibold">{phone}</span></p>
                  <div>
                    <span className="text-slate-400 text-xs block mb-1">Ihr Kennzeichen:</span>
                    <div className="scale-85 origin-left">
                      <LicensePlate plateNumber={licensePlate} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-1">Gegner. Kennzeichen:</span>
                    <div className="scale-85 origin-left">
                      <LicensePlate plateNumber={opponentPlate} />
                    </div>
                  </div>
                  <p><span className="text-slate-400 text-xs block">Unfallort:</span> <span className="font-semibold">{accidentLocation}</span></p>
                  <p><span className="text-slate-400 text-xs block">Unfalldatum:</span> <span className="font-semibold">{accidentDate}</span></p>
                  <p><span className="text-slate-400 text-xs block">Gegnerische Versicherung:</span> <span className="font-semibold">{opponentInsuranceName}</span></p>
                  <p><span className="text-slate-400 text-xs block">Versicherungsnummer:</span> <span className="font-semibold">{opponentInsuranceNumber}</span></p>
                </div>
              </div>

              {/* List already uploaded files */}
              {existingFiles.length > 0 && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-sky-500" />
                    <span>Bereits hochgeladene Dateien ({existingFiles.length})</span>
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {existingFiles.map(f => (
                      <li key={f.id} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl shadow-inner font-mono text-slate-700">
                        <span>{f.file_name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full capitalize">
                          {f.file_type === "scheckheft" ? "Scheckheft" : f.file_type === "accident_card" ? "Unfallkarte" : f.file_type === "accident_photos" ? "Foto" : "Zusatzdatei"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* Interactive Form state */
            <form onSubmit={handleSubmit} className="space-y-12">
              
              {/* Dotted vertical line timeline decoration */}
              <div className="timeline-line hidden sm:block" />

              {/* Step 1: Email */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Mail className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Ihre E-Mail-Adresse<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Beispiel@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 2: Phone */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Phone className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Telefonnummer<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+49 170 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 3: Own License Plate */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Car className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Bitte geben Sie das Kennzeichen Ihres Fahrzeugs an.<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HN - AA 123"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none font-bold text-slate-800 uppercase transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 4: Opponent License Plate */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Car className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Amtliches Kennzeichen des Unfallgegners<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HN - AA 123"
                    value={opponentPlate}
                    onChange={(e) => setOpponentPlate(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none font-bold text-slate-800 uppercase transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 5: Accident Location */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<MapPin className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Unfallort<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Maxstr. 5, Heilbronn"
                    value={accidentLocation}
                    onChange={(e) => setAccidentLocation(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 6: Accident Date */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Calendar className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Unfalldatum<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={accidentDate}
                    onChange={(e) => setAccidentDate(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors"
                  />
                </div>
              </div>

              {/* Step 7: Claim Number */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<FileText className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Schadennummer (falls vorhanden)
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Schadennummer eintragen"
                    value={damageNumber}
                    onChange={(e) => setDamageNumber(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 8: Opponent Insurance Name */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<FileText className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Name der gegnerischen Versicherung (falls bekannt)
                  </label>
                  <input
                    type="text"
                    placeholder="HUK24 WGV ADAC Allianz"
                    value={opponentInsuranceName}
                    onChange={(e) => setOpponentInsuranceName(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 9: Insurance Policy Number */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<FileText className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">
                    Versicherungsnummer der gegnerischen Versicherung (falls vorhanden)
                  </label>
                  <input
                    type="text"
                    placeholder="Versicherungsnummer eintragen"
                    value={opponentInsuranceNumber}
                    onChange={(e) => setOpponentInsuranceNumber(e.target.value)}
                    className="w-full border-b border-slate-200 focus:border-sky-500 py-2 outline-none text-slate-800 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Step 10: Scheckheft Choice */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<ShieldCheck className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800 leading-snug">
                    Wurde Ihr Fahrzeug regelmäßig scheckheftgepflegt bei einer anerkannten Vertragswerkstatt (z. B. Volkswagen, Škoda Auto oder vergleichbar)?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setScheckheftChoice("Ja")}
                      className={`py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        scheckheftChoice === "Ja"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheckheftChoice("Nein")}
                      className={`py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        scheckheftChoice === "Nein"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Nein
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheckheftChoice("Andere")}
                      className={`sm:col-span-2 py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        scheckheftChoice === "Andere"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Andere (bitte angeben)
                    </button>
                  </div>
                  {scheckheftChoice === "Andere" && (
                    <input
                      type="text"
                      required
                      placeholder="Details eintragen..."
                      value={scheckheftOther}
                      onChange={(e) => setScheckheftOther(e.target.value)}
                      className="w-full border-b border-slate-200 focus:border-sky-500 py-1.5 outline-none text-slate-800 transition-colors text-sm mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Step 11: Scheckheft Upload */}
              {scheckheftChoice === "Ja" && (
                <div className="relative pl-0 sm:pl-14">
                  <TimelineStepIcon icon={<Upload className="w-4 h-4 text-slate-500" />} />
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-800">
                      Scheckheft hochladen (von einer anerkannten Vertragswerkstatt)
                    </label>
                    
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleFileDrop(e, "scheckheft")}
                      className="border-2 border-dashed border-slate-200 hover:border-sky-500 hover:bg-sky-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all uploader-box relative"
                    >
                      <input
                        type="file"
                        id="scheckheft-upload-input"
                        onChange={(e) => handleFileSelect(e, "scheckheft")}
                        className="hidden"
                      />
                      <label htmlFor="scheckheft-upload-input" className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-sm font-semibold text-slate-700 block">
                          Ziehen Sie Ihre Dateien per Drag & Drop hierher
                        </span>
                        <span className="text-xs text-slate-400 block my-1">——— oder ———</span>
                        <span className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg inline-block font-semibold transition-colors mt-1">
                          Nach Dateien suchen
                        </span>
                        <span className="text-[10px] text-slate-400 mt-2 block">Größenlimit: 10.0 Mb</span>
                      </label>
                    </div>

                    {scheckheftFile && (
                      <div className="flex items-center justify-between bg-sky-50/40 border border-sky-100 px-4 py-2.5 rounded-xl">
                        <span className="text-xs font-mono text-sky-800 truncate pr-4">{scheckheftFile.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setScheckheftFile(null)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 12: Accident Card Choice */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<ShieldCheck className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    Unfallkarte vorhanden ?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setUnfallkarteChoice("Ja")}
                      className={`py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        unfallkarteChoice === "Ja"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnfallkarteChoice("Nein")}
                      className={`py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        unfallkarteChoice === "Nein"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Nein
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnfallkarteChoice("Andere")}
                      className={`sm:col-span-2 py-3 px-4 border rounded-xl font-semibold text-sm transition-all text-center cursor-pointer ${
                        unfallkarteChoice === "Andere"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      Andere (bitte angeben)
                    </button>
                  </div>
                  {unfallkarteChoice === "Andere" && (
                    <input
                      type="text"
                      required
                      placeholder="Details eintragen..."
                      value={unfallkarteOther}
                      onChange={(e) => setUnfallkarteOther(e.target.value)}
                      className="w-full border-b border-slate-200 focus:border-sky-500 py-1.5 outline-none text-slate-800 transition-colors text-sm mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Step 13: Unfallkarte Upload */}
              {unfallkarteChoice === "Ja" && (
                <div className="relative pl-0 sm:pl-14">
                  <TimelineStepIcon icon={<Upload className="w-4 h-4 text-slate-500" />} />
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-800">
                      Unfallkarte Hochladen (falls vorhanden)
                    </label>
                    
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleFileDrop(e, "unfallkarte")}
                      className="border-2 border-dashed border-slate-200 hover:border-sky-500 hover:bg-sky-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all uploader-box relative"
                    >
                      <input
                        type="file"
                        id="unfallkarte-upload-input"
                        onChange={(e) => handleFileSelect(e, "unfallkarte")}
                        className="hidden"
                      />
                      <label htmlFor="unfallkarte-upload-input" className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-sm font-semibold text-slate-700 block">
                          Ziehen Sie Ihre Dateien per Drag & Drop hierher
                        </span>
                        <span className="text-xs text-slate-400 block my-1">——— oder ———</span>
                        <span className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg inline-block font-semibold transition-colors mt-1">
                          Nach Dateien suchen
                        </span>
                        <span className="text-[10px] text-slate-400 mt-2 block">Größenlimit: 100.0 Mb</span>
                      </label>
                    </div>

                    {unfallkarteFile && (
                      <div className="flex items-center justify-between bg-sky-50/40 border border-sky-100 px-4 py-2.5 rounded-xl">
                        <span className="text-xs font-mono text-sky-800 truncate pr-4">{unfallkarteFile.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setUnfallkarteFile(null)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 14: Accident Photos Upload */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<Upload className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    Fotos vom Unfallort hochladen
                  </label>
                  
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFileDrop(e, "photos")}
                    className="border-2 border-dashed border-slate-200 hover:border-sky-500 hover:bg-sky-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all uploader-box relative"
                  >
                    <input
                      type="file"
                      id="photos-upload-input"
                      multiple
                      onChange={(e) => handleFileSelect(e, "photos")}
                      className="hidden"
                    />
                    <label htmlFor="photos-upload-input" className="cursor-pointer block">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-sm font-semibold text-slate-700 block">
                        Ziehen Sie Ihre Dateien per Drag & Drop hierher
                      </span>
                      <span className="text-xs text-slate-400 block my-1">——— oder ———</span>
                      <span className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg inline-block font-semibold transition-colors mt-1">
                        Nach Dateien suchen
                      </span>
                      <span className="text-[10px] text-slate-400 mt-2 block">Größenlimit: 100.0 Mb</span>
                    </label>
                  </div>

                  {accidentPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {accidentPhotos.map((photo, index) => (
                        <div key={index} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm relative group bg-slate-50">
                          <img 
                            src={photo.base64} 
                            alt={`Accident thumbnail ${index}`} 
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setAccidentPhotos(prev => prev.filter((_, idx) => idx !== index))}
                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors opacity-80 hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="block p-1.5 text-[9px] text-slate-500 truncate font-mono bg-white border-t border-slate-100">
                            {photo.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 15: Signature Canvas */}
              <div className="relative pl-0 sm:pl-14">
                <TimelineStepIcon icon={<PenTool className="w-4 h-4 text-slate-500" />} />
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    Ihre Unterschrift<span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-400">
                    Unterschreiben Sie ihr Formular digital mit Maus, Stift oder Finger.
                  </p>
                  
                  <div className="signature-canvas-container relative w-full h-44 overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-inner">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="absolute inset-0 w-full h-full cursor-crosshair"
                    />
                    
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="absolute bottom-3 right-3 text-xs bg-slate-100 hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer select-none"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 16: Submit */}
              <div className="pt-6 relative pl-0 sm:pl-14 flex justify-center sm:justify-start">
                <button
                  type="submit"
                  className="bg-[#38bdf8] hover:bg-[#0ea5e9] text-white text-base font-black px-12 py-4 rounded-full uppercase tracking-wider transition-all shadow-lg shadow-sky-400/20 active:scale-95 cursor-pointer select-none"
                >
                  SENDEN
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Portal Footer */}
        <div className="bg-slate-50 py-6 px-12 text-center border-t border-slate-100 text-[10px] text-slate-400 font-medium">
          KFZ-Gutachten Schadenmeldung • Powered by Aidaform
        </div>
      </div>
    </div>
  );
}

// Sub-components
function TimelineStepIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center z-10 shadow-sm hidden sm:flex">
      {icon}
    </div>
  );
}
