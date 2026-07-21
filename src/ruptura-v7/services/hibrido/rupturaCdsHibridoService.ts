import type { PermissionContext } from "../../../auth-v7/permissionService.ts";
import type { CdsLojaJson } from "../../../hibrido-v7/manifest/manifestTypes.ts";
import type { HybridServiceError } from "../../../hibrido-v7/hybridErrors.ts";
import type { RupturaFiltrosContexto } from "../../types/rupturaFiltrosTypes.ts";
import type { RupturaProdutoCd } from "../../types/rupturaCdTypes.ts";
import { carregarManifest, lojaPathsFromManifest } from "./manifestService.ts";
import { downloadStorageJson } from "./storageJsonService.ts";
import { assertEscopoHibrido, HIBRIDO_BANDEIRA_DEFAULT } from "./hibridoScope.ts";

export async function consultarCdsProdutoHibrido(input: {
  ctx: RupturaFiltrosContexto;
  seqproduto: number;
  authCtx: PermissionContext | null;
  bandeira?: string;
}): Promise<{ dados: RupturaProdutoCd[]; erro: HybridServiceError | null }> {
  const bandeira = input.bandeira ?? HIBRIDO_BANDEIRA_DEFAULT;
  const scopeErr = assertEscopoHibrido(input.authCtx, { ...input.ctx, bandeira });
  if (scopeErr) return { dados: [], erro: scopeErr };

  const { manifest, erro: mErr } = await carregarManifest({
    regional: input.ctx.regional,
    bandeira,
    dataReferencia: input.ctx.dataReferencia,
  });
  if (mErr) return { dados: [], erro: mErr };

  const paths = lojaPathsFromManifest(manifest!, input.ctx.loja);
  if (!paths) return { dados: [], erro: { code: "not_published", message: "CDs não publicados." } };

  const { data, erro } = await downloadStorageJson<CdsLojaJson>(paths.cds);
  if (erro) return { dados: [], erro };

  const prod = data?.produtos.find((p) => p.seqproduto === input.seqproduto);
  if (!prod) return { dados: [], erro: null };

  const dados: RupturaProdutoCd[] = prod.cds.map((cd) => ({
    regional: input.ctx.regional,
    data_referencia: input.ctx.dataReferencia,
    loja: input.ctx.loja,
    seqproduto: input.seqproduto,
    posicao_logica: cd.posicaoLogica,
    codigo_cd_fisico: cd.codigoFisico,
    estoque: cd.estoque,
    pendencia: cd.pendencia,
    status_compra: cd.statusCompra,
    dias_compra: cd.diasCompra,
    dias_recebimento: cd.diasRecebimento,
    flag_centralizacao: cd.flagCentralizacao != null ? cd.flagCentralizacao > 0 : null,
    origem_arquivo: null,
    numero_bloco: null,
    posicao_no_arquivo: null,
    versao: 1,
    versao_ativa: true,
    execucao_id: "hibrido",
  }));

  return { dados, erro: null };
}
