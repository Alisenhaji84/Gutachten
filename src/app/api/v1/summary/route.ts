import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    // Optional API key validation
    const apiSecretKey = process.env.API_SECRET_KEY;
    if (apiSecretKey) {
      const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
      if (apiKeyHeader !== apiSecretKey) {
        return NextResponse.json({ error: "Unauthorized: Invalid or missing API Key" }, { status: 401 });
      }
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const { data: cases, error } = await supabase
      .from("cases")
      .select("id, license_plate, status, created_at, client_name")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API v1 /summary] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allCases = cases || [];
    const totalCases = allCases.length;
    const activeCases = allCases.filter((c) => c.status !== "Abgeschlossen" && c.status !== "Archiviert").length;
    const gutachtenCount = allCases.filter((c) => c.status === "Gutachten").length;
    const rechtsanwaltCount = allCases.filter((c) => c.status === "Rechtsanwalt").length;
    const abgeschlossenCount = allCases.filter((c) => c.status === "Abgeschlossen").length;
    const archiviertCount = allCases.filter((c) => c.status === "Archiviert").length;

    const recentCases = allCases.slice(0, 5).map((c) => ({
      id: c.id,
      license_plate: c.license_plate,
      status: c.status,
      client_name: c.client_name || null,
      dashboard_url: `${baseUrl}/dashboard/case/${c.id}`,
      created_at: c.created_at,
    }));

    return NextResponse.json({
      total_cases: totalCases,
      active_cases: activeCases,
      by_status: {
        gutachten: gutachtenCount,
        rechtsanwalt: rechtsanwaltCount,
        abgeschlossen: abgeschlossenCount,
        archiviert: archiviertCount,
      },
      recent_cases: recentCases,
    });
  } catch (err: any) {
    console.error("[API v1 /summary] Execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
