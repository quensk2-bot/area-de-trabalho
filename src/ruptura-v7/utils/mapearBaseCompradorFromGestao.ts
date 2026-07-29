import type { HibridoProdutoGestao } from "../../motor/export/hibrido/hibridoTypes.ts";
import { filtrarUniversoOficialCompativel } from "../../motor/export/hibrido/filtrarUniversoOficialCompativel.ts";
import { resolverDivisaoProduto } from "../constants/dashboardDivisoes.ts";
import { chaveComprador, filtrarProdutosPorCompradores } from "../services/compradoresFiltroUtils.ts";
import type { BaseCompradorFiltrosSlicer, BaseCompradorLinha } from "./baseCompradorTypes.ts";

function txt(v: string | null | undefined): string {
  const s = v?.trim();
  return s || "—";
}

function categoriaMercadologica(p: HibridoProdutoGestao): string {
  const g = p.grupoN3?.trim();
  if (g) return g;
  const c = p.categoriaN1?.trim();
  if (c) return c;
  return "—";
}

export function produtoParaBaseCompradorLinha(p: HibridoProdutoGestao): BaseCompradorLinha {
  const departamento = resolverDivisaoProduto(p) ?? txt(p.divisao);
  return {
    codigo: p.seqproduto,
    descCompleta: txt(p.descricao),
    departamento,
    secao: txt(p.setorN2),
    categoria: categoriaMercadologica(p),
    fornecedor: txt(p.razaoFornecedor),
    comprador: chaveComprador(p),
  };
}

function cmpLinha(a: BaseCompradorLinha, b: BaseCompradorLinha): number {
  const keys: (keyof BaseCompradorLinha)[] = [
    "comprador",
    "fornecedor",
    "departamento",
    "secao",
    "categoria",
    "codigo",
  ];
  for (const k of keys) {
    const va = k === "codigo" ? a.codigo : String(a[k]);
    const vb = k === "codigo" ? b.codigo : String(b[k]);
    const c =
      k === "codigo"
        ? (va as number) - (vb as number)
        : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base" });
    if (c !== 0) return c;
  }
  return a.descCompleta.localeCompare(b.descCompleta, "pt-BR", { sensitivity: "base" });
}

/** Um SKU por código (multi-loja: primeira ocorrência). */
export function deduplicarBaseCompradorPorCodigo(linhas: BaseCompradorLinha[]): BaseCompradorLinha[] {
  const porCodigo = new Map<number, BaseCompradorLinha>();
  const out: BaseCompradorLinha[] = [];
  for (const l of linhas) {
    const existente = porCodigo.get(l.codigo);
    if (existente) {
      const campos = ["descCompleta", "departamento", "secao", "categoria", "fornecedor", "comprador"] as const;
      const divergentes = campos.filter((campo) => existente[campo] !== l[campo]);
      if (divergentes.length) {
        existente.conflitoAtributos = [...new Set([...(existente.conflitoAtributos ?? []), ...divergentes])];
      }
      continue;
    }
    porCodigo.set(l.codigo, l);
    out.push(l);
  }
  return out;
}

export function listarValoresDistintos(linhas: readonly BaseCompradorLinha[], campo: keyof BaseCompradorLinha): string[] {
  const set = new Set<string>();
  for (const l of linhas) {
    const v = l[campo];
    set.add(typeof v === "number" ? String(v) : String(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

export function aplicarSlicersBaseComprador(
  linhas: readonly BaseCompradorLinha[],
  slicers: BaseCompradorFiltrosSlicer,
  totalDepartamentos: number,
  totalSecoes: number,
  totalCategorias: number,
  busca = "",
): BaseCompradorLinha[] {
  const deptAtivo =
    slicers.departamentos.length > 0 && slicers.departamentos.length < totalDepartamentos
      ? new Set(slicers.departamentos)
      : null;
  const secAtivo =
    slicers.secoes.length > 0 && slicers.secoes.length < totalSecoes ? new Set(slicers.secoes) : null;
  const catAtivo =
    slicers.categorias.length > 0 && slicers.categorias.length < totalCategorias
      ? new Set(slicers.categorias)
      : null;
  const termo = busca.trim().toLocaleLowerCase("pt-BR");

  return linhas.filter((l) => {
    if (deptAtivo && !deptAtivo.has(l.departamento)) return false;
    if (secAtivo && !secAtivo.has(l.secao)) return false;
    if (catAtivo && !catAtivo.has(l.categoria)) return false;
    if (
      termo &&
      !String(l.codigo).includes(termo) &&
      !l.descCompleta.toLocaleLowerCase("pt-BR").includes(termo)
    ) {
      return false;
    }
    return true;
  });
}

export function montarBaseCompradorFromGestao(input: {
  produtos: readonly HibridoProdutoGestao[];
  compradores?: string[];
  universoOficial?: boolean;
  deduplicarCodigo?: boolean;
}): BaseCompradorLinha[] {
  let base = input.universoOficial !== false ? filtrarUniversoOficialCompativel(input.produtos) : [...input.produtos];
  base = filtrarProdutosPorCompradores(base, input.compradores);
  let linhas = base.map(produtoParaBaseCompradorLinha);
  if (input.deduplicarCodigo !== false) linhas = deduplicarBaseCompradorPorCodigo(linhas);
  linhas.sort(cmpLinha);
  return linhas;
}
