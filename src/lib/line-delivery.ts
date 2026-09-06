import { setTimeout } from "node:timers/promises";

type LineMessage = { to: string; text: string; retryKey: string };

export async function sendLineMessage(
  message: LineMessage,
  token: string,
  deps: { fetch?: typeof fetch; wait?: () => Promise<void> } = {},
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await (deps.fetch ?? fetch)("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Line-Retry-Key": message.retryKey,
        },
        body: JSON.stringify({ to: message.to, messages: [{ type: "text", text: message.text }] }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      if (attempt === 1) throw new Error("LINE request failed after retry");
      await (deps.wait ?? (() => setTimeout(500)))();
      continue;
    }
    if (response.ok || (response.status === 409 && response.headers.has("x-line-accepted-request-id"))) return;
    if (response.status < 500 || attempt === 1) {
      throw new Error(`LINE request failed (${response.status})`);
    }
    await (deps.wait ?? (() => setTimeout(500)))();
  }
}

// Called while holding the delivery row lock. The intent must already be committed.
export async function deliverLineNotification(
  row: LineMessage & { sentAt: Date | null; createdAt: Date },
  deps: { now: Date; send: (message: LineMessage) => Promise<void>; markSent: () => Promise<void> },
) {
  if (row.sentAt) return;
  // LINE only remembers retry keys for 24 hours. Leave a margin for network delays;
  // never blindly resend an uncertain delivery after that window.
  if (deps.now.getTime() - row.createdAt.getTime() >= 23 * 60 * 60 * 1000) {
    throw new Error("LINE retry window expired; check delivery manually");
  }
  await deps.send(row);
  await deps.markSent();
}
