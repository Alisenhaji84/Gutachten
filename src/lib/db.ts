import { supabase } from "./supabaseClient";

export type CaseStatus = "Gutachten" | "Rechtsanwalt" | "Abgeschlossen" | "Archiviert";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "assistant";
  password?: string; // Optional in production, handled by Supabase Auth
  created_at: string;
}

export interface Case {
  id: string;
  license_plate: string;
  status: CaseStatus;
  assistant_id?: string;
  client_token: string;
  created_at: string;
  updated_at: string;

  // Form Client fields
  accident_location?: string;
  accident_date?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_insurance?: string;
  client_policy_number?: string;
  opponent_name?: string;
  opponent_insurance?: string;
  opponent_policy_number?: string;
  signature?: string; // Renders drawn SVG coordinates or path URL
  signature_url?: string;
  opponent_license_plate?: string;
  damage_number?: string;
  opponent_insurance_name?: string;
  opponent_insurance_number?: string;
  is_scheckheft_maintained?: string;
  is_accident_card_present?: string;
  assistant_payout?: number;
  iban?: string;
  opposing_insurance_contacted?: boolean;
}

export interface CaseFile {
  id: string;
  case_id: string;
  file_name: string;
  file_url: string;
  file_type: "scheckheft" | "accident_card" | "accident_photos" | "additional";
  uploaded_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  case_id: string;
  license_plate: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  is_read: boolean;
}

// Helper to check if running in browser
const isBrowser = () => typeof window !== "undefined";

// DB Initializer (Noop in Supabase, but kept for compatibility to avoid breaking pages)
export function initDb() {
  if (isBrowser()) {
    console.log("Supabase-Datenbank aktiv.");
  }
}

// User Actions
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function createAssistant(name: string, email: string, passwordString: string): Promise<User> {
  const res = await fetch("/api/create-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: passwordString }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error || "Fehler beim Erstellen des Mitarbeiters.");
  }
  
  // Retrieve the generated public profile to return
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", body.user.id)
    .single();

  if (profileErr || !profile) {
    throw new Error(profileErr?.message || "Fehler beim Laden des Mitarbeiterprofils.");
  }

  return profile as User;
}

export async function loginUser(email: string, passwordString: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: passwordString.trim(),
  });
  if (error) {
    console.error("Supabase auth.signInWithPassword error:", error.message);
    return null;
  }
  if (!data.user) {
    return null;
  }
  
  // Fetch profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileErr || !profile) {
    console.error("Profil für authentifizierten Benutzer fehlt", profileErr);
    return null;
  }

  return profile as User;
}

export async function updateUser(id: string, data: Partial<Omit<User, "id" | "role">>): Promise<User> {
  const res = await fetch("/api/update-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      name: data.name,
      email: data.email,
      password: data.password,
    }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error || "Fehler beim Aktualisieren des Mitarbeiters.");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileErr || !profile) {
    throw new Error(profileErr?.message || "Fehler beim Laden des aktualisierten Profils.");
  }

  return profile as User;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch("/api/delete-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.error || "Fehler beim Löschen des Mitarbeiters.");
  }
}

// Case Actions
export async function getCases(currentUser: User): Promise<Case[]> {
  let query = supabase.from("cases").select("*");
  if (currentUser.role !== "admin") {
    // Non-admins see only assigned cases
    query = query.eq("assistant_id", currentUser.id);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function getCaseById(id: string, currentUser: User): Promise<Case | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    return null;
  }
  // Security check: assistant can only view their own cases
  if (currentUser.role !== "admin" && data.assistant_id !== currentUser.id) {
    return null;
  }
  return data as Case;
}

export async function createCase(licensePlate: string, assistantId?: string): Promise<Case> {
  const token = typeof crypto !== "undefined" && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  let finalAssistantId = assistantId || null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (profile?.role === "assistant") {
        finalAssistantId = user.id;
      }
    }
  } catch (err) {
    console.error("Fehler beim Abrufen der Benutzerrolle bei der Fallerstellung:", err);
  }

  const { data, error } = await supabase
    .from("cases")
    .insert({
      license_plate: licensePlate.toUpperCase().trim(),
      status: "Gutachten",
      assistant_id: finalAssistantId,
      client_token: token,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Case;
}

export async function updateCaseStatus(id: string, status: CaseStatus): Promise<Case> {
  const { data, error } = await supabase
    .from("cases")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Case;
}

export async function updateCaseAssistant(id: string, assistantId?: string): Promise<Case> {
  const { data, error } = await supabase
    .from("cases")
    .update({
      assistant_id: assistantId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Case;
}

export async function getCaseByToken(token: string): Promise<Case | null> {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("client_token", token)
    .single();
  if (error || !data) {
    return null;
  }
  return data as Case;
}

export async function updateCaseClientData(token: string, clientData: Partial<Case>): Promise<Case> {
  const { data, error } = await supabase
    .from("cases")
    .update({
      ...clientData,
      updated_at: new Date().toISOString(),
    })
    .eq("client_token", token)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Case;
}

export async function updateCase(id: string, updateData: Partial<Case>, role?: string): Promise<Case> {
  const { data, error } = await supabase
    .from("cases")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Case;
}

// Helper to convert base64 data URL to Blob
function base64ToBlob(base64Data: string): Blob {
  try {
    const parts = base64Data.split(";base64,");
    const contentType = parts[0].split(":")[1] || "application/octet-stream";
    const raw = window.atob(parts[1] || base64Data);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error("Fehler beim Konvertieren von Base64 zu Blob:", e);
    // Return empty blob as fallback
    return new Blob([], { type: "application/octet-stream" });
  }
}

// File Upload / Storage Actions
export async function uploadFile(
  caseId: string,
  fileType: CaseFile["file_type"],
  fileName: string,
  fileData: string, // Base64 data URL
  uploadedBy: string
): Promise<CaseFile> {
  if (!isBrowser()) {
    throw new Error("Dateiupload ist nur im Browser möglich");
  }

  // 1. Convert base64 to Blob
  const blob = base64ToBlob(fileData);
  const cleanFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = `cases/${caseId}/${cleanFileName}`;

  // 2. Upload to Supabase Storage Bucket 'case-files'
  const { error: uploadError } = await supabase.storage
    .from("case-files")
    .upload(filePath, blob, {
      contentType: blob.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Fehler beim Hochladen der Datei: ${uploadError.message}`);
  }

  // 3. Get public url
  const { data: urlData } = supabase.storage
    .from("case-files")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // 4. Log file record in public.case_files table
  const { data: loggedFile, error: logError } = await supabase
    .from("case_files")
    .insert({
      case_id: caseId,
      file_name: fileName,
      file_url: publicUrl,
      file_type: fileType,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (logError) {
    throw new Error(`Fehler beim Protokollieren der Datei: ${logError.message}`);
  }

  // 5. Create notification logs for Admin
  try {
    const { data: caseObj } = await supabase
      .from("cases")
      .select("license_plate, client_name")
      .eq("id", caseId)
      .single();

    const licensePlate = caseObj?.license_plate || "UNBEKANNT";
    const clientName = caseObj?.client_name || "Kunde";

    await supabase.from("notifications").insert({
      case_id: caseId,
      license_plate: licensePlate,
      file_name: fileName,
      uploaded_by: uploadedBy,
    });

    // 6. Trigger non-blocking background email alert using Resend API Route
    if (isBrowser()) {
      fetch("/api/send-upload-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          licensePlate,
          clientName,
          fileName,
        }),
      }).catch((emailErr) => {
        console.error("Fehler beim Senden der E-Mail-Benachrichtigung über Resend:", emailErr);
      });
    }
  } catch (notifErr) {
    console.error("Fehler beim Erstellen der Admin-Benachrichtigung", notifErr);
  }

  // Console email logging simulation
  console.log(
    `%c[AUTOMATISCHE E-MAIL AN ADMIN]%c\nBetreff: Neue Datei für Fall hochgeladen\nDie Datei "${fileName}" wurde von "${uploadedBy}" hochgeladen.`,
    "color: #ff3333; font-weight: bold;",
    ""
  );

  return loggedFile as CaseFile;
}

export async function getFilesForCase(caseId: string): Promise<CaseFile[]> {
  const { data, error } = await supabase
    .from("case_files")
    .select("*")
    .eq("case_id", caseId);

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

// Notification Actions
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function markNotificationsAsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  // 1. List files under cases/caseId/ in storage
  const { data: list, error: listError } = await supabase.storage
    .from("case-files")
    .list(`cases/${caseId}`);

  if (listError) {
    console.error("Fehler beim Auflisten der Dateien im Speicher:", listError.message);
  }

  // 2. Remove files from Supabase Storage bucket
  if (list && list.length > 0) {
    const paths = list.map(item => `cases/${caseId}/${item.name}`);
    const { error: removeError } = await supabase.storage
      .from("case-files")
      .remove(paths);
    if (removeError) {
      console.error("Fehler beim Löschen der Dateien im Speicher:", removeError.message);
    }
  }

  // 3. Delete case_files records from database
  const { error: fileDeleteError } = await supabase
    .from("case_files")
    .delete()
    .eq("case_id", caseId);
  if (fileDeleteError) {
    throw new Error(`Fehler beim Löschen der Fall-Dateien aus der Datenbank: ${fileDeleteError.message}`);
  }

  // 4. Delete the case itself from cases database table
  const { error: caseDeleteError } = await supabase
    .from("cases")
    .delete()
    .eq("id", caseId);
  if (caseDeleteError) {
    throw new Error(`Fehler beim Löschen des Falls aus der Datenbank: ${caseDeleteError.message}`);
  }
}

export async function archiveCase(caseId: string): Promise<void> {
  // 1. List files under cases/caseId/ in storage
  const { data: list, error: listError } = await supabase.storage
    .from("case-files")
    .list(`cases/${caseId}`);

  if (listError) {
    console.error("Fehler beim Auflisten der Dateien im Speicher:", listError.message);
  }

  // 2. Remove files from Supabase Storage bucket
  if (list && list.length > 0) {
    const paths = list.map(item => `cases/${caseId}/${item.name}`);
    const { error: removeError } = await supabase.storage
      .from("case-files")
      .remove(paths);
    if (removeError) {
      console.error("Fehler beim Löschen der Dateien im Speicher:", removeError.message);
    }
  }

  // 3. Delete case_files records from database
  const { error: fileDeleteError } = await supabase
    .from("case_files")
    .delete()
    .eq("case_id", caseId);
  if (fileDeleteError) {
    throw new Error(`Fehler beim Löschen der Fall-Dateien aus der Datenbank: ${fileDeleteError.message}`);
  }

  // 4. Update the case status to 'Archiviert' in the cases table
  const { error: statusUpdateError } = await supabase
    .from("cases")
    .update({ status: "Archiviert", updated_at: new Date().toISOString() })
    .eq("id", caseId);
  if (statusUpdateError) {
    throw new Error(`Fehler beim Archivieren des Falls in der Datenbank: ${statusUpdateError.message}`);
  }
}
