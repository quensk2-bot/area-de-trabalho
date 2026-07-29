/**
 * ⚠️ DEPRECATED — Use publicarPacoteRegional.ts
 *
 * Este arquivo foi mantido apenas para compatibilidade temporária.
 * Execute em vez disso:
 *
 *   npm run motor:publicar-regional -- --regional MT --bandeira COMPER --versao 4 --data-referencia 2026-07-13
 *
 * Ou use o alias temporário:
 *
 *   npm run motor:publicar-comper-mt -- --versao 4 --data-referencia 2026-07-13
 *
 * ⚠️ Este arquivo será removido após validação da versão 4.
 */
import "dotenv/config";
console.warn("\n⚠️  [DEPRECATED] Use 'npm run motor:publicar-regional -- --regional MT --bandeira COMPER --versao <N>'\n");

// Redireciona para o novo script com parâmetros COMPER MT
const { execSync } = await import("node:child_process");
const args = process.argv.slice(2).join(" ");
const cmd = `npx tsx src/motor/scripts/publicarPacoteRegional.ts --regional MT --bandeira COMPER ${args}`;
execSync(cmd, { stdio: "inherit" });
