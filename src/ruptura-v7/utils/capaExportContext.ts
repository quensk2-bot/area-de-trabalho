import { formatCompradoresSelecionadosLabel } from "../services/compradoresFiltroUtils.ts";
import { formatLojasSelecionadasLabel, todasLojasSelecionadas } from "../services/lojasFiltroUtils.ts";
import type { RupturaFiltrosContexto } from "../types/rupturaFiltrosTypes.ts";
import type { CapaDashboardVariant, CapaExportContext } from "./exportCapaDashboard.ts";

export type CapaExportContextProps = Omit<CapaExportContext, "variant" | "dataReferencia">;

/** Alinha export à mesma semântica dos filtros (vazio = todos no escopo). */
export function montarCapaExportContext(input: {
  ctx: Pick<RupturaFiltrosContexto, "regional" | "bandeira" | "lojas" | "compradores">;
  variant: CapaDashboardVariant;
  dataReferencia: string;
  totalLojasEscopo: number;
  totalCompradoresEscopo?: number;
}): CapaExportContext {
  const todasLojas = todasLojasSelecionadas(input.ctx.lojas, input.totalLojasEscopo);
  const totalComp = input.totalCompradoresEscopo ?? 0;
  const selComp = input.ctx.compradores?.length ?? 0;
  const todosCompradores =
    input.variant !== "comprador" || totalComp === 0 || selComp === 0 || selComp >= totalComp;

  const lojasLista = todasLojas ? [] : [...input.ctx.lojas];
  const compradoresLista = todosCompradores ? [] : [...(input.ctx.compradores ?? [])];

  return {
    regional: input.ctx.regional,
    bandeira: input.ctx.bandeira,
    dataReferencia: input.dataReferencia,
    variant: input.variant,
    lojas: lojasLista,
    compradores: input.variant === "comprador" ? compradoresLista : undefined,
    todasLojas,
    todosCompradores: input.variant === "comprador" ? todosCompradores : undefined,
    rotuloLojas: formatLojasSelecionadasLabel(todasLojas ? [] : input.ctx.lojas, input.totalLojasEscopo),
    rotuloCompradores:
      input.variant === "comprador"
        ? formatCompradoresSelecionadosLabel(todosCompradores ? [] : (input.ctx.compradores ?? []), totalComp)
        : undefined,
  };
}

export function montarCapaExportContextProps(
  input: Parameters<typeof montarCapaExportContext>[0],
): CapaExportContextProps {
  const { variant, dataReferencia, ...props } = montarCapaExportContext(input);
  void variant;
  void dataReferencia;
  return props;
}

export function escopoCapaRestrito(
  ctx?: Pick<CapaExportContext, "lojas" | "compradores" | "todasLojas" | "todosCompradores">,
): boolean {
  if (!ctx) return false;
  const lojaRestrita =
    ctx.todasLojas === false || (ctx.todasLojas !== true && (ctx.lojas?.length ?? 0) > 0);
  const compRestrita =
    ctx.todosCompradores === false ||
    (ctx.todosCompradores !== true && (ctx.compradores?.length ?? 0) > 0);
  return lojaRestrita || compRestrita;
}
