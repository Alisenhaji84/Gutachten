# KFZ-Gutachten Ludwigsburg — Enterprise Read-Only API & MCP Server

Enterprise-grade **Read-Only REST API** und **Model Context Protocol (MCP)** Server, konzipiert für:
- Externe KI-Agenten (Claude Desktop, Cursor, Custom Agents, AutoGen, CrewAI).
- Externe Software, Webhooks, Portale & Datenabfragen.
- Den Inhaber / Administrator auf entfernten Laptops in anderen Städten (über sichere HTTPS-Verbindung).

---

## 1. Zugangsdaten & Konfiguration (Production)

| Parameter | Wert |
| :--- | :--- |
| **API Base URL** | `https://app.kfz-gutachten-ludwigsburg.de/api/v1` |
| **Discovery / Doku** | `https://app.kfz-gutachten-ludwigsburg.de/api/v1` |
| **Standard API-Schlüssel** | In Vercel als `API_SECRET_KEY` konfigurieren (z.B. `<YOUR_API_KEY>`) |
| **Zugriffsebene** | **Read-Only** (reine Abfrage von Fällen, Fotos & Status – keine Schreib- oder Löschrechte) |
| **CORS** | Vollständig aktiviert (`Access-Control-Allow-Origin: *`) für Browser & Web-Apps |

### Authentifizierung
Übergeben Sie den API-Schlüssel in einem der beiden Header:
```http
Authorization: Bearer <YOUR_API_KEY>
```
oder
```http
X-API-Key: <YOUR_API_KEY>
```

---

## 2. REST API Endpunkte

### A. Fall-Liste & Suche (`GET /cases`)
Listet alle KFZ-Schadensfälle auf.
- **URL**: `https://app.kfz-gutachten-ludwigsburg.de/api/v1/cases`
- **Optionale Query-Parameter**:
  - `search`: Volltextsuche nach Kennzeichen (`HN-RV 312`), Kundenname, Telefonnummer, E-Mail oder Schadennummer.
  - `status`: Filter nach Status (`Gutachten`, `Rechtsanwalt`, `Abgeschlossen`, `Archiviert` oder `all`).
  - `limit`: Anzahl der Fälle (Standard: 50, Maximum: 200).
- **Beispiel curl**:
```bash
curl -H "X-API-Key: <YOUR_API_KEY>" \
  "https://app.kfz-gutachten-ludwigsburg.de/api/v1/cases?search=HN"
```

### B. Fall-Details & Fotos (`GET /cases/{id_or_license_plate}`)
Liefert alle Detaildaten eines Falls per **Kennzeichen** (z.B. `HN-RV 312` oder `HNRV312`) oder per **UUID**.
- **URL**: `https://app.kfz-gutachten-ludwigsburg.de/api/v1/cases/HN-RV%20312`
- **Enthält**:
  - Stammdaten des Kunden (Name, Telefon, E-Mail, IBAN)
  - Unfalldetails (Ort, Datum, Gegner-Kennzeichen, Schadennummer)
  - Versicherungsdaten (Gegnerische Versicherung, Schadennummer, Status)
  - Direkte URLs zu **allen hochgeladenen Schadenfotos & Gutachten-Dokumenten**
  - Klickbare Links direkt ins Web-Dashboard: `dashboard_url`
- **Beispiel curl**:
```bash
curl -H "X-API-Key: <YOUR_API_KEY>" \
  "https://app.kfz-gutachten-ludwigsburg.de/api/v1/cases/HN-RV%20312"
```

### C. Dashboard & Statistik (`GET /summary`)
Liefert Kennzahlen des Büros (Anzahl aktiver Fälle, Aufteilung nach Status, neueste 5 Fälle mit Dashboard-Links).
- **URL**: `https://app.kfz-gutachten-ludwigsburg.de/api/v1/summary`
- **Beispiel curl**:
```bash
curl -H "X-API-Key: <YOUR_API_KEY>" \
  "https://app.kfz-gutachten-ludwigsburg.de/api/v1/summary"
```

---

## 3. Code-Beispiele für externe Software & Agenten

### Python
```python
import requests

API_URL = "https://app.kfz-gutachten-ludwigsburg.de/api/v1"
API_KEY = "<YOUR_API_KEY>"
headers = {"X-API-Key": API_KEY}

# 1. Fall nach Kennzeichen suchen
response = requests.get(f"{API_URL}/cases/HN-RV 312", headers=headers)
case_data = response.json()
print("Kunde:", case_data["client"]["name"])
print("Fotos:", len(case_data["files"]))
print("Dashboard:", case_data["dashboard_url"])

# 2. Alle offenen Gutachten auflisten
response = requests.get(f"{API_URL}/cases?status=Gutachten", headers=headers)
print("Offene Gutachten:", response.json()["total"])
```

### JavaScript / Node.js
```javascript
const API_URL = "https://app.kfz-gutachten-ludwigsburg.de/api/v1";
const API_KEY = "<YOUR_API_KEY>";

const res = await fetch(`${API_URL}/cases/HN-RV 312`, {
  headers: { "X-API-Key": API_KEY }
});
const caseDetails = await res.json();
console.log(caseDetails);
```

---

## 4. MCP Server Setup (Claude Desktop & Cursor)

Der MCP Server (`mcp-server/index.mjs`) verbindet KI-Agenten über das standardisierte Model Context Protocol (JSON-RPC) mit dem Gutachten-Portal.

### Für den Inhaber / entfernte Laptops:
Auf dem Laptop des Inhabers muss lediglich `Node.js` installiert sein. Das Skript `index.mjs` greift direkt online über HTTPS auf `https://app.kfz-gutachten-ludwigsburg.de/api/v1` zu.

Konfigurationsbeispiel für `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "kfz-gutachten": {
      "command": "node",
      "args": ["/Pfad/zu/mcp-server/index.mjs"],
      "env": {
        "API_BASE_URL": "https://app.kfz-gutachten-ludwigsburg.de/api/v1",
        "API_SECRET_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

### Bereitgestellte Tools im KI-Agenten:
1. `get_case_details(case_id_or_plate)`: Holt vollständige Fallakte inklusive Kundenkontakt, Unfallgegner, Versicherung und Fotolinks per Kennzeichen oder UUID.
2. `list_cases(status, search, limit)`: Durchsucht alle Fälle im System.
3. `get_case_files(case_id_or_plate)`: Liefert alle Schadenfotos und Dokumente als direkte Links.
4. `get_dashboard_summary()`: Holt Kennzahlen über aktive und abgeschlossene Gutachten.
