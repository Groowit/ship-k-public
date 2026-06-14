import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const policyMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260614080050_split_home_curation_read_policies.sql"
);

function getPolicyBlock(sql: string, policyName: string) {
  const match = sql.match(
    new RegExp(`create policy "${policyName}"[\\s\\S]*?;`, "i")
  );

  return match?.[0] ?? "";
}

describe("home curation read policies", () => {
  it("keeps public reads from evaluating the admin helper", () => {
    const sql = readFileSync(policyMigrationPath, "utf8");
    const publicReadPolicy = getPolicyBlock(sql, "home curation public read");
    const adminReadPolicy = getPolicyBlock(sql, "home curation admin read");

    expect(publicReadPolicy).toContain("to anon, authenticated");
    expect(publicReadPolicy).not.toContain("private.is_admin");
    expect(adminReadPolicy).toContain("to authenticated");
    expect(adminReadPolicy).toContain("private.is_admin");
  });
});
