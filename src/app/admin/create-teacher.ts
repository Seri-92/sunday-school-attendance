import { sql } from "drizzle-orm";
import { teachers, type TeacherRole } from "@/db/schema";
import { ensureClerkUser } from "@/lib/auth/clerk-users";

export type CreateTeacherInput = {
  active: boolean;
  email: string;
  name: string;
  role: TeacherRole;
};

type ExistingTeacher = {
  email: string;
  id: string;
  name: string;
};

type TeacherStore = {
  findByEmail(email: string): Promise<ExistingTeacher | null>;
  insert(input: CreateTeacherInput & { authUserId: string }): Promise<void>;
};

async function createTeacherStore(): Promise<TeacherStore> {
  const { db } = await import("@/db");

  return {
    async findByEmail(email: string) {
      const [teacher] = await db
        .select({
          email: teachers.email,
          id: teachers.id,
          name: teachers.name,
        })
        .from(teachers)
        .where(sql`lower(${teachers.email}) = ${email}`)
        .limit(1);

      return teacher ?? null;
    },
    async insert(teacher) {
      await db.insert(teachers).values(teacher);
    },
  };
}

export function buildDuplicateTeacherMessage(teacher: ExistingTeacher) {
  return `${teacher.email} はすでに ${teacher.name} として登録されています。`;
}

export async function registerTeacher(
  input: CreateTeacherInput,
  deps: {
    ensureClerkUserId?: (email: string) => Promise<string>;
    store?: TeacherStore;
  } = {},
) {
  const ensureClerkUserId = deps.ensureClerkUserId ?? ((email: string) => ensureClerkUser({ email }));
  const store = deps.store ?? (await createTeacherStore());

  const existingTeacher = await store.findByEmail(input.email);

  if (existingTeacher) {
    return {
      error: buildDuplicateTeacherMessage(existingTeacher),
      ok: false as const,
    };
  }

  const authUserId = await ensureClerkUserId(input.email);

  await store.insert({
    ...input,
    authUserId,
  });

  return {
    ok: true as const,
  };
}
