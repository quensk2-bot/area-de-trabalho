import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_DRIVE_PRIVATE_KEY",
  "GOOGLE_DRIVE_CREDENTIALS_JSON",
  "BEGIN PRIVATE KEY",
];

const RUNTIME_DIRS = ["src/lib", "src/auth-v7", "src/components", "src/ruptura-v7", "src/hibrido-v7"];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "tests" || entry === "scripts") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("auth-v7 — segurança de build (runtime frontend)", () => {
  it("17. nenhum segredo proibido em código runtime híbrido", () => {
    const root = dirname(fileURLToPath(new URL("../../..", import.meta.url)));
    const hits: string[] = [];

    for (const rel of RUNTIME_DIRS) {
      const dir = join(root, rel);
      try {
        for (const file of walk(dir)) {
          const content = readFileSync(file, "utf8");
          for (const token of FORBIDDEN) {
            if (content.includes(token)) hits.push(`${file}: ${token}`);
          }
          if (content.includes("lghcztadxobrotyoqpbq") && content.includes("createClient")) {
            hits.push(`${file}: projeto antigo em runtime`);
          }
        }
      } catch {
        // dir opcional
      }
    }

    assert.deepEqual(hits, [], `Segredos/refs proibidos: ${hits.join("; ")}`);
  });

  it("20. auth-v7 não referencia service_role key", () => {
    const authDir = dirname(fileURLToPath(new URL("..", import.meta.url)));
    const files: string[] = [];
    for (const entry of readdirSync(authDir)) {
      if (entry === "tests") continue;
      const full = join(authDir, entry);
      const st = statSync(full);
      if (st.isFile() && /\.(tsx?)$/.test(entry)) files.push(full);
    }
    const hits = files.filter((f) => readFileSync(f, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"));
    assert.deepEqual(hits, []);
  });
});
