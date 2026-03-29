import { getNeonAuthBaseUrl } from "@/lib/env";

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function upstreamError(message: string, requestId?: string | null) {
  return Response.json(
    {
      error: message,
      requestId: requestId ?? null,
    },
    { status: 502 },
  );
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

async function requestUpstream(path: string, body: Record<string, unknown>) {
  return fetch(`${getNeonAuthBaseUrl()}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const email = normalizeEmail(payload?.email);

  if (!email) {
    return badRequest("有効なメールアドレスを入力してください。");
  }

  const response = await requestUpstream("email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    return upstreamError(
      data?.error ?? "認証コードの送信に失敗しました。",
      response.headers.get("x-neon-ret-request-id"),
    );
  }

  return Response.json({
    success: true,
  });
}
