import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const teacherRoleValues = ["admin", "teacher"] as const;
export const gradeCodeValues = [
  "kindergarten",
  "elementary_1",
  "elementary_2",
  "elementary_3",
  "elementary_4",
  "elementary_5",
  "elementary_6",
  "junior_high_1",
  "junior_high_2",
  "junior_high_3",
] as const;
export const assignmentTypeValues = ["auto", "manual"] as const;
export const attendanceStatusValues = [
  "present",
  "absent",
] as const;

export type TeacherRole = (typeof teacherRoleValues)[number];
export type GradeCode = (typeof gradeCodeValues)[number];
export type AssignmentType = (typeof assignmentTypeValues)[number];
export type AttendanceStatus = (typeof attendanceStatusValues)[number];

export const teacherRoleEnum = pgEnum("teacher_role", teacherRoleValues);
export const gradeCodeEnum = pgEnum("grade_code", gradeCodeValues);
export const assignmentTypeEnum = pgEnum(
  "assignment_type",
  assignmentTypeValues,
);

export const teachers = pgTable(
  "teachers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: varchar("auth_user_id", { length: 255 }),
    name: varchar("name", { length: 128 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: teacherRoleEnum("role").default("teacher").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("teachers_auth_user_id_key").on(table.authUserId),
    uniqueIndex("teachers_email_key").on(table.email),
  ],
);

export const schoolYears = pgTable(
  "school_years",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: varchar("label", { length: 32 }).notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("school_years_label_key").on(table.label),
    index("school_years_is_active_idx").on(table.isActive),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolYearId: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    gradeCode: gradeCodeEnum("grade_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("classes_school_year_name_key").on(table.schoolYearId, table.name),
    index("classes_school_year_idx").on(table.schoolYearId),
  ],
);

export const classTeacherAssignments = pgTable(
  "class_teacher_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("class_teacher_assignments_class_teacher_key").on(
      table.classId,
      table.teacherId,
    ),
    index("class_teacher_assignments_class_idx").on(table.classId),
    index("class_teacher_assignments_teacher_idx").on(table.teacherId),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lastName: varchar("last_name", { length: 128 }).notNull(),
    firstName: varchar("first_name", { length: 128 }).notNull(),
    lastNameKana: varchar("last_name_kana", { length: 128 }).notNull(),
    firstNameKana: varchar("first_name_kana", { length: 128 }).notNull(),
    currentGradeCode: gradeCodeEnum("current_grade_code").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("students_grade_active_idx").on(table.currentGradeCode, table.active)],
);

export const studentClassAssignments = pgTable(
  "student_class_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    schoolYearId: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    gradeCode: gradeCodeEnum("grade_code").notNull(),
    assignmentType: assignmentTypeEnum("assignment_type")
      .default("auto")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("student_class_assignments_student_school_year_key").on(
      table.studentId,
      table.schoolYearId,
    ),
    index("student_class_assignments_class_idx").on(table.classId),
  ],
);

export const attendanceDates = pgTable(
  "attendance_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolYearId: uuid("school_year_id")
      .notNull()
      .references(() => schoolYears.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_dates_school_year_date_key").on(
      table.schoolYearId,
      table.date,
    ),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attendanceDateId: uuid("attendance_date_id")
      .notNull()
      .references(() => attendanceDates.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_records_date_student_key").on(
      table.attendanceDateId,
      table.studentId,
    ),
    index("attendance_records_student_idx").on(table.studentId),
  ],
);
