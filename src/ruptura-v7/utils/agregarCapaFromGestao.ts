import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { filtrarUniversoOficialCompativel } from "../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";
import { calcAtivacaoRuptura30SemPedido } from "../../motor/export/hibrido/calcCapaCamposPq.ts";
import type { MotorProdutoLojaConsolidado } from "../../motor/consolidar/consolidacaoTypes.ts";
import { DIVISOES_DASHBOARD, resolverDivisaoProduto, type DivisaoDashboard } from "../constants/dashboardDivisoes.ts";
import { ordenarSetoresDashboard } from "./derivarDivisoesDashboard.ts";
import { chaveComprador, SEM_COMPRADOR } from "../services/compradoresFiltroUtils.ts";

export type RupturaCapaLinha = {
  nome: string;
  nivel: "divisao" | "setor" | "loja" | "comprador" | "fornecedor";
  divisao: DivisaoDashboard | null;
  total_skus: number;
  total_ruptura: number;
  pct_ruptura: number | null;
  total_curto_prazo: number;
  itens_cross: number;
  havia_estoque_cd: number;
  rebto_proximo: number;
  media_dias_recebimento_cd: number | null;
  pct_curto_prazo: number | null;
  total_medio_prazo: number;
  pedido_maior_30: number;
  pedido_maior_60: number;
  media_dias_pedido: number | null;
  pct_medio_prazo: number | null;
  total_longo_prazo: number;
  ruptura_30_dias_sem_pedido: number;
  media_dias_ultimo_pedido: number | null;
  pct_longo_prazo: number | null;
  itens_ruptura_via_inventario: number;
  pct_impacto_inventario: number | null;
  pct_ruptura_sem_inventario: number | null;
  itens_vda_pendencia: number;
  pct_rup_sem_pendencia_vda: number | null;
};

type AggCapa = {
  total_skus: number;
  total_ruptura: number;
  total_curto_prazo: number;
  itens_cross: number;
  havia_estoque_cd: number;
  rebto_proximo: number;
  soma_dias_recebimento: number;
  total_medio_prazo: number;
  /** Soma de diasPedido apenas dos produtos MP (denominador = total_medio_prazo). */
  soma_dias_pedido_mp: number;
  pedido_maior_30: number;
  pedido_maior_60: number;
  soma_dias_pedido: number;
  total_longo_prazo: number;
  ruptura_30_dias_sem_pedido: number;
  /** Soma de diasUltimoPedidoLojaDashboard (> 0 apenas). */
  soma_dias_ultimo_pedido_dashboard: number;
  /** Count de diasUltimoPedidoLojaDashboard (> 0 apenas). */
  count_dias_ultimo_pedido_dashboard: number;
  itens_ruptura_via_inventario: number;
  soma_rup_inventario_pct: number;
  soma_rup_sem_inventario_pct: number;
  itens_vda_pendencia: number;
  soma_rup_sem_pendencia_vda: number;
};

function pct(n: number, d: number): number | null {
  if (!d) return null;
  return Math.round((n / d) * 10000) / 100;
}

function mediaPivot(soma: number, totalSkus: number): number | null {
  if (!totalSkus) return null;
  return Math.round((soma / totalSkus) * 100) / 100;
}

function mediaFlagPct(soma: number, totalSkus: number): number | null {
  const m = mediaPivot(soma, totalSkus);
  if (m == null) return null;
  return Math.round(m * 10000) / 100;
}

function emptyAgg(): AggCapa {
  return {
    total_skus: 0,
    total_ruptura: 0,
    total_curto_prazo: 0,
    itens_cross: 0,
    havia_estoque_cd: 0,
    rebto_proximo: 0,
    soma_dias_recebimento: 0,
    total_medio_prazo: 0,
    soma_dias_pedido_mp: 0,
    pedido_maior_30: 0,
    pedido_maior_60: 0,
    soma_dias_pedido: 0,
    total_longo_prazo: 0,
    ruptura_30_dias_sem_pedido: 0,
    soma_dias_ultimo_pedido_dashboard: 0,
    count_dias_ultimo_pedido_dashboard: 0,
    itens_ruptura_via_inventario: 0,
    soma_rup_inventario_pct: 0,
    soma_rup_sem_inventario_pct: 0,
    itens_vda_pendencia: 0,
    soma_rup_sem_pendencia_vda: 0,
  };
}

function isCurtoPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "curto_prazo" || p.curtoPrazo === 1;
}

function isMedioPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "medio_prazo" || p.medioPrazo === 1;
}

function isLongoPrazo(p: HibridoProdutoGestao): boolean {
  return p.classificacaoPrazo === "longo_prazo" || p.longoPrazo === 1;
}

function isRebtoProximo(p: HibridoProdutoGestao): boolean {
  return /^Recebimento Pr[oó]ximo/i.test(p.acaoCurtoPrazo ?? "");
}

function isHaviaEstoqueCd(p: HibridoProdutoGestao): boolean {
  return /^Havia estoque no CD/i.test(p.acaoCurtoPrazo ?? "");
}

function isAvaliarPedido(p: HibridoProdutoGestao): boolean {
  if (!isMedioPrazo(p)) return false;
  const dias = p.diasPedido;
  if (dias != null && dias >= 30 && dias < 60) return true;
  return /Pedido dentre 30/i.test(p.acaoMedioPrazo ?? "");
}

function isPendenciaIndevida(p: HibridoProdutoGestao): boolean {
  if (!isMedioPrazo(p)) return false;
  const dias = p.diasPedido;
  if (dias != null && dias > 59) return true;
  return /Superior há 60/i.test(p.acaoMedioPrazo ?? "");
}

function classificacaoEmRuptura(p: HibridoProdutoGestao): boolean {
  return isCurtoPrazo(p) || isMedioPrazo(p) || isLongoPrazo(p);
}

function isRupturaViaInventario(p: HibridoProdutoGestao): boolean {
  if (p.rupturaComInventario === 1) return true;
  return p.ruptura104c === true && Number(p.inventarioUnid ?? 0) > 0;
}

function flagAtivacao30(p: HibridoProdutoGestao): number {
  if (p.ativacaoRuptura30SemPedido != null) return p.ativacaoRuptura30SemPedido;
  const stub: Pick<
    MotorProdutoLojaConsolidado,
    | "longoPrazo"
    | "diasRuptura"
    | "pendenciaLoja"
    | "pendenciaCpaCd"
    | "statusSolicitacaoAtivacaoCd"
  > = {
    longoPrazo: p.longoPrazo,
    diasRuptura: p.diasRuptura,
    pendenciaLoja: p.pendenciaLoja,
    pendenciaCpaCd: p.pendenciaCpaCd,
    statusSolicitacaoAtivacaoCd: p.statusSolicitacaoAtivacaoCd,
  };
  return calcAtivacaoRuptura30SemPedido(stub as MotorProdutoLojaConsolidado);
}

function flagRupSemPendencia(p: HibridoProdutoGestao): number {
  if (p.rupSemPendenciaVda != null) return p.rupSemPendenciaVda;
  if (!classificacaoEmRuptura(p)) return 0;
  return (p.itensVdaPendencia ?? 0) === 1 ? 0 : 1;
}

function flagRupSemInventarioPct(p: HibridoProdutoGestao): number {
  if (p.rupSemInventarioPct != null) return p.rupSemInventarioPct;
  if (p.rupturaSemInventario === 1) return 1;
  if (p.rupturaSemInventario === 0) return 0;
  return p.ruptura104c === true && !(Number(p.inventarioUnid ?? 0) > 0) ? 1 : 0;
}

function acumularProduto(agg: AggCapa, p: HibridoProdutoGestao): void {
  if (p.baseLimpa === "Base Limpa") {
    agg.total_skus += 1;
    agg.soma_dias_recebimento += p.rupDiasRecebtoMaiorData ?? 0;
    agg.soma_dias_pedido += p.diasPedido ?? 0;
    if (isMedioPrazo(p)) {
      agg.soma_dias_pedido_mp += p.diasPedido ?? 0;
    }
    // Média do Dashboard Loja: usa diasUltimoPedidoLojaDashboard (raw ULTIMACPALOJA)
    // Apenas valores > 0 entram na soma e contagem
    const dashVal = p.diasUltimoPedidoLojaDashboard;
    if (dashVal != null && dashVal > 0 && dashVal < 999) {
      agg.soma_dias_ultimo_pedido_dashboard += dashVal;
      agg.count_dias_ultimo_pedido_dashboard += 1;
    }
    agg.soma_rup_inventario_pct += p.rupInventarioPct ?? (isRupturaViaInventario(p) ? 1 : 0);
    agg.soma_rup_sem_inventario_pct += flagRupSemInventarioPct(p);
    agg.soma_rup_sem_pendencia_vda += flagRupSemPendencia(p);
  }

  if (isRupturaViaInventario(p)) agg.itens_ruptura_via_inventario += 1;
  agg.itens_vda_pendencia += p.itensVdaPendencia ?? 0;
  agg.ruptura_30_dias_sem_pedido += flagAtivacao30(p);

  if (!classificacaoEmRuptura(p)) return;

  agg.total_ruptura += 1;

  if (isCurtoPrazo(p)) {
    agg.total_curto_prazo += 1;
    if (p.crossDocking === 1) agg.itens_cross += 1;
    if (isRebtoProximo(p)) agg.rebto_proximo += 1;
    if (isHaviaEstoqueCd(p)) agg.havia_estoque_cd += 1;
    return;
  }

  if (isMedioPrazo(p)) {
    agg.total_medio_prazo += 1;
    if (isAvaliarPedido(p)) agg.pedido_maior_30 += 1;
    if (isPendenciaIndevida(p)) agg.pedido_maior_60 += 1;
    return;
  }

  if (isLongoPrazo(p)) agg.total_longo_prazo += 1;
}

function aggParaLinha(
  nome: string,
  nivel: "divisao" | "setor" | "loja" | "comprador" | "fornecedor",
  divisao: DivisaoDashboard | null,
  v: AggCapa,
): RupturaCapaLinha {
  const skus = v.total_skus;
  return {
    nome,
    nivel,
    divisao,
    total_skus: skus,
    total_ruptura: v.total_ruptura,
    pct_ruptura: pct(v.total_ruptura, skus),
    total_curto_prazo: v.total_curto_prazo,
    itens_cross: v.itens_cross,
    havia_estoque_cd: v.havia_estoque_cd,
    rebto_proximo: v.rebto_proximo,
    media_dias_recebimento_cd: mediaPivot(v.soma_dias_recebimento, skus),
    pct_curto_prazo: pct(v.total_curto_prazo, v.total_ruptura),
    total_medio_prazo: v.total_medio_prazo,
    pedido_maior_30: v.pedido_maior_30,
    pedido_maior_60: v.pedido_maior_60,
    media_dias_pedido:
      v.total_medio_prazo > 0
        ? Math.round((v.soma_dias_pedido_mp / v.total_medio_prazo) * 100) / 100
        : null,
    pct_medio_prazo: pct(v.total_medio_prazo, v.total_ruptura),
    total_longo_prazo: v.total_longo_prazo,
    ruptura_30_dias_sem_pedido: v.ruptura_30_dias_sem_pedido,
    // Média do Dashboard Loja: soma / count (excluindo 0, null, 999)
    media_dias_ultimo_pedido:
      v.count_dias_ultimo_pedido_dashboard > 0
        ? Math.round((v.soma_dias_ultimo_pedido_dashboard / v.count_dias_ultimo_pedido_dashboard) * 100) / 100
        : null,
    pct_longo_prazo: pct(v.total_longo_prazo, v.total_ruptura),
    itens_ruptura_via_inventario: v.itens_ruptura_via_inventario,
    pct_impacto_inventario: mediaFlagPct(v.soma_rup_inventario_pct, skus),
    pct_ruptura_sem_inventario: mediaFlagPct(v.soma_rup_sem_inventario_pct, skus),
    itens_vda_pendencia: v.itens_vda_pendencia,
    pct_rup_sem_pendencia_vda: mediaFlagPct(v.soma_rup_sem_pendencia_vda, skus),
  };
}

export type RupturaCapaResultado = {
  linhas: RupturaCapaLinha[];
  setoresPorDivisao: Map<DivisaoDashboard, RupturaCapaLinha[]>;
  total: RupturaCapaLinha;
};

export function agregarCapaFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): RupturaCapaResultado {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];

  const divMap = new Map<DivisaoDashboard, AggCapa>();
  const setorMap = new Map<string, AggCapa>();
  const setorDivMap = new Map<string, DivisaoDashboard>();
  const total = emptyAgg();

  for (const d of DIVISOES_DASHBOARD) divMap.set(d, emptyAgg());

  for (const p of base) {
    acumularProduto(total, p);

    const div = resolverDivisaoProduto(p);
    if (!div || !divMap.has(div)) continue;

    acumularProduto(divMap.get(div)!, p);

    const setor = p.setorN2 ?? p.divisao ?? "—";
    const setorAgg = setorMap.get(setor) ?? emptyAgg();
    acumularProduto(setorAgg, p);
    setorMap.set(setor, setorAgg);
    setorDivMap.set(setor, div);
  }

  const linhas: RupturaCapaLinha[] = DIVISOES_DASHBOARD.map((div) =>
    aggParaLinha(div, "divisao", div, divMap.get(div)!),
  );

  const setoresPorDivisao = new Map<DivisaoDashboard, RupturaCapaLinha[]>();
  for (const div of DIVISOES_DASHBOARD) setoresPorDivisao.set(div, []);

  for (const [setor, agg] of setorMap) {
    const div = setorDivMap.get(setor);
    if (!div) continue;
    setoresPorDivisao.get(div)!.push(aggParaLinha(setor, "setor", div, agg));
  }

  for (const div of DIVISOES_DASHBOARD) {
    const setores = setoresPorDivisao.get(div)!;
    const ordenados = ordenarSetoresDashboard(
      setores.map((s) => ({
        regional: "",
        data_referencia: "",
        loja: 0,
        divisao: s.divisao,
        setor_n2: s.nome,
        total_produtos: s.total_skus,
        total_ruptura: s.total_ruptura,
        curto_prazo: s.total_curto_prazo,
        medio_prazo: s.total_medio_prazo,
        longo_prazo: s.total_longo_prazo,
        bloqueados: 0,
        total_base_limpa_elegivel: s.total_skus,
        percentual_ruptura: s.pct_ruptura,
      })),
    );
    setoresPorDivisao.set(
      div,
      ordenados.map((o) => setores.find((s) => s.nome === o.setor_n2)!),
    );
  }

  return {
    linhas,
    setoresPorDivisao,
    total: aggParaLinha("TOTAL", "divisao", null, total),
  };
}

export type RupturaLojaResultado = {
  linhas: RupturaCapaLinha[];
  total: RupturaCapaLinha;
};

export type RupturaCompradorResultado = {
  linhas: RupturaCapaLinha[];
  compradoresPorDivisao: Map<DivisaoDashboard, RupturaCapaLinha[]>;
  fornecedoresPorComprador: Map<string, RupturaCapaLinha[]>;
  total: RupturaCapaLinha;
};

const SEM_FORNECEDOR = "(sem fornecedor)";

function chaveFornecedor(p: HibridoProdutoGestao): string {
  const nome = p.razaoFornecedor?.trim();
  if (nome) return nome;
  if (p.codFornecedor != null) return String(p.codFornecedor);
  return SEM_FORNECEDOR;
}

function compradorMapKey(div: DivisaoDashboard, comprador: string): string {
  return `${div}|${comprador}`;
}

function sortLinhasPorPctDesc(linhas: RupturaCapaLinha[]): RupturaCapaLinha[] {
  return [...linhas].sort((a, b) => {
    const pa = a.pct_ruptura ?? -1;
    const pb = b.pct_ruptura ?? -1;
    if (pb !== pa) return pb - pa;
    return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  });
}

/** Planilha COMPRADOR — hierarquia 60/62/63 → comprador → fornecedor. */
export function agregarCapaPorCompradorFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): RupturaCompradorResultado {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];

  const divMap = new Map<DivisaoDashboard, AggCapa>();
  const compradorMap = new Map<string, AggCapa>();
  const compradorDivMap = new Map<string, DivisaoDashboard>();
  const fornecedorMap = new Map<string, AggCapa>();
  const total = emptyAgg();

  for (const d of DIVISOES_DASHBOARD) divMap.set(d, emptyAgg());

  for (const p of base) {
    acumularProduto(total, p);

    const div = resolverDivisaoProduto(p);
    if (!div || !divMap.has(div)) continue;

    acumularProduto(divMap.get(div)!, p);

    const comprador = chaveComprador(p);
    const compKey = compradorMapKey(div, comprador);
    const compAgg = compradorMap.get(compKey) ?? emptyAgg();
    acumularProduto(compAgg, p);
    compradorMap.set(compKey, compAgg);
    compradorDivMap.set(compKey, div);

    const fornKey = `${compKey}|${chaveFornecedor(p)}`;
    const fornAgg = fornecedorMap.get(fornKey) ?? emptyAgg();
    acumularProduto(fornAgg, p);
    fornecedorMap.set(fornKey, fornAgg);
  }

  const linhas: RupturaCapaLinha[] = DIVISOES_DASHBOARD.map((div) =>
    aggParaLinha(div, "divisao", div, divMap.get(div)!),
  );

  const compradoresPorDivisao = new Map<DivisaoDashboard, RupturaCapaLinha[]>();
  const fornecedoresPorComprador = new Map<string, RupturaCapaLinha[]>();

  for (const div of DIVISOES_DASHBOARD) compradoresPorDivisao.set(div, []);

  for (const [compKey, agg] of compradorMap) {
    const div = compradorDivMap.get(compKey);
    if (!div) continue;
    const comprador = compKey.slice(div.length + 1);
    compradoresPorDivisao.get(div)!.push(aggParaLinha(comprador, "comprador", div, agg));

    const fornecedores: RupturaCapaLinha[] = [];
    for (const [fornKey, fornAgg] of fornecedorMap) {
      if (!fornKey.startsWith(`${compKey}|`)) continue;
      const fornecedor = fornKey.slice(compKey.length + 1);
      fornecedores.push(aggParaLinha(fornecedor, "fornecedor", div, fornAgg));
    }
    fornecedoresPorComprador.set(compKey, sortLinhasPorPctDesc(fornecedores));
  }

  for (const div of DIVISOES_DASHBOARD) {
    compradoresPorDivisao.set(div, sortLinhasPorPctDesc(compradoresPorDivisao.get(div)!));
  }

  return {
    linhas,
    compradoresPorDivisao,
    fornecedoresPorComprador,
    total: aggParaLinha("TOTAL", "comprador", null, total),
  };
}

export { SEM_COMPRADOR };

/** Planilha LOJA — mesmas colunas da CAPA, linhas = lojas do escopo. */
export function agregarCapaPorLojaFromGestao(
  produtos: readonly HibridoProdutoGestao[],
  opts?: { universoOficial?: boolean },
): RupturaLojaResultado {
  const base =
    opts?.universoOficial !== false ? filtrarUniversoOficialCompativel(produtos) : [...produtos];

  const lojaMap = new Map<number, AggCapa>();
  const total = emptyAgg();

  for (const p of base) {
    acumularProduto(total, p);
    const loja = p.loja;
    if (!loja) continue;
    const agg = lojaMap.get(loja) ?? emptyAgg();
    acumularProduto(agg, p);
    lojaMap.set(loja, agg);
  }

  const linhas = [...lojaMap.entries()]
    .map(([loja, agg]) => aggParaLinha(String(loja), "loja", null, agg))
    .sort((a, b) => {
      const pa = a.pct_ruptura ?? -1;
      const pb = b.pct_ruptura ?? -1;
      if (pb !== pa) return pb - pa;
      return Number(a.nome) - Number(b.nome);
    });

  return {
    linhas,
    total: aggParaLinha("TOTAL", "loja", null, total),
  };
}

/** KPI cards a partir da linha TOTAL da planilha CAPA/COMPRADOR. */
export function mapCapaLinhaTotalToDashboardKpi(
  total: RupturaCapaLinha,
  ctx: Pick<{ regional: string; dataReferencia: string }, "regional" | "dataReferencia">,
  loja = 0,
): import("../types/rupturaDashboardTypes.ts").RupturaDashboardLoja {
  const skus = total.total_skus;
  const pct = total.pct_ruptura;
  return {
    regional: ctx.regional,
    data_referencia: ctx.dataReferencia,
    loja,
    total_produtos: skus,
    total_em_ruptura: total.total_ruptura,
    total_ruptura_geral: total.total_ruptura,
    total_ruptura_classificada: total.total_ruptura,
    total_curto_prazo: total.total_curto_prazo,
    total_medio_prazo: total.total_medio_prazo,
    total_longo_prazo: total.total_longo_prazo,
    total_sem_ruptura: 0,
    total_bloqueado: 0,
    total_qualidade_alerta: 0,
    total_com_estoque_cd: total.havia_estoque_cd,
    total_sem_estoque_cd: 0,
    total_com_pendencia: 0,
    total_cross_docking: 0,
    total_centralizado: 0,
    total_nao_centralizado: 0,
    compradores_distintos: 0,
    fornecedores_distintos: 0,
    total_base_limpa_elegivel: skus,
    percentual_ruptura: pct,
    percentual_ruptura_geral: pct,
    percentual_ruptura_classificada: pct,
  };
}
