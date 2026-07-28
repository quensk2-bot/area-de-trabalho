import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import {
  HYBRID_NOT_PUBLISHED_MESSAGE,
  type HybridServiceError,
} from "../../../hibrido-v7/hybridErrors.ts";
import type {
  TopPrazosGrupo,
  TopPrazosJson,
} from "../../../hibrido-v7/topPrazosTypes.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import { assertEscopoHibrido } from "./hibridoScope.ts";
import { carregarManifest } from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";

function isGrupo(value: unknown): value is TopPrazosGrupo {
  if (!value || typeof value !== "object") return false;
  const grupo = value as Record<string, unknown>;
  return (
    typeof grupo.regional === "string" &&
    typeof grupo.bandeira === "string" &&
    typeof grupo.competencia === "string" &&
    typeof grupo.loja === "number" &&
    (grupo.setor === null || typeof grupo.setor === "string") &&
    (grupo.secao === null || typeof grupo.secao === "string") &&
    (grupo.fornecedor === null || typeof grupo.fornecedor === "string") &&
    (grupo.statusMovimentacaoLoja === "Sem Movimentação" ||
      grupo.statusMovimentacaoLoja === "Com movimentação") &&
    ["qtdeProdutos", "totalRuptura", "curtoPrazo", "medioPrazo", "longoPrazo"].every(
      (campo) => typeof grupo[campo] === "number",
    )
  );
}

function isTopPrazosJson(value: unknown): value is TopPrazosJson {
  if (!value || typeof value !== "object") return false;
  const arquivo = value as Partial<TopPrazosJson>;
  return (
    !!arquivo.meta &&
    typeof arquivo.meta.regional === "string" &&
    typeof arquivo.meta.bandeira === "string" &&
    typeof arquivo.meta.competencia === "string" &&
    typeof arquivo.meta.dataReferencia === "string" &&
    typeof arquivo.meta.versao === "number" &&
    typeof arquivo.meta.totalGrupos === "number" &&
    !!arquivo.totais &&
    Array.isArray(arquivo.grupos) &&
    arquivo.grupos.length === arquivo.meta.totalGrupos &&
    arquivo.grupos.every(isGrupo)
  );
}

function lojasSelecionadas(ctx: RupturaFiltrosContexto): Set<number> | null {
  if (ctx.lojas?.length) return new Set(ctx.lojas);
  if (ctx.loja && ctx.loja !== 0) return new Set([ctx.loja]);
  return null;
}

export async function carregarTopPrazosHibrido(input: {
  ctx: RupturaFiltrosContexto;
  authCtx: PermissionContext | null;
}): Promise<{ dados: TopPrazosJson | null; erro: HybridServiceError | null }> {
  const scopeErr = assertEscopoHibrido(input.authCtx, input.ctx);
  if (scopeErr) return { dados: null, erro: scopeErr };

  if (!input.ctx.bandeira) {
    return {
      dados: null,
      erro: {
        code: "bandeira_not_published",
        message: "Selecione uma bandeira para visualizar o Top Prazos.",
      },
    };
  }

  const { manifest, erro } = await carregarManifest({
    regional: input.ctx.regional,
    bandeira: input.ctx.bandeira,
    dataReferencia: input.ctx.dataReferencia,
  });
  if (erro || !manifest) return { dados: null, erro };

  if (!manifest.dashboardTopPrazos) {
    return {
      dados: null,
      erro: { code: "not_published", message: HYBRID_NOT_PUBLISHED_MESSAGE },
    };
  }

  const download = await downloadStorageJson<unknown>(manifest.dashboardTopPrazos);
  if (download.erro) return { dados: null, erro: download.erro };
  if (!isTopPrazosJson(download.data)) {
    return {
      dados: null,
      erro: {
        code: "invalid_manifest",
        message: "Artefato dashboard/top-prazos.json malformado ou incompleto.",
      },
    };
  }

  if (
    download.data.meta.regional !== input.ctx.regional ||
    download.data.meta.bandeira !== input.ctx.bandeira
  ) {
    return {
      dados: null,
      erro: {
        code: "invalid_manifest",
        message: "Escopo do Top Prazos diverge do manifesto ativo.",
      },
    };
  }

  const lojas = lojasSelecionadas(input.ctx);
  if (!lojas) return { dados: download.data, erro: null };

  const grupos = download.data.grupos.filter((grupo) => lojas.has(grupo.loja));
  return {
    dados: {
      ...download.data,
      meta: { ...download.data.meta, totalGrupos: grupos.length },
      grupos,
    },
    erro: null,
  };
}
