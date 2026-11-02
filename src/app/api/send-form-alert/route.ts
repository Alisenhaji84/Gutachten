import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type, // "form_submitted" | "phone_added" | "info_updated"
      caseId,
      licensePlate,
      clientName,
      clientPhone,
      clientEmail,
      details = {},
      source, // "client_portal" | "dashboard" | assistant name
    } = body;

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmailRaw = process.env.ADMIN_EMAIL || "bouizem.design@gmail.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "KFZ-Gutachten System <onboarding@resend.dev>";

    // Parse one or multiple recipients (separated by comma)
    const recipients = adminEmailRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const toRecipients = recipients.length > 1 ? recipients : (recipients[0] || "bouizem.design@gmail.com");

    // Dynamically build host-based URL fallback to ensure links work on production and local dev
    const host = request.headers.get("host") || "app.kfz-gutachten-ludwigsburg.de";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (!resendApiKey) {
      console.warn("[Resend] API Key is missing. Skipping email dispatch.");
      return NextResponse.json(
        { error: "Resend API key missing on server." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const caseUrl = `${appUrl.replace(/\/$/, "")}/dashboard/case/${caseId}`;

    // Format timestamp in German locale and Europe/Berlin timezone
    const timestamp =
      new Date().toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " Uhr";

    const plateText = licensePlate || "UNBEKANNT";

    let subject = "";
    let badgeText = "";
    let badgeBg = "#0284c7";
    let heading = "";
    let introText = "";

    if (type === "phone_added") {
      subject = `📞 Telefonnummer hinterlegt: ${plateText} - ${clientPhone || "Keine Nummer"}`;
      badgeText = "Telefonnummer hinterlegt";
      badgeBg = "#10b981"; // Emerald
      heading = "Neue Telefonnummer hinterlegt";
      introText = `Ein Kunde hat eine Telefonnummer für den Fall mit dem Kennzeichen <strong>${plateText}</strong> hinterlegt.`;
    } else if (type === "info_updated") {
      subject = `✏️ Angaben aktualisiert: ${plateText} ${clientPhone ? `(${clientPhone})` : ""}`;
      badgeText = "Angaben aktualisiert";
      badgeBg = "#f59e0b"; // Amber
      heading = "Falldaten wurden aktualisiert";
      const sourceLabel = source === "client_portal" ? "über das Kundenportal" : source ? `durch ${source}` : "im System";
      introText = `Die Angaben für den Fall mit dem Kennzeichen <strong>${plateText}</strong> wurden ${sourceLabel} aktualisiert.`;
    } else {
      // default: form_submitted
      subject = `📝 Schadenformular eingereicht: ${plateText} - ${clientPhone || clientEmail || clientName || "Kunde"}`;
      badgeText = "Schadenmeldung eingereicht";
      badgeBg = "#0284c7"; // Sky Blue
      heading = "Neues Schadenformular eingereicht";
      introText = `Ein Kunde hat das Schadensformular für das Kennzeichen <strong>${plateText}</strong> ausgefüllt und eingereicht.`;
    }

    // Build table rows
    const rows: { label: string; value: string; isLink?: boolean; linkType?: "tel" | "mailto" }[] = [
      { label: "Kennzeichen", value: plateText },
    ];

    if (clientPhone) {
      rows.push({ label: "Telefonnummer", value: clientPhone, isLink: true, linkType: "tel" });
    }
    if (clientEmail) {
      rows.push({ label: "E-Mail-Adresse", value: clientEmail, isLink: true, linkType: "mailto" });
    }
    if (clientName) {
      rows.push({ label: "Name des Kunden", value: clientName });
    }
    if (details.opponentLicensePlate) {
      rows.push({ label: "Gegner. Kennzeichen", value: details.opponentLicensePlate });
    }
    if (details.accidentLocation) {
      rows.push({ label: "Unfallort", value: details.accidentLocation });
    }
    if (details.accidentDate) {
      rows.push({ label: "Unfalldatum", value: details.accidentDate });
    }
    if (details.damageNumber) {
      rows.push({ label: "Schadennummer", value: details.damageNumber });
    }
    if (details.opponentInsuranceName) {
      rows.push({ label: "Gegner. Versicherung", value: details.opponentInsuranceName });
    }
    if (details.opponentInsuranceNumber) {
      rows.push({ label: "Versicherungsschein-Nr.", value: details.opponentInsuranceNumber });
    }
    if (typeof details.opposingInsuranceContacted === "boolean") {
      rows.push({ label: "Versicherung kontaktiert?", value: details.opposingInsuranceContacted ? "Ja" : "Nein" });
    }
    if (details.iban) {
      rows.push({ label: "IBAN", value: details.iban });
    }
    if (details.isScheckheftMaintained) {
      rows.push({ label: "Scheckheft gepflegt", value: details.isScheckheftMaintained });
    }
    if (details.isAccidentCardPresent) {
      rows.push({ label: "Unfallkarte vorhanden", value: details.isAccidentCardPresent });
    }
    if (details.hasSignature !== undefined) {
      rows.push({
        label: "Digitale Unterschrift",
        value: details.hasSignature ? "✅ Vorhanden & digital unterschrieben" : "Ausstehend",
      });
    }
    if (details.filesCount !== undefined && details.filesCount > 0) {
      rows.push({ label: "Angehängte Dateien", value: `${details.filesCount} Datei(en) eingereicht` });
    }
    rows.push({ label: "Zeitpunkt", value: timestamp });

    const tableRowsHtml = rows
      .map(
        (r, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
          <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 180px; font-size: 13px;">${r.label}</td>
          <td style="padding: 10px 14px; font-weight: ${r.label === "Kennzeichen" || r.label === "Telefonnummer" ? "700" : "500"}; color: #0f172a; font-size: 14px;">
            ${
              r.isLink && r.linkType === "tel"
                ? `<a href="tel:${r.value}" style="color: #0284c7; text-decoration: none; font-weight: 700;">📞 ${r.value}</a>`
                : r.isLink && r.linkType === "mailto"
                ? `<a href="mailto:${r.value}" style="color: #0284c7; text-decoration: none;">✉️ ${r.value}</a>`
                : r.value
            }
          </td>
        </tr>
      `
      )
      .join("");

    const phoneCallButtonHtml = clientPhone
      ? `
        <div style="margin-bottom: 16px;">
          <a href="tel:${clientPhone}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 24px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
            📞 Jetzt anrufen: ${clientPhone}
          </a>
        </div>
      `
      : "";

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${heading}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 32px 16px; margin: 0; color: #1e293b;">
        <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background-color: #0f172a; padding: 24px 24px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">KFZ-Gutachten System</h2>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px;">Digitales Schaden- & Gutachtenportal</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 24px;">
            <div style="margin-bottom: 16px;">
              <span style="display: inline-block; background-color: ${badgeBg}; color: #ffffff; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                ${badgeText}
              </span>
            </div>

            <h3 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 20px; font-weight: 700;">
              ${heading}
            </h3>

            <p style="margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #475569;">
              ${introText}
            </p>

            ${phoneCallButtonHtml}

            <!-- Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <!-- Dashboard Button -->
            <div style="text-align: center; margin-top: 24px; margin-bottom: 8px;">
              <a href="${caseUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.2);">
                Fall im Dashboard öffnen →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
            Automatische Benachrichtigung vom KFZ-Gutachten System.
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[Resend] Dispatching form alert (${type}) to:`, toRecipients);

    const result = await resend.emails.send({
      from: fromEmail,
      to: toRecipients,
      subject,
      html: htmlBody,
    });

    if (result.error) {
      console.error("[Resend] Email send error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (err: any) {
    console.error("[Resend] Form alert execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}