import fs from "node:fs";
import path from "node:path";
import { diretorioPacoteWorker } from "../drive/worker/workerPaths.ts";

export type MotorPacoteHeartbeat = {
  pacoteId: string;
  fase: string;
  atualizadoEm: string;
  decorridoMs: number;
  produtosProcessados?: number;
  cdsProcessados?: number;
  chunkAtual?: number;
  totalChunks?: number;
  percentual?: number;
  memoria: {
    heapUsedMb: number;
    rssMb: number;
    externalMb: number;
  };
  mensagem?: string;
};

export function registrarHeartbeat(input: Omit<MotorPacoteHeartbeat, "memoria" | "atualizadoEm"> & { memoria?: MotorPacoteHeartbeat["memoria"] }): MotorPacoteHeartbeat {
  const mem = process.memoryUsage();
  const hb: MotorPacoteHeartbeat = {
    ...input,
    atualizadoEm: new Date().toISOString(),
    memoria: input.memoria ?? {
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      externalMb: Math.round((mem.external / 1024 / 1024) * 10) / 10,
    },
  };

  const dir = diretorioPacoteWorker(input.pacoteId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const caminho = path.join(dir, "heartbeat.json");
  fs.writeFileSync(caminho, JSON.stringify(hb, null, 2), "utf8");

  const parts = [
    `[heartbeat] ${input.fase}`,
    hb.memoria.rssMb != null ? `rss=${hb.memoria.rssMb}MB` : "",
    input.produtosProcessados != null ? `prod=${input.produtosProcessados}` : "",
    input.chunkAtual != null ? `chunk=${input.chunkAtual}/${input.totalChunks ?? "?"}` : "",
    input.mensagem ?? "",
  ].filter(Boolean);
  console.log(parts.join(" | "));

  return hb;
}
