import { validateApiKey, handleOptions, jsonResponse } from "@/lib/apiAuth";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export const OPTIONS = handleOptions;

export async function GET(request: Request) {
  try {
    // 1. Authenticate API Key
    const auth = validateApiKey(request);
    if (!auth.authorized) {
      return auth.response!;
    }

    const host = request.headers.get("host") || "app.kfz-gutachten-ludwigsburg.de";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const { data: cases, error } = await supabase
      .from("cases")
      .select("id, license_plate, status, created_at, client_name")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API v1 /summary] Error:", error);
      return jsonResponse({ error: error.message }, 500);
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

    return jsonResponse({
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
    return jsonResponse({ error: err.message }, 500);
  }
}
