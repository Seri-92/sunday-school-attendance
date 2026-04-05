import test from "node:test";
import assert from "node:assert/strict";
import {
  canTeacherManageClass,
  getTeacherClassAccessPolicy,
  shouldFilterClassesByAssignment,
} from "./class-access";

test("teachers can manage classes even when they are not explicitly assigned", () => {
  assert.equal(getTeacherClassAccessPolicy("teacher"), "all-classes");
  assert.equal(shouldFilterClassesByAssignment("teacher"), false);
  assert.equal(
    canTeacherManageClass({
      isAssignedToClass: false,
      teacherRole: "teacher",
    }),
    true,
  );
});

test("admins also manage all classes", () => {
  assert.equal(getTeacherClassAccessPolicy("admin"), "all-classes");
  assert.equal(shouldFilterClassesByAssignment("admin"), false);
  assert.equal(
    canTeacherManageClass({
      isAssignedToClass: false,
      teacherRole: "admin",
    }),
    true,
  );
});
