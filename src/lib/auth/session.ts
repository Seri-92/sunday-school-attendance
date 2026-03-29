import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export async function getSession() {
  const result = await auth.getSession();

  return result.data ?? null;
}

export async function requireSession() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return session;
}
