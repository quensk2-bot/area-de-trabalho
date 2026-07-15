export function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim();
  if (!text) return 0;
  text = text.replace(/%/g, "").replace(/\s/g, "");

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  if (hasComma) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const parts = text.split(".");
    const looksLikeThousands = parts.length > 2 && parts.slice(1).every((part) => part.length === 3);
    if (looksLikeThousands) text = parts.join("");
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(value: unknown, digits = 3) {
  const n = toNumber(value);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: unknown, digits = 2) {
  return `${formatNumber(toNumber(value), digits)}%`;
}

const MESES_PT = [
  "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function monthLabel(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return `${MESES_PT[(month || 1) - 1] ?? ""} ${year || new Date().getFullYear()}`.trim();
}

export function monthStart(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function monthEnd(monthKey: string) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

export function formatDateBR(value: unknown) {
  if (!value) return "-";
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split("-");
  if (!year || !month || !day) return text;
  return `${day}/${month}/${year}`;
}

export function isMesVigenciaValido(value: string | null | undefined) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export function chaveTexto(...partes: unknown[]) {
  return partes.map((parte) => String(parte ?? "").trim()).join("|");
}

export const TIPO_PONTA_PADRAO = "PONTA NORMAL";

export function normalizeLojaKey(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const num = Number(text.replace(",", "."));
  if (Number.isFinite(num)) return String(Math.trunc(num));
  return text;
}

export function normalizeCodigoProduto(value: unknown) {
  let text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d+,\d+$/.test(text)) text = text.replace(",", ".");
  const num = Number(text);
  if (Number.isFinite(num)) return String(Math.trunc(num));
  return text.replace(/\s/g, "");
}

export function normalizeTipoPonta(value: unknown) {
  const tipo = String(value ?? "").trim().toUpperCase();
  return tipo || TIPO_PONTA_PADRAO;
}

export function buildMediaLookup(medias: Array<Record<string, unknown>>) {
  const sorted = [...medias].sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });
  const map = new Map<string, Record<string, unknown>>();
  for (const media of sorted) {
    const loja = normalizeLojaKey(media.loja);
    if (!loja) continue;
    const codigos = [
      normalizeCodigoProduto(media.codigo_produto),
      normalizeCodigoProduto(media.seqproduto),
    ].filter(Boolean);
    for (const codigo of [...new Set(codigos)]) {
      const key = chaveTexto(loja, codigo);
      if (!map.has(key)) map.set(key, media);
    }
  }
  return map;
}

export function mediaTemVenda(media: Record<string, unknown> | null | undefined) {
  if (!media) return false;
  const raw = media.media_venda_un_dia;
  if (raw === null || raw === undefined || String(raw).trim() === "") return false;
  return true;
}

export function lookupMedia(
  map: Map<string, Record<string, unknown>>,
  loja: unknown,
  codigo: unknown,
) {
  return map.get(chaveTexto(normalizeLojaKey(loja), normalizeCodigoProduto(codigo)));
}

export function chaveReparticaoPonta(loja: unknown, numeroPonta: unknown, tipoPonta: unknown) {
  return chaveTexto(normalizeLojaKey(loja), numeroPonta, normalizeTipoPonta(tipoPonta));
}

export function alertasPontoExtra(item: Record<string, unknown>) {
  const alertas = Array.isArray(item.alertas) ? [...(item.alertas as string[])] : [];
  const add = (alerta: string, condition: boolean) => {
    if (condition && !alertas.includes(alerta)) alertas.push(alerta);
  };
  add("produto sem M3_UNID", toNumber(item.m3_unid) <= 0);
  add("unidade sugerida muito alta", toNumber(item.unidade_sugerida) > 1000);
  add("caixa sugerida zerada", toNumber(item.unidade_sugerida) > 0 && toNumber(item.caixas_sugeridas) <= 0);
  add("sem estoque CD", toNumber(item.estoque_cd) <= 0);
  add("sem codigo da ponta", !String(item.cod_ponta ?? "").trim());
  add("sem cubagem", toNumber(item.m3_ponta) <= 0);
  add("sem media", toNumber(item.media_venda_un_dia) <= 0);
  add("fora da reparticao", Boolean(item.fora_reparticao));
  add("m3 capacidade maior que total da ponta", toNumber(item.m3_capacidade) > toNumber(item.m3_ponta) && toNumber(item.m3_ponta) > 0);
  add("M3 unitario invalido", toNumber(item.m3_unid) <= 0);
  add("embalagem compra invalida", Boolean(item.embalagem_invalida) || toNumber(item.qtde_emb_compra) <= 0);
  add("produto com cadastro inconsistente", !String(item.codigo_produto ?? "").trim() || !String(item.descricao_produto ?? "").trim());
  return alertas;
}

export function chavePontaOperacional(item: Record<string, unknown>) {
  return chaveTexto(
    item.loja,
    item.quant_ponta,
    item.cod_ponta || "SEM_CODIGO_PONTA",
    item.setor_codigo,
    item.tipo_ponta,
  );
}

export function chaveCapaOperacional(item: Record<string, unknown>) {
  return chaveTexto(
    item.setor_codigo,
    item.cod_ponta || "SEM_CODIGO_PONTA",
    item.quant_ponta,
    item.tipo_ponta,
    item.mes_vigencia,
  );
}

export function chaveSetorCapaOperacional(item: Record<string, unknown>) {
  return chaveTexto(item.setor_codigo, item.mes_vigencia);
}

export function chavePontaLojaOperacional(item: Record<string, unknown>) {
  return chaveTexto(item.quant_ponta, item.tipo_ponta, item.cod_ponta || "SEM_CODIGO_PONTA");
}
