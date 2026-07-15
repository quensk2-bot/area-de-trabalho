import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { theme } from "../../../styles";
import { cardStyle, descStyle, gridStyle, inputStyle } from "./pontoExtraSharedStyles";
import { formatNumber, normalizeLojaKey } from "./pontoExtraSharedUtils";
import {
  agruparPontasAcompanhamento,
  faixaCriticidade,
  labelPeriodoPonta,
  ordenarPontasPorCriticidade,
  resumirCriticidadePontas,
  type AcompanhamentoPontaCard,
  type FaixaCriticidade,
} from "./pontoExtraAcompanhamentoUtils";

type Props = {
  rows: Record<string, unknown>[];
  loading?: boolean;
  filtroLoja: string;
  onFiltroLojaChange: (value: string) => void;
};

type BalaoState = {
  card: AcompanhamentoPontaCard;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const BRAND = {
  black: "#020617",
  blackSoft: "#0f172a",
  blackCard: "#111827",
  green: theme.colors.neonGreen,
  greenDark: "#16a34a",
  orange: theme.colors.neonOrange,
  orangeDark: "#ea580c",
};

const BALAO_WIDTH = 420;
const BALAO_MARGIN = 14;

function pctLabel(value: number, digits = 0) {
  return `${formatNumber(value, digits)}%`;
}

function corAbastecimento(pct: number) {
  if (pct >= 70) return BRAND.green;
  if (pct >= 40) return BRAND.orange;
  return BRAND.orangeDark;
}

function calcularPosicaoBalao(rect: DOMRect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(BALAO_WIDTH, vw - BALAO_MARGIN * 2);
  const maxHeight = Math.min(Math.floor(vh * 0.82), 620);
  const gap = 12;

  const candidatos = [
    { left: rect.right + gap, top: rect.top },
    { left: rect.left - width - gap, top: rect.top },
    { left: Math.max(BALAO_MARGIN, rect.left + rect.width / 2 - width / 2), top: rect.top - maxHeight - gap },
    { left: Math.max(BALAO_MARGIN, rect.left + rect.width / 2 - width / 2), top: rect.bottom + gap },
    { left: (vw - width) / 2, top: (vh - maxHeight) / 2 },
  ];

  for (const candidato of candidatos) {
    const left = Math.max(BALAO_MARGIN, Math.min(candidato.left, vw - width - BALAO_MARGIN));
    let top = candidato.top;
    if (top + maxHeight > vh - BALAO_MARGIN) top = vh - maxHeight - BALAO_MARGIN;
    if (top < BALAO_MARGIN) top = BALAO_MARGIN;
    return { left, top, width, maxHeight };
  }

  return { left: BALAO_MARGIN, top: BALAO_MARGIN, width, maxHeight };
}

function textoGondolaStyle(fontSize: number): CSSProperties {
  return {
    fontSize,
    fontWeight: 900,
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 1.15,
    textShadow: "0 2px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)",
  };
}

function GondolaBar({ livrePct, abastecidoPct }: { livrePct: number; abastecidoPct: number }) {
  const livre = Math.max(0, Math.min(100, livrePct));
  const abastecido = Math.max(0, Math.min(100, abastecidoPct));
  const soAbastecido = abastecido >= 99.5;
  const soLivre = livre >= 99.5;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1.15",
        borderRadius: 12,
        overflow: "hidden",
        border: `2px solid ${BRAND.orangeDark}`,
        background: BRAND.black,
        boxShadow: `inset 0 0 0 1px rgba(251,146,60,0.15)`,
      }}
    >
      {livre > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${Math.max(livre, soLivre ? 100 : livre < 6 ? 6 : livre)}%`,
            background: `linear-gradient(180deg, ${BRAND.orange} 0%, ${BRAND.orangeDark} 100%)`,
          }}
        />
      )}
      {abastecido > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: `${Math.max(abastecido, soAbastecido ? 100 : abastecido < 6 ? 6 : abastecido)}%`,
            background: `linear-gradient(180deg, ${BRAND.green} 0%, ${BRAND.greenDark} 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 8,
          border: `1px dashed rgba(255,255,255,0.2)`,
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: "rgba(2,6,23,0.72)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            minWidth: "72%",
            boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
          }}
        >
          <span style={textoGondolaStyle(soAbastecido || soLivre ? 28 : 24)}>{pctLabel(abastecidoPct)}</span>
          <span style={{ ...textoGondolaStyle(10), fontWeight: 800, marginTop: 4, letterSpacing: 0.6 }}>
            ABASTECIDO
          </span>
          {!soAbastecido && !soLivre && livre > 0 && (
            <span style={{ ...textoGondolaStyle(13), fontWeight: 700, marginTop: 8, color: BRAND.orange }}>
              {pctLabel(livrePct)} livre
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BalaoPontaGondola({
  card,
  top,
  left,
  width,
  maxHeight,
  balaoRef,
  onMouseEnter,
  onMouseLeave,
}: {
  card: AcompanhamentoPontaCard;
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  balaoRef: RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      ref={balaoRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 99999,
        width,
        maxHeight,
        overflow: "auto",
        background: BRAND.black,
        border: `2px solid ${BRAND.orange}`,
        borderRadius: 14,
        boxShadow: `0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px ${BRAND.green}33`,
        padding: 14,
        color: theme.colors.text,
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 800, color: BRAND.green, fontSize: 14 }}>
        LOJA {card.loja} — PONTA NR {card.quantPonta} - {card.tipoPonta}
      </div>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>
        Cod. {card.codPonta || "-"} | Setor {card.setorCodigo} — {card.setorNome}
      </div>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        {card.descricaoPonta || "Sem descricao"} | {labelPeriodoPonta(card)}
      </div>

      <div style={{ ...gridStyle, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
        <MetricaBalao label="Abastecido" value={pctLabel(card.abastecidoPct, 1)} accent={BRAND.green} />
        <MetricaBalao label="Espaco livre" value={pctLabel(card.livrePct, 1)} accent={BRAND.orange} />
        <MetricaBalao label="Estoque loja" value={formatNumber(card.somaEstoqueLoja, 0)} />
        <MetricaBalao label="Max total" value={formatNumber(card.somaMaxTotal, 0)} />
        <MetricaBalao label="Status M3" value={card.statusSimulacao} />
        <MetricaBalao label="Produtos" value={card.produtos} />
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: theme.colors.textMuted }}>
        Formula: estoque da media de venda ÷ (par_max + max ponta) por item, agregado na ponta.
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: BRAND.orange, fontWeight: 700 }}>
        Itens — max loja + max ponta x estoque loja
      </div>

      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {card.itens.map((item) => (
          <div
            key={item.id || item.codigo}
            style={{
              border: `1px solid ${BRAND.orangeDark}`,
              borderRadius: 10,
              padding: 10,
              background: BRAND.blackSoft,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12 }}>
              {item.ordem}. {item.codigo}
            </div>
            <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>{item.descricao || "-"}</div>
            <div style={{ ...gridStyle, gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6, marginTop: 8, fontSize: 11 }}>
              <MiniStat label="Max loja" value={formatNumber(item.parMaxLoja, 0)} />
              <MiniStat label="Max ponta" value={formatNumber(item.maxPonta, 0)} accent={BRAND.orange} />
              <MiniStat label="Max total" value={formatNumber(item.maxTotal, 0)} />
              <MiniStat label="Estoque loja" value={formatNumber(item.estoqueLoja, 0)} accent={BRAND.green} />
              <MiniStat label="Estoque CD" value={formatNumber(item.estoqueCd, 0)} />
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.colors.textMuted }}>
                <span>Abastecimento estoque loja vs max total</span>
                <span style={{ color: corAbastecimento(item.percentualAbastecido), fontWeight: 700 }}>
                  {pctLabel(item.percentualAbastecido, 1)}
                </span>
              </div>
              <div style={{ marginTop: 4, height: 6, borderRadius: 999, background: "rgba(0,0,0,0.55)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${item.percentualAbastecido}%`,
                    height: "100%",
                    background: corAbastecimento(item.percentualAbastecido),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricaBalao({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ background: BRAND.blackCard, borderRadius: 8, padding: "8px 10px", border: `1px solid ${BRAND.orangeDark}55` }}>
      <div style={{ fontSize: 10, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2, color: accent ?? theme.colors.text }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontWeight: accent ? 800 : 600, color: accent ?? theme.colors.text }}>{value}</div>
    </div>
  );
}

function labelFaixa(faixa: FaixaCriticidade) {
  if (faixa === "ok") return "OK";
  if (faixa === "atencao") return "Atencao";
  return "Critica";
}

function ResumoCriticidade({ cards, loading }: { cards: AcompanhamentoPontaCard[]; loading?: boolean }) {
  const resumo = useMemo(() => resumirCriticidadePontas(cards), [cards]);

  const tiles = [
    { key: "critica" as const, label: "Criticas", sub: "< 40% abastecido", value: resumo.critica, color: BRAND.orangeDark },
    { key: "atencao" as const, label: "Atencao", sub: "40% a 69%", value: resumo.atencao, color: BRAND.orange },
    { key: "ok" as const, label: "OK", sub: ">= 70%", value: resumo.ok, color: BRAND.green },
    { key: "media" as const, label: "Media geral", sub: `${resumo.total} ponta${resumo.total === 1 ? "" : "s"}`, value: pctLabel(resumo.mediaAbastecido, 1), color: theme.colors.text },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          style={{
            background: BRAND.blackCard,
            border: `1px solid ${typeof tile.color === "string" && tile.key !== "media" ? tile.color : BRAND.orangeDark}`,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{tile.label}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: tile.color, marginTop: 4, lineHeight: 1 }}>
            {loading ? "—" : tile.value}
          </div>
          <div style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 6 }}>{tile.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CardGondola({
  card,
  ativo,
  onHover,
  onLeave,
}: {
  card: AcompanhamentoPontaCard;
  ativo: boolean;
  onHover: (card: AcompanhamentoPontaCard, target: HTMLElement) => void;
  onLeave: () => void;
}) {
  const corStatus = corAbastecimento(card.abastecidoPct);
  const faixa = faixaCriticidade(card.abastecidoPct);

  return (
    <div
      onMouseEnter={(e) => onHover(card, e.currentTarget)}
      onMouseLeave={onLeave}
      style={{
        ...cardStyle,
        margin: 0,
        padding: 12,
        cursor: "help",
        background: BRAND.blackCard,
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        borderColor: ativo ? BRAND.orange : corStatus,
        boxShadow: ativo ? `0 0 0 2px ${BRAND.orange}55, 0 8px 24px rgba(0,0,0,0.5)` : undefined,
        transform: ativo ? "translateY(-2px)" : undefined,
        position: "relative",
        zIndex: ativo ? 2 : 1,
      }}
    >
      {faixa !== "ok" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.4,
            padding: "3px 7px",
            borderRadius: 999,
            background: faixa === "critica" ? BRAND.orangeDark : BRAND.orange,
            color: BRAND.black,
          }}
        >
          {labelFaixa(faixa).toUpperCase()}
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: BRAND.green,
          marginBottom: 8,
          lineHeight: 1.35,
          minHeight: 30,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={card.descricaoPonta || `${card.setorCodigo} — ${card.setorNome}`}
      >
        {card.descricaoPonta || `${card.setorCodigo} — ${card.setorNome}`}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: BRAND.orange }}>LOJA</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{card.loja}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: BRAND.orange }}>PONTA</div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>NR {card.quantPonta}</div>
        </div>
      </div>

      <GondolaBar livrePct={card.livrePct} abastecidoPct={card.abastecidoPct} />

      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, alignItems: "center" }}>
        <span style={{ color: theme.colors.textSoft, fontWeight: 600 }}>{card.tipoPonta}</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: corStatus }}>{pctLabel(card.abastecidoPct, 0)}</span>
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: theme.colors.textSoft, textAlign: "right", fontWeight: 600 }}>
        abastecido
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: theme.colors.textSoft, fontWeight: 500, lineHeight: 1.35 }}>
        {card.produtos} produto{card.produtos === 1 ? "" : "s"} | Estoque {formatNumber(card.somaEstoqueLoja, 0)} / Max {formatNumber(card.somaMaxTotal, 0)}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: theme.colors.textMuted, fontWeight: 500 }}>
        {labelPeriodoPonta(card)}
      </div>
    </div>
  );
}

export function PontoExtraAcompanhamentoGondola({ rows, loading, filtroLoja, onFiltroLojaChange }: Props) {
  const cards = useMemo(() => agruparPontasAcompanhamento(rows), [rows]);

  const lojasDisponiveis = useMemo(
    () =>
      [...new Set(cards.map((card) => normalizeLojaKey(card.loja)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true }),
      ),
    [cards],
  );

  const cardsFiltrados = useMemo(() => {
    const filtrados = !filtroLoja
      ? cards
      : cards.filter((card) => normalizeLojaKey(card.loja) === normalizeLojaKey(filtroLoja));
    return ordenarPontasPorCriticidade(filtrados);
  }, [cards, filtroLoja]);

  const [balao, setBalao] = useState<BalaoState | null>(null);
  const balaoRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    if (!balao || !balaoRef.current) return;
    const node = balaoRef.current;
    const rect = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = balao.top;
    let left = balao.left;

    if (rect.bottom > vh - BALAO_MARGIN) top = Math.max(BALAO_MARGIN, vh - rect.height - BALAO_MARGIN);
    if (rect.right > vw - BALAO_MARGIN) left = Math.max(BALAO_MARGIN, vw - rect.width - BALAO_MARGIN);
    if (top < BALAO_MARGIN) top = BALAO_MARGIN;
    if (left < BALAO_MARGIN) left = BALAO_MARGIN;

    if (top !== balao.top || left !== balao.left) {
      setBalao((prev) => (prev ? { ...prev, top, left } : prev));
    }
  }, [balao?.card.key, balao?.top, balao?.left]);

  function cancelarFechamento() {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function agendarFechamento() {
    cancelarFechamento();
    hideTimerRef.current = window.setTimeout(() => setBalao(null), 220);
  }

  function abrirBalao(card: AcompanhamentoPontaCard, target: HTMLElement) {
    cancelarFechamento();
    const rect = target.getBoundingClientRect();
    const posicao = calcularPosicaoBalao(rect);
    setBalao({ card, ...posicao });
  }

  const balaoPortal =
    balao &&
    createPortal(
      <BalaoPontaGondola
        card={balao.card}
        top={balao.top}
        left={balao.left}
        width={balao.width}
        maxHeight={balao.maxHeight}
        balaoRef={balaoRef}
        onMouseEnter={cancelarFechamento}
        onMouseLeave={agendarFechamento}
      />,
      document.body,
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {balaoPortal}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          <span style={descStyle}>Loja</span>
          <select
            value={filtroLoja}
            onChange={(e) => onFiltroLojaChange(e.target.value)}
            style={{ ...inputStyle, minWidth: 160, cursor: "pointer" }}
          >
            <option value="">Todas as lojas ({lojasDisponiveis.length})</option>
            {lojasDisponiveis.map((loja) => (
              <option key={loja} value={loja}>
                Loja {loja}
              </option>
            ))}
          </select>
        </label>
        <span style={descStyle}>
          {loading ? "Carregando..." : `${cardsFiltrados.length} ponta${cardsFiltrados.length === 1 ? "" : "s"} — ordenadas da mais critica para a mais abastecida`}
        </span>
      </div>

      <ResumoCriticidade cards={cardsFiltrados} loading={loading} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: theme.colors.textMuted }}>
        <span><span style={{ color: BRAND.orange }}>■</span> Espaco livre</span>
        <span><span style={{ color: BRAND.green }}>■</span> Abastecido (estoque loja ÷ max total)</span>
      </div>

      {cardsFiltrados.length === 0 && !loading && (
        <div style={{ ...cardStyle, color: theme.colors.textMuted, background: BRAND.blackCard }}>
          Nenhuma ponta aprovada para exibir neste mes.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
          overflow: "visible",
        }}
      >
        {cardsFiltrados.map((card) => (
          <CardGondola
            key={card.key}
            card={card}
            ativo={balao?.card.key === card.key}
            onHover={abrirBalao}
            onLeave={agendarFechamento}
          />
        ))}
      </div>
    </div>
  );
}
