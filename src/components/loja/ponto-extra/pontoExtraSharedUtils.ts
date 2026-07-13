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
