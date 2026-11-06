import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const rawIdentifier = decodeURIComponent(params.id).trim();

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

    // 1. Try finding by UUID
    let caseObj: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawIdentifier);

    if (isUuid) {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", rawIdentifier)
        .maybeSingle();

      if (!error && data) {
        caseObj = data;
      }
    }

    // 2. If not found by UUID, try finding by License Plate (case-insensitive)
    if (!caseObj) {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .ilike("license_plate", rawIdentifier)
        .maybeSingle();

      if (!error && data) {
        caseObj = data;
      }
    }

    // 3. If still not found, try stripped license plate (without spaces/dashes)
    if (!caseObj) {
      const cleanPlate = rawIdentifier.replace(/[\s-]/g, "").toUpperCase();
      const { data: allCases } = await supabase.from("cases").select("*");
      if (allCases) {
        caseObj = allCases.find(
          (c) => (c.license_plate || "").replace(/[\s-]/g, "").toUpperCase() === cleanPlate
        );
      }
    }

    if (!caseObj) {
      return NextResponse.json(
        { error: `Fall mit Kennzeichen oder ID "${rawIdentifier}" wurde nicht gefunden.` },
        { status: 404 }
      );
    }

    // 4. Fetch all attached files for this case
    const { data: caseFiles } = await supabase
      .from("case_files")
      .select("*")
      .eq("case_id", caseObj.id)
      .order("created_at", { ascending: true });

    // 5. Fetch assigned assistant details if any
    let assistantInfo: any = null;
    if (caseObj.assistant_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", caseObj.assistant_id)
        .maybeSingle();

      if (profile) {
        assistantInfo = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          payout: caseObj.assistant_payout || 0,
          payout_paid: !!caseObj.assistant_payout_paid,
        };
      }
    }

    // 6. Format complete structured read-only response
    const formattedResponse = {
      id: caseObj.id,
      license_plate: caseObj.license_plate,
      status: caseObj.status,
      dashboard_url: `${baseUrl}/dashboard/case/${caseObj.id}`,
      client_portal_url: `${baseUrl}/client/${caseObj.client_token}`,
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
      files: (caseFiles || []).map((f) => ({
        id: f.id,
        file_name: f.file_name,
        file_url: f.file_url,
        file_type: f.file_type,
        uploaded_by: f.uploaded_by,
        created_at: f.created_at,
      })),
      assigned_employee: assistantInfo,
      timestamps: {
        created_at: caseObj.created_at,
        updated_at: caseObj.updated_at,
      },
    };

    return NextResponse.json(formattedResponse);
  } catch (err: any) {
    console.error("[API v1 /cases/[id]] Execution failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
