#!/usr/bin/env node

/**
 * KFZ-Gutachten MCP (Model Context Protocol) Server
 * Read-Only access for external agents & tools.
 * 
 * Works over standard stdio JSON-RPC.
 */

import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Load environment variables from .env.local if present
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

const LOCAL_API_BASE = process.env.LOCAL_API_BASE || "http://localhost:3000/api/v1";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const API_SECRET_KEY = process.env.API_SECRET_KEY || "";

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

// Helper to query local API with fallback to direct Supabase REST
async function fetchCasesFromApi(search, status, limit = 50) {
  const headers = {};
  if (API_SECRET_KEY) headers["x-api-key"] = API_SECRET_KEY;

  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (limit) params.set("limit", String(limit));

    const res = await fetch(`${LOCAL_API_BASE}/cases?${params.toString()}`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    logDebug("Local API unreachable, falling back to direct Supabase query...");
  }

  // Fallback: Direct Supabase REST
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Local Next.js server not running and Supabase credentials not found.");
  }

  const supaHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  let queryUrl = `${SUPABASE_URL}/rest/v1/cases?select=*&order=created_at.desc&limit=${limit}`;
  if (status && status !== "all") {
    queryUrl += `&status=eq.${encodeURIComponent(status)}`;
  }

  const supaRes = await fetch(queryUrl, { headers: supaHeaders });
  if (!supaRes.ok) {
    throw new Error(`Supabase error: ${supaRes.statusText}`);
  }

  let list = await supaRes.json();
  if (search) {
    const s = search.toLowerCase();
    list = list.filter((c) =>
      (c.license_plate || "").toLowerCase().includes(s) ||
      (c.client_email || "").toLowerCase().includes(s) ||
      (c.client_phone || "").toLowerCase().includes(s)
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
      dashboard_url: `http://localhost:3000/dashboard/case/${c.id}`,
      client_portal_url: `http://localhost:3000/client/${c.client_token}`,
      created_at: c.created_at,
    })),
  };
}

async function fetchCaseDetailsFromApi(caseIdOrPlate) {
  const headers = {};
  if (API_SECRET_KEY) headers["x-api-key"] = API_SECRET_KEY;

  try {
    const res = await fetch(`${LOCAL_API_BASE}/cases/${encodeURIComponent(caseIdOrPlate)}`, { headers });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 404) {
      const err = await res.json();
      return err;
    }
  } catch (e) {
    logDebug("Local API unreachable, falling back to direct Supabase query for details...");
  }

  // Fallback: Direct Supabase query
  const supaHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseIdOrPlate);
  let filterParam = isUuid ? `id=eq.${caseIdOrPlate}` : `license_plate=ilike.${encodeURIComponent(caseIdOrPlate)}`;

  const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/cases?${filterParam}&select=*&limit=1`, { headers: supaHeaders });
  const cases = await supaRes.json();
  if (!cases || cases.length === 0) {
    return { error: `Fall mit Kennzeichen oder ID "${caseIdOrPlate}" nicht gefunden.` };
  }

  const caseObj = cases[0];
  const filesRes = await fetch(`${SUPABASE_URL}/rest/v1/case_files?case_id=eq.${caseObj.id}&select=*`, { headers: supaHeaders });
  const files = await filesRes.json();

  return {
    id: caseObj.id,
    license_plate: caseObj.license_plate,
    status: caseObj.status,
    dashboard_url: `http://localhost:3000/dashboard/case/${caseObj.id}`,
    client_portal_url: `http://localhost:3000/client/${caseObj.client_token}`,
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
    appraisal: {
      is_scheckheft_maintained: caseObj.is_scheckheft_maintained || null,
      is_accident_card_present: caseObj.is_accident_card_present || null,
      has_signature: !!caseObj.signature_url,
      signature_url: caseObj.signature_url || null,
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

async function fetchSummaryFromApi() {
  const headers = {};
  if (API_SECRET_KEY) headers["x-api-key"] = API_SECRET_KEY;

  try {
    const res = await fetch(`${LOCAL_API_BASE}/summary`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    logDebug("Local API unreachable, calculating summary from Supabase...");
  }

  const supaHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/cases?select=id,license_plate,status,created_at`, { headers: supaHeaders });
  const allCases = await supaRes.json();

  const total = allCases.length;
  const gutachten = allCases.filter((c) => c.status === "Gutachten").length;
  const rechtsanwalt = allCases.filter((c) => c.status === "Rechtsanwalt").length;
  const abgeschlossen = allCases.filter((c) => c.status === "Abgeschlossen").length;

  return {
    total_cases: total,
    active_cases: allCases.filter((c) => c.status !== "Abgeschlossen" && c.status !== "Archiviert").length,
    by_status: { gutachten, rechtsanwalt, abgeschlossen },
    recent_cases: allCases.slice(0, 5).map((c) => ({
      id: c.id,
      license_plate: c.license_plate,
      status: c.status,
      dashboard_url: `http://localhost:3000/dashboard/case/${c.id}`,
    })),
  };
}

// Tool definitions
const TOOLS = [
  {
    name: "get_case_details",
    description: "Ruft vollständige Details für einen KFZ-Schadensfall ab (Kunde, Telefon, E-Mail, Unfallort, Gegner-Kennzeichen, Versicherung, IBAN, Status, alle Fotos/Dokumente-URLs und Klick-Link für Google Chrome). Suche direkt per Kennzeichen (z.B. 'HN-AA 123') oder per UUID.",
    inputSchema: {
      type: "object",
      properties: {
        case_id_or_plate: {
          type: "string",
          description: "Das amtliche Kennzeichen (z.B. 'HN-AA 123') oder die UUID des Falls.",
        },
      },
      required: ["case_id_or_plate"],
    },
  },
  {
    name: "list_cases",
    description: "Listet KFZ-Gutachten-Fälle auf. Unterstützt Filterung nach Status ('Gutachten', 'Rechtsanwalt', 'Abgeschlossen', 'Archiviert') und Suchbegriff (Kennzeichen, Telefonnummer, E-Mail oder Name). Liefert Links für jeden Fall.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Optional: 'Gutachten', 'Rechtsanwalt', 'Abgeschlossen', 'Archiviert' oder 'all'",
        },
        search: {
          type: "string",
          description: "Optionaler Suchbegriff (z.B. Kennzeichen 'HN', Telefon oder Name)",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl an Ergebnissen (Standard: 50)",
        },
      },
    },
  },
  {
    name: "get_case_files",
    description: "Liefert alle hochgeladenen Schadenfotos, Gutachten-Dokumente und Scheckheft-Dateien für ein Kennzeichen oder einen Fall als direkte URLs.",
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
    description: "Liefert statistische Kennzahlen des Gutachter-Büros: Anzahl aktiver Fälle, Fälle im Gutachten, beim Rechtsanwalt, abgeschlossene Fälle und die neuesten Fälle mit Links.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Main line handler for JSON-RPC
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);

    // 1. Initialize
    if (request.method === "initialize") {
      sendResponse(request.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "kfz-gutachten-mcp",
          version: "1.0.0",
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
            dashboard_url: caseDetails.dashboard_url,
            files_count: files.length,
            files,
          };
        } else if (name === "get_dashboard_summary") {
          resultData = await fetchSummaryFromApi();
        } else {
          sendError(request.id, -32601, `Unknown tool: ${name}`);
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
              error: `Fehler beim Abrufen der Falldaten: ${toolErr.message}. Bitte stellen Sie sicher, dass 'npm run dev' auf http://localhost:3000 läuft.`,
            }, null, 2),
          }],
          isError: true,
        });
      }
      return;
    }

    sendError(request.id, -32601, `Unknown method: ${request.method}`);
  } catch (err) {
    logDebug("Error processing request:", err.message);
    sendError(null, -32700, "Parse error or execution failure", err.message);
  }
});
