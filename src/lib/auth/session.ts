import "server-only";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

type AppSession = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
};

function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  return (
    user.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    ) ?? user.emailAddresses[0] ?? null
  );
}

export async function getSession() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const primaryEmail = getPrimaryEmail(user);

  if (!user || !primaryEmail) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: primaryEmail.emailAddress,
      emailVerified: primaryEmail.verification?.status === "verified",
    },
  } satisfies AppSession;
}

export async function requireSession() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return session;
}
