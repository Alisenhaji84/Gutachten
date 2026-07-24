import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { id, name, email, password } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server-Konfiguration unvollständig." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Update Auth attributes (email and password)
    const updateData: any = {
      email: email.trim().toLowerCase(),
      user_metadata: {
        name: name.trim(),
      },
    };
    if (password && password.trim()) {
      updateData.password = password.trim();
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      })
      .eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
