import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { caseId, licensePlate, clientName, fileName } = await request.json();

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "bouizem.design@gmail.com";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    const timestamp = new Date().toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " Uhr";

    const subject = `Neue Datei hochgeladen: ${licensePlate} - ${clientName || "Kunde"}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Neue Datei hochgeladen</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px; margin: 0; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #0f172a; padding: 24px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">KFZ-Gutachten System</h2>
          </div>
          <div style="padding: 32px 24px;">
            <h3 style="margin-top: 0; margin-bottom: 20px; color: #0f172a; font-size: 18px; font-weight: 600;">Neue Datei im Kundenportal hochgeladen</h3>
            <p style="margin-bottom: 24px; font-size: 14px; line-height: 1.5; color: #475569;">
              Ein Kunde hat ein neues Dokument im Portal eingereicht. Unten finden Sie die Details:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 14px;">
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 0; font-weight: 600; color: #64748b; width: 140px;">Kennzeichen</td>
                  <td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${licensePlate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Kunde</td>
                  <td style="padding: 12px 0; color: #0f172a;">${clientName || "Unbekannter Kunde"}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Dateiname</td>
                  <td style="padding: 12px 0; font-family: monospace; color: #0f172a;">${fileName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Zeitpunkt</td>
                  <td style="padding: 12px 0; color: #0f172a;">${timestamp}</td>
                </tr>
              </tbody>
            </table>
            <div style="text-align: center; margin-bottom: 16px;">
              <a href="${caseUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-weight: 600; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.15);">
                Fall im Dashboard öffnen
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
            Dies ist eine automatische Benachrichtigung vom KFZ-Gutachten System.
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[Resend] Dispatching upload alert to: ${adminEmail}`);

    const result = await resend.emails.send({
      from: "KFZ-Gutachten System <onboarding@resend.dev>",
      to: adminEmail,
      subject,
      html: htmlBody,
    });

    if (result.error) {
      console.error("[Resend] Email send error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (err: any) {
    console.error("[Resend] API route execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
