import { theme } from "../../../styles";
import { cardStyle, descStyle, gridStyle } from "./pontoExtraSharedStyles";
import { formatDateBR, formatNumber, formatPercent, monthLabel } from "./pontoExtraSharedUtils";
import { montarComparacaoCenarios, type PontaSimulacaoGrupo } from "./pontoExtraSimuladorUtils";

type Props = {
  grupo: PontaSimulacaoGrupo;
};

function Metrica({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function BlocoCenario({ titulo, produtos, ocupacaoPct, m3Utilizado, minTotal, maxTotal, coberturaMedia, unidades, caixas }: {
  titulo: string;
  produtos: number;
  ocupacaoPct: number;
  m3Utilizado: number;
  minTotal: number;
  maxTotal: number;
  coberturaMedia: number;
  unidades: number;
  caixas: number;
}) {
  return (
    <div style={{ ...cardStyle, margin: 0, padding: 14, background: "rgba(2,6,23,0.55)" }}>
      <h3 style={{ margin: "0 0 10px", color: theme.colors.neonGreen, fontSize: 14 }}>{titulo}</h3>
      <div style={{ ...gridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        <Metrica label="Produtos" value={produtos} />
        <Metrica label="Ocupacao" value={formatPercent(ocupacaoPct / 100, 1)} />
        <Metrica label="M3 utilizado" value={formatNumber(m3Utilizado, 4)} />
        <Metrica label="Min total" value={formatNumber(minTotal, 0)} />
        <Metrica label="Max total" value={formatNumber(maxTotal, 0)} />
        <Metrica label="Cobertura media" value={formatNumber(coberturaMedia, 1)} />
        <Metrica label="Unidades" value={formatNumber(unidades, 2)} />
        <Metrica label="Caixas" value={formatNumber(caixas, 2)} />
      </div>
    </div>
  );
}

export function PontoExtraSimuladorResumo({ grupo }: Props) {
  const { atual, sugerido, temAnterior } = montarComparacaoCenarios(grupo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={cardStyle}>
        <div style={{ ...gridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <Metrica label="Loja" value={grupo.loja || "-"} />
          <Metrica label="Ponta" value={`${grupo.tipoPonta} ${grupo.quantPonta}`.trim() || "-"} />
          <Metrica label="Cod. ponta" value={grupo.codPonta || "-"} />
          <Metrica label="Vigencia" value={monthLabel(grupo.mesVigencia)} />
          <Metrica label="Seq. vigencia" value={grupo.seqVigencia || "-"} />
          <Metrica label="Periodo" value={`${formatDateBR(grupo.dtInicio)} a ${formatDateBR(grupo.dtFim)}`} />
          <Metrica label="Total M3" value={formatNumber(grupo.resumo.totalM3, 4)} />
          <Metrica label="% abastecimento" value={formatPercent(grupo.resumo.percentualAbastecimento / 100, 0)} />
          <Metrica label="M3 alvo" value={formatNumber(grupo.resumo.m3Alvo, 5)} />
          <Metrica label="Limite SKU" value={grupo.limiteSku} />
          <Metrica label="Status" value={grupo.resumo.statusSimulacao} />
          <Metrica label="Itens aprovados" value={`${grupo.resumo.itensAprovados} / ${grupo.resumo.itensElegiveis}`} />
        </div>
        <p style={{ ...descStyle, marginTop: 12 }}>{grupo.descricaoPonta}</p>
        <p style={descStyle}>Setor {grupo.setorCodigo} — {grupo.setorNome}</p>
      </div>

      <div style={{ ...gridStyle, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {temAnterior && atual ? <BlocoCenario {...atual} /> : (
          <div style={{ ...cardStyle, margin: 0, padding: 14, color: theme.colors.textMuted, fontSize: 13 }}>
            Nao existe simulacao anterior para comparacao.
          </div>
        )}
        <BlocoCenario {...sugerido} />
      </div>
    </div>
  );
}
