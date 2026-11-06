import { handleOptions, jsonResponse } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

export async function GET(request: Request) {
  const host = request.headers.get("host") || "app.kfz-gutachten-ludwigsburg.de";
  const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}/api/v1`;

  const documentation = {
    api_name: "KFZ-Gutachten Ludwigsburg REST API",
    version: "v1",
    status: "online",
    access_level: "read-only",
    base_url: baseUrl,
    authentication: {
      type: "API Key",
      description: "Senden Sie Ihren API-Schlüssel entweder im 'Authorization'-Header oder im 'X-API-Key'-Header.",
      headers: [
        { header: "Authorization", example: "Bearer kfz_live_..." },
        { header: "X-API-Key", example: "kfz_live_..." },
      ],
    },
    endpoints: [
      {
        path: "/cases",
        method: "GET",
        description: "Listet KFZ-Fälle auf. Unterstützt Volltextsuche und Statusfilterung.",
        query_parameters: {
          search: "Optional: Suchbegriff (Kennzeichen z.B. 'HN-RV 312', Telefon, E-Mail, Kundenname)",
          status: "Optional: Statusfilter ('Gutachten', 'Rechtsanwalt', 'Abgeschlossen', 'Archiviert' oder 'all')",
          limit: "Optional: Maximale Anzahl von Ergebnissen (Standard: 50, Maximum: 200)",
        },
        example_request: `curl -H "X-API-Key: YOUR_KEY" "${baseUrl}/cases?search=HN"`,
      },
      {
        path: "/cases/{id_or_license_plate}",
        method: "GET",
        description: "Ruft alle Detaildaten eines Falls per UUID oder amtlichem Kennzeichen ab (inkl. Schadensdetails, Versicherung, IBAN und allen Foto-/Dateilinks).",
        path_parameters: {
          id_or_license_plate: "Die UUID des Falls oder das amtliche Kennzeichen (z.B. 'HN-RV 312' oder 'HNRV312')",
        },
        example_request: `curl -H "X-API-Key: YOUR_KEY" "${baseUrl}/cases/HN-RV%20312"`,
      },
      {
        path: "/summary",
        method: "GET",
        description: "Liefert Kennzahlen des Gutachter-Büros (aktive Fälle, Aufteilung nach Status, neueste Fälle).",
        example_request: `curl -H "X-API-Key: YOUR_KEY" "${baseUrl}/summary"`,
      },
    ],
    cors: {
      enabled: true,
      allowed_origins: "*",
      allowed_methods: "GET, OPTIONS",
    },
    client_libraries: {
      python: {
        example: `import requests\n\nheaders = {"X-API-Key": "YOUR_KEY"}\nres = requests.get("${baseUrl}/cases", headers=headers)\nprint(res.json())`,
      },
      javascript: {
        example: `fetch("${baseUrl}/cases", {\n  headers: { "X-API-Key": "YOUR_KEY" }\n}).then(r => r.json()).then(console.log);`,
      },
    },
  };

  return jsonResponse(documentation);
}
