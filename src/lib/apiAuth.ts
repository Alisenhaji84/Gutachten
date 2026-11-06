import { NextResponse } from "next/server";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
};

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export function validateApiKey(request: Request): { authorized: boolean; response?: NextResponse } {
  const configuredKey =
    process.env.API_SECRET_KEY || process.env.KFZ_API_KEY || "kfz_live_9f83a4c7e2b106d5";

  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  const providedKey = (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader) || xApiKey;

  if (!providedKey || providedKey.trim() !== configuredKey.trim()) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Unauthorized: Ungültiger oder fehlender API-Schlüssel.",
          message:
            "Bitte übergeben Sie Ihren API-Schlüssel im Header 'Authorization: Bearer <API_KEY>' oder 'X-API-Key: <API_KEY>'.",
          documentation: "https://app.kfz-gutachten-ludwigsburg.de/api/v1",
        },
        {
          status: 401,
          headers: CORS_HEADERS,
        }
      ),
    };
  }

  return { authorized: true };
}

export function jsonResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}
