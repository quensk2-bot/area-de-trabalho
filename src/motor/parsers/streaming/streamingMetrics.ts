import type { MemoriaAproximadaRelatorio, MemoriaAproximadaSnapshot } from "./streamingTypes.ts";

function mb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

export function snapshotMemoria(): MemoriaAproximadaSnapshot {
  const u = process.memoryUsage();
  return {
    heapUsedMb: mb(u.heapUsed),
    rssMb: mb(u.rss),
    externalMb: mb(u.external),
  };
}

export class ColetorMemoriaAproximada {
  private inicial: MemoriaAproximadaSnapshot;
  private picoHeap = 0;
  private picoRss = 0;
  private picoExternal = 0;

  constructor() {
    this.inicial = snapshotMemoria();
    this.registrarPico(this.inicial);
  }

  amostrar(): void {
    this.registrarPico(snapshotMemoria());
  }

  private registrarPico(s: MemoriaAproximadaSnapshot): void {
    if (s.heapUsedMb > this.picoHeap) this.picoHeap = s.heapUsedMb;
    if (s.rssMb > this.picoRss) this.picoRss = s.rssMb;
    if (s.externalMb > this.picoExternal) this.picoExternal = s.externalMb;
  }

  finalizar(): MemoriaAproximadaRelatorio {
    const final = snapshotMemoria();
    this.registrarPico(final);
    return {
      heapUsedMbInicial: this.inicial.heapUsedMb,
      heapUsedMbFinal: final.heapUsedMb,
      heapUsedMbPicoAprox: this.picoHeap,
      rssMbInicial: this.inicial.rssMb,
      rssMbFinal: final.rssMb,
      rssMbPicoAprox: this.picoRss,
      externalMbInicial: this.inicial.externalMb,
      externalMbFinal: final.externalMb,
      externalMbPicoAprox: this.picoExternal,
      nota: "pico aproximado — heapUsed/rss/external não representam pico exato do SO",
    };
  }
}

export class ColetorErrosLimitado<T extends { codigoErro?: string }> {
  readonly maxErrosEmMemoria: number;
  readonly erros: T[] = [];
  totalErros = 0;
  errosTruncados = false;

  constructor(maxErrosEmMemoria: number) {
    this.maxErrosEmMemoria = maxErrosEmMemoria;
  }

  push(erro: T): void {
    this.totalErros += 1;
    if (this.erros.length < this.maxErrosEmMemoria) {
      this.erros.push(erro);
    } else {
      this.errosTruncados = true;
    }
  }

  pushMany(lista: T[]): void {
    for (const e of lista) this.push(e);
  }
}
