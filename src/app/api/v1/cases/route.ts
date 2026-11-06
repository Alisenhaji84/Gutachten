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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status")?.trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    let query = supabase.from("cases").select("*").order("created_at", { ascending: false }).limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: cases, error } = await query;

    if (error) {
      console.error("[API v1 /cases] Error fetching cases:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = cases || [];

    if (search) {
      filtered = filtered.filter((c) => {
        const plate = (c.license_plate || "").toLowerCase();
        const oppPlate = (c.opponent_license_plate || "").toLowerCase();
        const email = (c.client_email || "").toLowerCase();
        const phone = (c.client_phone || "").toLowerCase();
        const name = (c.client_name || "").toLowerCase();
        const damageNum = (c.damage_number || "").toLowerCase();
        return (
          plate.includes(search) ||
          oppPlate.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          name.includes(search) ||
          damageNum.includes(search)
        );
      });
    }

    const results = filtered.map((c) => ({
      id: c.id,
      license_plate: c.license_plate,
      status: c.status,
      client_name: c.client_name || null,
      client_email: c.client_email || null,
      client_phone: c.client_phone || null,
      opponent_license_plate: c.opponent_license_plate || null,
      damage_number: c.damage_number || null,
      accident_date: c.accident_date || null,
      accident_location: c.accident_location || null,
      dashboard_url: `${baseUrl}/dashboard/case/${c.id}`,
      client_portal_url: `${baseUrl}/client/${c.client_token}`,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));

    return NextResponse.json({
      total: results.length,
      cases: results,
    });
  } catch (err: any) {
    console.error("[API v1 /cases] Execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
