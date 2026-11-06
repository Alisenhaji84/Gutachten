# KFZ-Gutachten Local MCP Server & Read-Only API

Lokaler **Read-Only Model Context Protocol (MCP)** Server und REST-API, um Falldaten, Fotos, Versicherungs- und Kundendaten sicher an externe KI-Agenten oder Software zu übergeben.

---

## 1. Lokale REST API Endpunkte

Wenn Ihre Next.js App lokal läuft (`npm run dev` auf `http://localhost:3000`):

| Endpunkt | Methode | Beschreibung |
| :--- | :--- | :--- |
| `http://localhost:3000/api/v1/cases` | `GET` | Listet alle Fälle auf. Filterbar mit `?status=Gutachten` oder `?search=HN-AA 123` |
| `http://localhost:3000/api/v1/cases/:id` | `GET` | Liefert **alle Details** (Kunde, Unfall, Versicherung, alle Foto-URLs, Mitarbeiter) per **Kennzeichen** (z.B. `HN-AA 123`) oder **UUID** |
| `http://localhost:3000/api/v1/summary` | `GET` | Übersicht & Statistik (Anzahl aktive Fälle, Fälle im Gutachten, beim Anwalt, etc.) |

Jeder Fall liefert direkt einen klickbaren Link für Ihren Browser:
- `dashboard_url`: `http://localhost:3000/dashboard/case/[id]` *(direkt in Google Chrome öffnen)*

---

## 2. MCP Server für KI-Agenten (Claude, Cursor, Python, etc.)

Der MCP Server (`mcp-server/index.mjs`) kommuniziert über den Standard `stdio` JSON-RPC.

### Starten über Terminal:
```bash
npm run mcp
# oder:
node mcp-server/index.mjs
```

### Konfiguration für Claude Desktop / Cursor / externe Agenten:
Fügen Sie Folgendes in Ihre MCP-Konfigurationsdatei (z.B. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kfz-gutachten": {
      "command": "node",
      "args": [
        "C:\\Users\\T480\\Desktop\\Disktop files\\Work\\Clients\\Gutachten Admin\\mcp-server\\index.mjs"
      ]
    }
  }
}
```

---

## 3. Verfügbare Tools im Agenten

1. **`get_case_details(case_id_or_plate)`**:
   - Suche nach Kennzeichen (z.B. `"HN-AA 123"`) oder Fall-ID.
   - Liefert alle Kontaktdaten, Unfallort, Datum, gegnerische Versicherung, Schadennummer, IBAN, Status, alle hochgeladenen Foto-URLs und den `localhost`-Link.

2. **`list_cases(status?, search?, limit?)`**:
   - Durchsucht und filtert Fälle.

3. **`get_case_files(case_id_or_plate)`**:
   - Liefert alle hochgeladenen Schadensfotos, Dokumente und Gutachten-Dateien als direkte Links.

4. **`get_dashboard_summary()`**:
   - Liefert Kennzahlen über offene und erledigte Gutachten.
