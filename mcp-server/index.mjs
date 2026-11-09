#!/usr/bin/env node

/**
 * KFZ-Gutachten Model Context Protocol (MCP) Server
 * Enterprise Read-Only access for remote AI agents & tools (Claude Desktop, Cursor, Custom Agents).
 * 
 * Communicates directly with the live production API or local instance.
 * Protocol: JSON-RPC 2.0 over standard I/O (stdio).
 */

import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Optional: Load environment variables from .env.local if running in project directory
function loadEnv() {
  const envPath = path.join(projectRoot, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}
loadEnv();

// Remote / Live Production API is the primary target
const API_BASE_URL = (
  process.env.API_BASE_URL ||
  process.env.LOCAL_API_BASE ||
  "https://app.kfz-gutachten-ludwigsburg.de/api/v1"
).replace(/\/+$/, "");

const API_SECRET_KEY =
  process.env.API_SECRET_KEY ||
  process.env.KFZ_API_KEY ||
  "";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function logDebug(...args) {
  process.stderr.write(`[KFZ-MCP] ${args.join(" ")}\n`);
}

function sendResponse(id, result) {
  const msg = JSON.stringify({
    jsonrpc: "2.0",
    id,
    result,
  });
  process.stdout.write(msg + "\n");
}

function sendError(id, code, message, data) {
  const msg = JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message, data },
  });
  process.stdout.write(msg + "\n");
}

function getRequestHeaders() {
  const headers = {
    Accept: "application/json",
  };
  if (API_SECRET_KEY) {
    headers["Authorization"] = `Bearer ${API_SECRET_KEY}`;
    headers["X-API-Key"] = API_SECRET_KEY;
  }
  return headers;
}

// 1. Fetch Cases (List / Search)
async function fetchCasesFromApi(search, status, limit = 50) {
  const headers = getRequestHeaders();

  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (limit) params.set("limit", String(limit));

    const url = `${API_BASE_URL}/cases?${params.toString()}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    logDebug(`API response not OK (${res.status}): ${errText}`);
  } catch (e) {
    logDebug("API request error:", e.message);
  }

  // Fallback: Direct Supabase REST query if credentials exist in environment
  if (SUPABASE_URL && SUPABASE_KEY) {
    logDebug("Falling back to direct Supabase REST query...");
    const supaHeaders = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    let queryUrl = `${SUPABASE_URL}/rest/v1/cases?select=*&order=created_at.desc&limit=${limit}`;
    if (status && status !== "all") {
      queryUrl += `&status=eq.${encodeURIComponent(status)}`;
    }

    const supaRes = await fetch(queryUrl, { headers: supaHeaders });
    if (supaRes.ok) {
      let list = await supaRes.json();
      if (search) {
        const s = search.toLowerCase();
        list = list.filter((c) =>
          (c.license_plate || "").toLowerCase().includes(s) ||
          (c.opponent_license_plate || "").toLowerCase().includes(s) ||
          (c.client_email || "").toLowerCase().includes(s) ||
          (c.client_phone || "").toLowerCase().includes(s) ||
          (c.client_name || "").toLowerCase().includes(s)
        );
      }

      return {
        total: list.length,
        cases: list.map((c) => ({
          id: c.id,
          license_plate: c.license_plate,
          status: c.status,
          client_name: c.client_name,
          client_phone: c.client_phone,
          dashboard_url: `https://app.kfz-gutachten-ludwigsburg.de/dashboard/case/${c.id}`,
          client_portal_url: `https://app.kfz-gutachten-ludwigsburg.de/client/${c.client_token}`,
          created_at: c.created_at,
        })),
      };
    }
  }

  throw new Error(`Konnte keine Verbindung zu ${API_BASE_URL}/cases herstellen.`);
}

// 2. Fetch Single Case Details
async function fetchCaseDetailsFromApi(caseIdOrPlate) {
  const headers = getRequestHeaders();

  try {
    const url = `${API_BASE_URL}/cases/${encodeURIComponent(caseIdOrPlate)}`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 404) {
      const err = await res.json();
      return err;
    }
    const errText = await res.text();
    logDebug(`API response not OK (${res.status}): ${errText}`);
  } catch (e) {
    logDebug("API request error for details:", e.message);
  }

  // Fallback: Direct Supabase query
  if (SUPABASE_URL && SUPABASE_KEY) {
    const supaHeaders = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseIdOrPlate);
    let filterParam = isUuid ? `id=eq.${caseIdOrPlate}` : `license_plate=ilike.${encodeURIComponent(caseIdOrPlate)}`;

    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/cases?${filterParam}&select=*&limit=1`, { headers: supaHeaders });
    const cases = await supaRes.json();
    if (cases && cases.length > 0) {
      const caseObj = cases[0];
      const filesRes = await fetch(`${SUPABASE_URL}/rest/v1/case_files?case_id=eq.${caseObj.id}&select=*`, { headers: supaHeaders });
      const files = await filesRes.json();

      return {
        id: caseObj.id,
        license_plate: caseObj.license_plate,
        status: caseObj.status,
        dashboard_url: `https://app.kfz-gutachten-ludwigsburg.de/dashboard/case/${caseObj.id}`,
        client_portal_url: `https://app.kfz-gutachten-ludwigsburg.de/client/${caseObj.client_token}`,
        client: {
          name: caseObj.client_name || null,
          phone: caseObj.client_phone || null,
          email: caseObj.client_email || null,
          iban: caseObj.iban || null,
        },
        accident: {
          location: caseObj.accident_location || null,
          date: caseObj.accident_date || null,
          opponent_license_plate: caseObj.opponent_license_plate || null,
          damage_number: caseObj.damage_number || null,
        },
        insurance: {
          opponent_insurance_name: caseObj.opponent_insurance_name || null,
          opponent_insurance_number: caseObj.opponent_insurance_number || null,
          opposing_insurance_contacted: !!caseObj.opposing_insurance_contacted,
        },
        files: (files || []).map((f) => ({
          name: f.file_name,
          url: f.file_url,
          type: f.file_type,
          uploaded_by: f.uploaded_by,
          created_at: f.created_at,
        })),
      };
    }
  }

  throw new Error(`Konnte Fall "${caseIdOrPlate}" nicht über ${API_BASE_URL} abrufen.`);
}

// 3. Fetch Summary
async function fetchSummaryFromApi() {
  const headers = getRequestHeaders();

  try {
    const url = `${API_BASE_URL}/summary`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    logDebug("API request error for summary:", e.message);
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    const supaHeaders = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/cases?select=id,license_plate,status,created_at`, { headers: supaHeaders });
    if (supaRes.ok) {
      const allCases = await supaRes.json();
      return {
        total_cases: allCases.length,
        active_cases: allCases.filter((c) => c.status !== "Abgeschlossen" && c.status !== "Archiviert").length,
        by_status: {
          gutachten: allCases.filter((c) => c.status === "Gutachten").length,
          rechtsanwalt: allCases.filter((c) => c.status === "Rechtsanwalt").length,
          abgeschlossen: allCases.filter((c) => c.status === "Abgeschlossen").length,
        },
      };
    }
  }

  throw new Error(`Konnte Dashboard-Zusammenfassung nicht über ${API_BASE_URL} abrufen.`);
}

// Tool definitions for MCP Clients
const TOOLS = [
  {
    name: "get_case_details",
    description: "Ruft vollständige Details für einen KFZ-Schadensfall ab (Kunde, Telefon, E-Mail, Unfallort, Gegner-Kennzeichen, Versicherung, Schadennummer, IBAN, Status, alle Fotos/Dokumente-URLs und Direkt-Links zum Dashboard). Suche per Kennzeichen (z.B. 'HN-RV 312') oder per Fall-UUID.",
    inputSchema: {
      type: "object",
      properties: {
        case_id_or_plate: {
          type: "string",
          description: "Das amtliche Kennzeichen (z.B. 'HN-RV 312' oder 'HNRV312') oder die UUID des Falls.",
        },
      },
      required: ["case_id_or_plate"],
    },
  },
  {
    name: "list_cases",
    description: "Listet KFZ-Gutachten-Fälle auf. Unterstützt Filterung nach Status ('Gutachten', 'Rechtsanwalt', 'Abgeschlossen', 'Archiviert' oder 'all') und Freitext-Suche (Kennzeichen, Telefonnummer, E-Mail oder Kundenname).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional: 'Gutachten', 'Rechtsanwalt', 'Abgeschlossen', 'Archiviert' oder 'all'",
        },
        search: {
          type: "string",
          description: "Optionaler Suchbegriff (z.B. Kennzeichen 'HN-RV 312', Kundenname oder Telefon)",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl an Ergebnissen (Standard: 50, Max: 200)",
        },
      },
    },
  },
  {
    name: "get_case_files",
    description: "Liefert alle hochgeladenen Schadenfotos, Gutachten-Dokumente und Fahrzeugunterlagen für ein Kennzeichen oder einen Fall als direkte URLs.",
    inputSchema: {
      type: "object",
      properties: {
        case_id_or_plate: {
          type: "string",
          description: "Amtliches Kennzeichen oder UUID des Falls.",
        },
      },
      required: ["case_id_or_plate"],
    },
  },
  {
    name: "get_dashboard_summary",
    description: "Liefert statistische Kennzahlen des Gutachter-Büros: Gesamtzahl Fälle, aktive Fälle, Fälle im Gutachten, beim Rechtsanwalt, abgeschlossene Fälle und die neuesten Fälle mit Links.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Main JSON-RPC 2.0 router
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);

    // 1. Initialize Handshake
    if (request.method === "initialize") {
      sendResponse(request.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "kfz-gutachten-mcp",
          version: "1.1.0",
        },
      });
      return;
    }

    // 2. Initialized notification
    if (request.method === "notifications/initialized") {
      return;
    }

    // 3. Ping
    if (request.method === "ping") {
      sendResponse(request.id, {});
      return;
    }

    // 4. List Tools
    if (request.method === "tools/list") {
      sendResponse(request.id, {
        tools: TOOLS,
      });
      return;
    }

    // 5. Call Tool
    if (request.method === "tools/call") {
      const { name, arguments: args = {} } = request.params || {};

      try {
        let resultData;
        if (name === "get_case_details") {
          resultData = await fetchCaseDetailsFromApi(args.case_id_or_plate);
        } else if (name === "list_cases") {
          resultData = await fetchCasesFromApi(args.search, args.status, args.limit);
        } else if (name === "get_case_files") {
          const caseDetails = await fetchCaseDetailsFromApi(args.case_id_or_plate);
          const files = caseDetails.files || [];
          resultData = {
            case: args.case_id_or_plate,
            license_plate: caseDetails.license_plate,
            dashboard_url: caseDetails.dashboard_url,
            files_count: files.length,
            files,
          };
        } else if (name === "get_dashboard_summary") {
          resultData = await fetchSummaryFromApi();
        } else {
          sendError(request.id, -32601, `Unbekanntes Tool: ${name}`);
          return;
        }

        sendResponse(request.id, {
          content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }],
        });
      } catch (toolErr) {
        logDebug("Tool execution error:", toolErr.message);
        sendResponse(request.id, {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Fehler beim Abrufen der Falldaten: ${toolErr.message}`,
              help: `Stellen Sie sicher, dass die API unter ${API_BASE_URL} erreichbar ist und Ihr API_SECRET_KEY gültig ist.`,
            }, null, 2),
          }],
          isError: true,
        });
      }
      return;
    }

    sendError(request.id, -32601, `Unbekannte Methode: ${request.method}`);
  } catch (err) {
    logDebug("Error processing request:", err.message);
    sendError(null, -32700, "Parse error or execution failure", err.message);
  }
});
