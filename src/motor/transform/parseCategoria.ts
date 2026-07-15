import type { MotorHierarquiaMercadologica } from "../types/motorProdutoLojaNormalizado.ts";

const DELIMITADOR_HIERARQUIA = " \\ ";

export function parseCategoriaHierarquia(
  categoriaOriginal: string | null | undefined,
): MotorHierarquiaMercadologica {
  const original = categoriaOriginal?.trim() ?? null;
  if (original == null || original === "") {
    return {
      categoriaOriginal: null,
      divisao: null,
      setorN2: null,
      grupoN3: null,
      subgrupoN4: null,
      tipoN5: null,
      niveisEncontrados: 0,
      ambiguidade: null,
    };
  }

  const partes = original.split(DELIMITADOR_HIERARQUIA).map((p) => p.trim());
  const niveis = partes.filter((p) => p !== "");

  let ambiguidade: string | null = null;
  if (partes.length !== niveis.length) {
    ambiguidade = "Segmentos vazios detectados no delimitador de hierarquia";
  }
  if (niveis.length > 5) {
    ambiguidade = ambiguidade
      ? `${ambiguidade}; mais de 5 níveis encontrados (${niveis.length})`
      : `Mais de 5 níveis encontrados (${niveis.length})`;
  }

  return {
    categoriaOriginal: original,
    divisao: niveis[0] ?? null,
    setorN2: niveis[1] ?? null,
    grupoN3: niveis[2] ?? null,
    subgrupoN4: niveis[3] ?? null,
    tipoN5: niveis[4] ?? null,
    niveisEncontrados: Math.min(niveis.length, 5),
    ambiguidade,
  };
}
