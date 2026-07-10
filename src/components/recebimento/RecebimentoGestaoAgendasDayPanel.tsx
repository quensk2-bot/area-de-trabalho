import type { RefObject } from "react";
import { theme } from "../../styles";
import type {
  GestaoAgendaDaySummary,
  GestaoAgendaDrawerFilters,
  GestaoAgendaHistoricoRow,
  GestaoAgendaRow,
} from "./recebimentoGestaoAgendasUtils";
import { formatCampoAlterado, formatDateTimeBR, getFullDateLabel, safeJsonEntries, toNumber } from "./recebimentoGestaoAgendasUtils";

type Props = {
  open: boolean;
  fullScreen: boolean;
  day: string | null;
  summary: GestaoAgendaDaySummary | null;
  rows: GestaoAgendaRow[];
  historicoByGestaoId: Record<string, GestaoAgendaHistoricoRow[]>;
  filtros: GestaoAgendaDrawerFilters;
  onChangeFiltros: (next: GestaoAgendaDrawerFilters) => void;
  onClose: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${theme.colors.borderSoft}`,
  background: "rgba(2,6,23,0.52)",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const metricBadge = (label: string, value: number, color?: string) => (
  <div key={label} style={{ border: `1px solid ${theme.colors.borderSoft}`, borderRadius: 10, padding: 8, background: "rgba(15,23,42,0.84)" }}>
    <div style={{ color: theme.colors.textMuted, fontSize: 11 }}>{label}</div>
    <div style={{ color: color ?? theme.colors.text, fontWeight: 800, fontSize: 16 }}>{value.toLocaleString("pt-BR")}</div>
  </div>
);

const agendaStatusColor = (status: string | null | undefined) => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirmado") && !normalized.includes("não")) return theme.colors.neonGreen;
  if (normalized.includes("sem contato") || normalized.includes("pendente") || normalized.includes("não")) return theme.colors.warning;
  if (normalized.includes("cancelad")) return theme.colors.danger;
  return theme.colors.neonOrange;
};

const formatHora = (value: string | null | undefined) => (value ? value.slice(0, 5) : "Sem horário");

const rowMatchDrawerFilters = (row: GestaoAgendaRow, filtros: GestaoAgendaDrawerFilters) => {
  if (filtros.status && (row.status_confirmacao ?? "Pendente") !== filtros.status) return false;
  if (filtros.somenteAlteradas && !row.alterado_na_ultima_importacao) return false;
  if (filtros.somenteVinculadas && !(row.operacional_encontrado || !!row.agendamento_id)) return false;

  const search = filtros.busca.trim().toLowerCase();
  if (!search) return true;
  const bag = [
    row.codigo_agenda,
    row.fornecedor_nome,
    row.transportadora_nome,
    row.tipo_carga,
    row.doca,
    row.notas_fiscais,
    row.observacao,
    row.status_confirmacao,
  ]
    .map((v) => (v ?? "").toLowerCase())
    .join(" |");
  return bag.includes(search);
};

export function RecebimentoGestaoAgendasDayPanel({
  open,
  fullScreen,
  day,
  summary,
  rows,
  historicoByGestaoId,
  filtros,
  onChangeFiltros,
  onClose,
  scrollRef,
}: Props) {
  if (!open || !day) return null;

  const rowsFiltradas = rows.filter((row) => rowMatchDrawerFilters(row, filtros));

  return (
    <aside
      aria-label="Detalhes do dia"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: fullScreen ? "100%" : "42%",
        maxWidth: fullScreen ? "100%" : 720,
        minWidth: fullScreen ? "100%" : 460,
        zIndex: 60,
        background: "rgba(2,6,23,0.98)",
        borderLeft: `1px solid ${theme.colors.borderSoft}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: 14,
          borderBottom: `1px solid ${theme.colors.borderSoft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ color: theme.colors.text, fontWeight: 800, fontSize: 17, textTransform: "capitalize" }}>
            {getFullDateLabel(day)}
          </div>
          <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {summary ? `${summary.agendas} agendas e ${summary.veiculos} veículos no período` : "Resumo do dia"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={{ borderRadius: 999, border: `1px solid ${theme.colors.borderSoft}`, background: "transparent", color: theme.colors.textSoft, fontWeight: 700, padding: "8px 12px", cursor: "not-allowed", opacity: 0.55 }} title="Exportação planejada para fase futura" disabled>
            Exportar (futuro)
          </button>
          <button type="button" style={{ borderRadius: 999, border: `1px solid ${theme.colors.borderSoft}`, background: "transparent", color: theme.colors.textSoft, fontWeight: 700, padding: "8px 12px", cursor: "pointer" }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </header>

      <div ref={scrollRef} style={{ overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <section style={sectionStyle}>
          <strong style={{ color: theme.colors.neonOrange, fontSize: 13 }}>Filtros internos</strong>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 200px)", gap: 8 }}>
            <input
              value={filtros.busca}
              placeholder="Buscar por código, fornecedor, transportadora..."
              onChange={(event) => onChangeFiltros({ ...filtros, busca: event.target.value })}
              style={{ width: "100%", borderRadius: 8, border: `1px solid ${theme.colors.borderSoft}`, background: theme.colors.bgElevated, color: theme.colors.text, padding: "8px 10px", boxSizing: "border-box" }}
            />
            <select
              value={filtros.status}
              onChange={(event) => onChangeFiltros({ ...filtros, status: event.target.value })}
              style={{ width: "100%", borderRadius: 8, border: `1px solid ${theme.colors.borderSoft}`, background: theme.colors.bgElevated, color: theme.colors.text, padding: "8px 10px" }}
            >
              <option value="">Todos status</option>
              {Array.from(new Set(rows.map((row) => row.status_confirmacao ?? "Pendente"))).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ color: theme.colors.textSoft, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={filtros.somenteAlteradas}
                onChange={(event) => onChangeFiltros({ ...filtros, somenteAlteradas: event.target.checked })}
              />
              Somente alteradas
            </label>
            <label style={{ color: theme.colors.textSoft, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={filtros.somenteVinculadas}
                onChange={(event) => onChangeFiltros({ ...filtros, somenteVinculadas: event.target.checked })}
              />
              Somente vinculadas
            </label>
          </div>
        </section>

        <section style={sectionStyle}>
          <strong style={{ color: theme.colors.neonOrange, fontSize: 13 }}>Resumo</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            {metricBadge("Agendas", summary?.agendas ?? 0)}
            {metricBadge("Veículos", summary?.veiculos ?? 0)}
            {metricBadge("Confirmadas", summary?.confirmadas ?? 0, theme.colors.neonGreen)}
            {metricBadge("Pendentes", summary?.pendentes ?? 0, theme.colors.warning)}
            {metricBadge("Sem contato", summary?.semContato ?? 0, theme.colors.warning)}
            {metricBadge("Reagendadas", summary?.reagendadas ?? 0, theme.colors.neonOrange)}
            {metricBadge("Canceladas", summary?.canceladas ?? 0, theme.colors.danger)}
            {metricBadge("Vinculadas", summary?.vinculadas ?? 0, theme.colors.neonGreen)}
          </div>
        </section>

        <section style={sectionStyle}>
          <strong style={{ color: theme.colors.neonOrange, fontSize: 13 }}>Agendas</strong>
          {rowsFiltradas.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, fontSize: 13 }}>Nenhuma agenda no dia para os filtros internos.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {rowsFiltradas.map((row) => {
                const historicos = historicoByGestaoId[row.id] ?? [];
                const alteracoes = safeJsonEntries(row.campos_alterados);
                return (
                  <article key={row.id} style={{ borderRadius: 10, border: `1px solid ${theme.colors.borderSoft}`, background: "rgba(15,23,42,0.82)", padding: 10, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ color: theme.colors.text, fontWeight: 700 }}>
                        {row.codigo_agenda ?? "Sem código"}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.14)", color: row.operacional_encontrado ? theme.colors.neonGreen : theme.colors.textMuted }}>
                          {row.operacional_encontrado || row.agendamento_id ? "Vinculada ao operacional" : "Sem vínculo"}
                        </span>
                        <span style={{ borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, background: "rgba(251,146,60,0.14)", color: agendaStatusColor(row.status_confirmacao) }}>
                          {row.status_confirmacao ?? "Pendente"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 6, fontSize: 12 }}>
                      <div><strong>Fornecedor:</strong> {row.fornecedor_nome ?? "-"}</div>
                      <div><strong>Transportadora:</strong> {row.transportadora_nome ?? "-"}</div>
                      <div><strong>Modalidade:</strong> {row.tipo_carga ?? "-"}</div>
                      <div><strong>Referência horário:</strong> {formatHora(row.horario)}</div>
                      <div><strong>Doca:</strong> {row.doca ?? "-"}</div>
                      <div><strong>Notas:</strong> {row.notas_fiscais ?? "-"}</div>
                      <div><strong>Volumes:</strong> {toNumber(row.volumes).toLocaleString("pt-BR")}</div>
                      <div><strong>SKU:</strong> {toNumber(row.sku).toLocaleString("pt-BR")}</div>
                      <div><strong>Veículos:</strong> {toNumber(row.qtd_veiculos).toLocaleString("pt-BR")}</div>
                      <div><strong>Situação operacional:</strong> {row.status_operacional ?? "-"}</div>
                    </div>

                    <div style={{ borderRadius: 8, padding: 8, background: "rgba(2,6,23,0.52)", fontSize: 12 }}>
                      <strong>Observação:</strong> {row.observacao ?? "Sem observação"}
                    </div>

                    <div style={{ borderTop: `1px dashed ${theme.colors.borderSoft}`, paddingTop: 8, display: "grid", gap: 6 }}>
                      <strong style={{ color: theme.colors.textSoft, fontSize: 12 }}>Histórico</strong>
                      {historicos.length === 0 ? (
                        <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem histórico disponível.</div>
                      ) : (
                        historicos.slice(0, 6).map((item) => (
                          <div key={item.id} style={{ borderRadius: 8, border: `1px solid ${theme.colors.borderSoft}`, padding: 8, fontSize: 12 }}>
                            <div>
                              <strong>{item.resultado ?? "Atualização"}</strong> via {item.canal ?? "canal não informado"}
                            </div>
                            <div style={{ color: theme.colors.textMuted }}>
                              {item.contato_nome ?? "Sem contato"} {item.contato_tipo ? `(${item.contato_tipo})` : ""} - {formatDateTimeBR(item.created_at)}
                            </div>
                            {item.observacao && <div style={{ marginTop: 4 }}>{item.observacao}</div>}
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ borderTop: `1px dashed ${theme.colors.borderSoft}`, paddingTop: 8, display: "grid", gap: 6 }}>
                      <strong style={{ color: theme.colors.textSoft, fontSize: 12 }}>Alterações da última importação</strong>
                      {!row.alterado_na_ultima_importacao && alteracoes.length === 0 ? (
                        <div style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sem alterações registradas na última importação.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                          {alteracoes.length === 0 ? (
                            <div style={{ color: theme.colors.textMuted }}>Registro marcado como alterado, sem detalhamento de campos.</div>
                          ) : (
                            alteracoes.map(([campo, valores]) => (
                              <div key={campo} style={{ borderRadius: 8, padding: 8, background: "rgba(239,68,68,0.12)", color: "#fecaca" }}>
                                {formatCampoAlterado(campo, valores.de, valores.para)}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
