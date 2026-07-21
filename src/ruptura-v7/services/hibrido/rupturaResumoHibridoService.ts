import type {
  RupturaDashboardFornecedor,
  RupturaDashboardLoja,
  RupturaDashboardSetor,
  RupturaCdEstoqueAgregado,
} from "../../types/rupturaDashboardTypes.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { ResumoLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import { carregarManifest, lojaPathsFromManifest } from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";
import { mapResumoToDashboard } from "./mapResumoDashboard.ts";

export { mapResumoToDashboard } from "./mapResumoDashboard.ts";

async function loadResumo(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  bandeira = HIBRIDO_BANDEIRA_DEFAULT,
): Promise<{ resumo: ResumoLojaJson | null; erro: HybridServiceError | null; versao?: number }> {
  const scopeErr = assertEscopoHibrido(authCtx, { ...ctx, bandeira });
  if (scopeErr) return { resumo: null, erro: scopeErr };

  const { manifest, erro: mErr } = await carregarManifest({
    regional: ctx.regional,
    bandeira,
    dataReferencia: ctx.dataReferencia,
  });
  if (mErr) return { resumo: null, erro: mErr };

  const paths = lojaPathsFromManifest(manifest!, ctx.loja);
  if (!paths) return { resumo: null, erro: { code: "not_published", message: "Loja não publicada no manifest." } };

  const { data, erro } = await downloadStorageJson<ResumoLojaJson>(paths.resumo);
  return { resumo: data, erro, versao: manifest!.versao };
}

export async function consultarDashboardLojaHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dado: RupturaDashboardLoja | null; erro: HybridServiceError | null }> {
  const { resumo, erro } = await loadResumo(ctx, authCtx);
  if (erro) return { dado: null, erro };
  return { dado: resumo ? mapResumoToDashboard(resumo) : null, erro: null };
}

export async function consultarDashboardSetoresHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dados: RupturaDashboardSetor[]; erro: HybridServiceError | null }> {
  const { resumo, erro } = await loadResumo(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const dados: RupturaDashboardSetor[] = (resumo?.setores ?? []).map((s) => ({
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: ctx.loja,
    divisao: null,
    setor_n2: s.setor,
    total_produtos: 0,
    total_ruptura: s.totalRuptura,
    curto_prazo: 0,
    medio_prazo: 0,
    longo_prazo: 0,
    bloqueados: 0,
    total_base_limpa_elegivel: 0,
    percentual_ruptura: null,
  }));
  return { dados, erro: null };
}

export async function consultarDashboardFornecedoresHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  limite = 10,
): Promise<{ dados: RupturaDashboardFornecedor[]; erro: HybridServiceError | null }> {
  const { resumo, erro } = await loadResumo(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const dados: RupturaDashboardFornecedor[] = (resumo?.fornecedores ?? []).slice(0, limite).map((f) => ({
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja: ctx.loja,
    cod_fornecedor: null,
    razao_fornecedor: f.fornecedor,
    rede: null,
    comprador: f.comprador,
    total_produtos: 0,
    total_ruptura: f.totalRuptura,
    curto_prazo: 0,
    medio_prazo: 0,
    longo_prazo: 0,
    total_com_pendencia: 0,
    total_sem_estoque_cd: 0,
    total_base_limpa_elegivel: 0,
    percentual_ruptura: null,
  }));
  return { dados, erro: null };
}

export async function consultarCompradoresTopHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
  limite = 10,
): Promise<{ dados: { comprador: string; total_ruptura: number }[]; erro: HybridServiceError | null }> {
  const { resumo, erro } = await loadResumo(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const dados = (resumo?.compradores ?? []).slice(0, limite).map((c) => ({
    comprador: c.comprador,
    total_ruptura: c.totalRuptura,
  }));
  return { dados, erro: null };
}

export async function consultarEstoquePorCdHibrido(
  ctx: RupturaFiltrosContexto,
  authCtx: PermissionContext | null,
): Promise<{ dados: RupturaCdEstoqueAgregado[]; erro: HybridServiceError | null }> {
  const { resumo, erro } = await loadResumo(ctx, authCtx);
  if (erro) return { dados: [], erro };
  const dados: RupturaCdEstoqueAgregado[] = (resumo?.estoquePorCd ?? []).map((c) => ({
    codigo_cd_fisico: c.codigoFisico,
    posicao_logica: c.posicaoLogica,
    total_estoque: c.totalEstoque,
    total_produtos: 0,
  }));
  return { dados, erro: null };
}

export async function consultarExecucaoAtivaHibrido(
  ctx: Pick<RupturaFiltrosContexto, "regional" | "dataReferencia">,
  authCtx: PermissionContext | null,
): Promise<{ dado: { versao?: number; finalizado_em?: string | null } | null; erro: HybridServiceError | null }> {
  const { resumo, erro, versao } = await loadResumo(
    { ...ctx, loja: 73 },
    authCtx,
  );
  if (erro && erro.code === "not_published") return { dado: null, erro };
  if (erro) return { dado: null, erro };
  return {
    dado: { versao, finalizado_em: resumo?.atualizadoEm ?? null },
    erro: null,
  };
}