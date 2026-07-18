export type MotorChaveConsolidacaoParts = {
  regional: string;
  loja: number;
  seqproduto: number;
};

export type MotorValidacaoChaveResultado =
  | { valida: true; regional: string; loja: number; seqproduto: number }
  | { valida: false; motivo: string };

export function chaveConsolidacao(regional: string, loja: number, seqproduto: number): string {
  return `${regional.trim()}|${loja}|${seqproduto}`;
}

export function chaveLojaProduto(loja: number, seqproduto: number): string {
  return `${loja}|${seqproduto}`;
}

export function chaveRegionalProduto(regional: string, seqproduto: number): string {
  return `${regional.trim()}|${seqproduto}`;
}

export function chaveRegionalLojaProduto(regional: string, loja: number, seqproduto: number): string {
  return `${regional.trim()}|${loja}|${seqproduto}`;
}

export function chaveCompradorHierarquia(rede: string, divisao: string, setorN2: string, grupoN3: string): string {
  return `${rede.trim()}|${divisao.trim()}|${setorN2.trim()}|${grupoN3.trim()}`;
}

export function validarChaveConsolidacao(
  regional: string | null | undefined,
  loja: number | null | undefined,
  seqproduto: number | null | undefined,
): MotorValidacaoChaveResultado {
  const reg = regional?.trim() ?? "";
  if (reg === "") return { valida: false, motivo: "regional vazia" };
  if (loja == null || !Number.isFinite(loja) || loja <= 0) return { valida: false, motivo: "loja inválida" };
  if (seqproduto == null || !Number.isFinite(seqproduto) || seqproduto <= 0) {
    return { valida: false, motivo: "produto inválido" };
  }
  return { valida: true, regional: reg, loja, seqproduto };
}

export function parseChaveConsolidacao(chave: string): MotorChaveConsolidacaoParts | null {
  const parts = chave.split("|");
  if (parts.length !== 3) return null;
  const loja = Number(parts[1]);
  const seqproduto = Number(parts[2]);
  if (!Number.isFinite(loja) || !Number.isFinite(seqproduto)) return null;
  return { regional: parts[0], loja, seqproduto };
}
