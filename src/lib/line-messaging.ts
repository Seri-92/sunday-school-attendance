import "server-only";

import { createHash } from "node:crypto";

const linePushMessageEndpoint = "https://api.line.me/v2/bot/message/push";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

export function createLineRetryKey(seed: string) {
  const hash = createHash("sha256").update(seed).digest("hex");

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${
    Number.parseInt(hash.slice(16, 17), 16) % 4 + 8
  }${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function sendAttendanceReminder(date: string) {
  const response = await fetch(linePushMessageEndpoint, {
    body: JSON.stringify({
      messages: [
        {
          text: "出席を入力してください",
          type: "text",
        },
      ],
      to: getRequiredEnv("LINE_ATTENDANCE_GROUP_ID"),
    }),
    headers: {
      Authorization: `Bearer ${getRequiredEnv("LINE_CHANNEL_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": createLineRetryKey(`attendance-reminder:${date}`),
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`LINE メッセージの送信に失敗しました（${response.status}）。`);
  }
}
