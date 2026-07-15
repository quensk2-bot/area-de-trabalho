import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MOTOR_TMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp");

export function getMotorTmpDir(): string {
  return MOTOR_TMP_DIR;
}

export function ensureMotorTmpDir(): string {
  if (!fs.existsSync(MOTOR_TMP_DIR)) {
    fs.mkdirSync(MOTOR_TMP_DIR, { recursive: true });
  }
  return MOTOR_TMP_DIR;
}

export function writeJsonlOutput<T>(outputPath: string, itens: T[]): string {
  ensureMotorTmpDir();
  const resolved = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(MOTOR_TMP_DIR, outputPath);

  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines = itens.map((item) => JSON.stringify(item));
  fs.writeFileSync(resolved, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return resolved;
}
