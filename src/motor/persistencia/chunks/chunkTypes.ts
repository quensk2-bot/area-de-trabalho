import type { DmLote } from "../../datamart/dmTypes.ts";

export type ChunkStatusDb = "pendente" | "processando" | "concluido" | "falhou";

export type ChunkPlanejado = {
  numeroChunk: number;
  produtos: DmLote["produtos"];
  cds: DmLote["cds"];
  hashChunk: string;
  tamanhoBytesAprox: number;
};

export type ChunkProgressoEtapa =
  | "preparando_lote"
  | "validando_datamart"
  | "planejando_chunks"
  | "iniciando_execucao"
  | "enviando_chunk"
  | "validando_contagens"
  | "finalizando"
  | "ativando_versao"
  | "concluido"
  | "cancelado"
  | "falhou";

export type ChunkProgresso = {
  etapa: ChunkProgressoEtapa;
  mensagem: string;
  chunkAtual?: number;
  totalChunks?: number;
  produtosProcessados: number;
  cdsProcessados: number;
  produtosTotal: number;
  cdsTotal: number;
  percentual: number;
  duracaoMs: number;
  estimativaRestanteMs?: number;
  erros: string[];
};

export type PersistirLoteChunkedEntrada = {
  lote: DmLote;
  regional: string;
  dataReferencia: string;
  hashPacote: string;
  tamanhoChunk?: number;
  quantidadeArquivos?: number;
  limiteBytesPayload?: number;
};

export type PersistirLoteChunkedResultado =
  | {
      status: "persistida";
      execucaoId: string;
      versao: number;
      totalChunks: number;
      chunksConcluidos: number;
      produtosInseridos: number;
      cdsInseridos: number;
      ativada: true;
      duplicada: false;
      cancelada: false;
      duracaoMs: number;
    }
  | {
      status: "ignorada_duplicada";
      execucaoId: string;
      versao: number;
      totalChunks: 0;
      chunksConcluidos: 0;
      produtosInseridos: 0;
      cdsInseridos: 0;
      ativada: false;
      duplicada: true;
      cancelada: false;
      duracaoMs: number;
    }
  | {
      status: "bloqueada_concorrencia";
      execucaoId: string | null;
      mensagem: string;
      duplicada: false;
      cancelada: false;
      duracaoMs: number;
    }
  | {
      status: "cancelada";
      execucaoId: string;
      cancelada: true;
      duplicada: false;
      duracaoMs: number;
    }
  | {
      status: "falhou";
      execucaoId: string | null;
      mensagem: string;
      duplicada: false;
      cancelada: false;
      duracaoMs: number;
    };

export type ChunkProgressoCallback = (progresso: ChunkProgresso) => void;

export const CHUNK_TAMANHO_PADRAO = 500;
export const CHUNK_LIMITE_BYTES_PADRAO = 4 * 1024 * 1024;
