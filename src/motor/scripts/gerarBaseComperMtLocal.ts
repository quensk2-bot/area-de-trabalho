/**
 * ⚠️ DEPRECATED — Use gerarBaseRegional.ts
 *
 * Este arquivo foi mantido apenas para compatibilidade temporária.
 * Execute em vez disso:
 *
 *   npm run motor:gerar-regional -- --regional MT --bandeira COMPER --data-referencia 2026-07-13
 *
 * ⚠️ Este arquivo será removido após validação da versão 4.
 */
import { execSync } from "node:child_process";
console.warn("\n⚠️  [DEPRECATED] Use 'npm run motor:gerar-regional -- --regional MT --bandeira COMPER --data-referencia <DATA>'\n");

const args = process.argv.slice(2).join(" ");
const cmd = `npx tsx src/motor/scripts/gerarBaseRegional.ts --regional MT --bandeira COMPER ${args}`;
execSync(cmd, { stdio: "inherit" });
