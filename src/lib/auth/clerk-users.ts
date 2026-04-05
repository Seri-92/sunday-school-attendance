import { clerkClient } from "@clerk/nextjs/server";

type ClerkUserLike = {
  id: string;
};

type ClerkUserListLike =
  | ClerkUserLike[]
  | {
      data?: ClerkUserLike[];
    };

type ClerkUsersApiLike = {
  createUser(params: { emailAddress: string[] }): Promise<ClerkUserLike>;
  getUserList(params: {
    emailAddress: string[];
    limit: number;
  }): Promise<ClerkUserListLike>;
};

function getFirstUser(result: ClerkUserListLike): ClerkUserLike | null {
  if (Array.isArray(result)) {
    return result[0] ?? null;
  }

  return result.data?.[0] ?? null;
}

export async function ensureClerkUser(params: {
  email: string;
  users?: ClerkUsersApiLike;
}) {
  const users = params.users ?? (await clerkClient()).users;
  const existingUsers = await users.getUserList({
    emailAddress: [params.email],
    limit: 1,
  });
  const existingUser = getFirstUser(existingUsers);

  if (existingUser) {
    return existingUser.id;
  }

  const createdUser = await users.createUser({
    emailAddress: [params.email],
  });

  return createdUser.id;
}
