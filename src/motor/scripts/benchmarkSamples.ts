import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { executarMotorParse } from "../services/motorParseService.ts";

const SAMPLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/samples");
const RUPTURA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../importar/RUPTURA");

type SampleConfig = {
  nome: string;
  origem: string;
  tipo: "grupo_ruptura_1" | "grupo_cds_2" | "inventario_lojas";
  linhas: number;
};

const AMOSTRAS: SampleConfig[] = [
  { nome: "grupo1_100.txt", origem: "1º Grupo de Ruptura.txt", tipo: "grupo_ruptura_1", linhas: 100 },
  { nome: "grupo1_1000.txt", origem: "1º Grupo de Ruptura.txt", tipo: "grupo_ruptura_1", linhas: 1000 },
  { nome: "grupo1_10000.txt", origem: "1º Grupo de Ruptura.txt", tipo: "grupo_ruptura_1", linhas: 10000 },
  { nome: "grupo2_100.txt", origem: "2º Grupo de Ruptura.txt", tipo: "grupo_cds_2", linhas: 100 },
  { nome: "grupo2_1000.txt", origem: "2º Grupo de Ruptura.txt", tipo: "grupo_cds_2", linhas: 1000 },
  { nome: "grupo2_10000.txt", origem: "2º Grupo de Ruptura.txt", tipo: "grupo_cds_2", linhas: 10000 },
  { nome: "inventario_100.txt", origem: "Inventário Lojas.txt", tipo: "inventario_lojas", linhas: 100 },
  { nome: "inventario_1000.txt", origem: "Inventário Lojas.txt", tipo: "inventario_lojas", linhas: 1000 },
];

function extrairAmostra(origem: string, destino: string, linhasDados: number): void {
  const origemPath = path.join(RUPTURA_DIR, origem);
  if (!fs.existsSync(origemPath)) {
    console.warn(`[amostra] origem ausente: ${origemPath}`);
    return;
  }

  const conteudo = fs.readFileSync(origemPath);
  let inicio = 0;
  let quebras = 0;
  const alvo = linhasDados + 1;

  while (inicio < conteudo.length && quebras < alvo) {
    const lf = conteudo.indexOf(0x0a, inicio);
    if (lf === -1) break;
    inicio = lf + 1;
    quebras++;
  }

  if (quebras < alvo) {
    fs.writeFileSync(destino, conteudo);
    return;
  }

  fs.writeFileSync(destino, conteudo.subarray(0, inicio));
}

async function medirAmostra(arquivo: string, tipo: SampleConfig["tipo"], limite: number) {
  const memAntes = process.memoryUsage().heapUsed;
  const inicio = Date.now();

  const resultado = await executarMotorParse({
    caminho: arquivo,
    tipo,
    regional: "NORDESTE",
    dataReferencia: "2026-07-15",
    limiteLinhas: limite,
    dryRun: true,
  });

  const duracaoMs = Date.now() - inicio;
  const memDepois = process.memoryUsage().heapUsed;

  return {
    arquivo: path.basename(arquivo),
    tipo,
    limite,
    duracaoMs,
    memInicialMb: Math.round(memAntes / 1024 / 1024),
    memPicoMb: Math.round(memDepois / 1024 / 1024),
    memVariacaoMb: Math.round((memDepois - memAntes) / 1024 / 1024),
    linhasLidas: resultado.metricas.linhasLidas,
    linhasValidas: resultado.metricas.linhasValidas,
    linhasInvalidas: resultado.metricas.linhasInvalidas,
    linhasPorSegundo: duracaoMs > 0 ? Math.round((resultado.metricas.linhasLidas / duracaoMs) * 1000) : 0,
    itens: resultado.itens.length,
    erros: resultado.erros.length,
    alertas: resultado.alertas.length,
  };
}

async function main(): Promise<void> {
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  }

  console.log("=== Extração de amostras ===");
  for (const cfg of AMOSTRAS) {
    const destino = path.join(SAMPLES_DIR, cfg.nome);
    extrairAmostra(cfg.origem, destino, cfg.linhas);
    if (fs.existsSync(destino)) {
      const bytes = fs.statSync(destino).size;
      console.log(`  ${cfg.nome}: ${bytes} bytes`);
    }
  }

  console.log("\n=== Métricas de processamento ===");
  const metricas = [];
  for (const cfg of AMOSTRAS) {
    const arquivo = path.join(SAMPLES_DIR, cfg.nome);
    if (!fs.existsSync(arquivo)) continue;
    const m = await medirAmostra(arquivo, cfg.tipo, cfg.linhas);
    metricas.push(m);
    console.log(JSON.stringify(m));
  }

  fs.writeFileSync(path.join(SAMPLES_DIR, "metricas.json"), JSON.stringify(metricas, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
