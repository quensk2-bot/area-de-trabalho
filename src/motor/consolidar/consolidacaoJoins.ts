import type { MotorAlerta } from "../bre/breTypes.ts";
import type { CatalogoRedeFornecedor } from "../catalog/catalogTypes.ts";
import { resolverComprador } from "../catalog/parseCompradores.ts";
import type { MotorCd5Normalizado, MotorProdutoLojaNormalizado } from "../types/motorProdutoLojaNormalizado.ts";
import type { MotorInventarioAgrupado, MotorLinhaValidacao } from "../types/motorLinhaTypes.ts";
import type { MotorBlocoCdsComplementar } from "./cds/consolidarCdsProduto.ts";
import {
  chaveCompradorHierarquia,
  chaveConsolidacao,
  chaveLojaProduto,
  chaveRegionalLojaProduto,
  chaveRegionalProduto,
} from "./consolidacaoKeys.ts";
import { criarJoinDiagnostico } from "./consolidacaoDiagnostics.ts";
import type { MotorConsolidacaoIndexes, MotorJoinDiagnostico } from "./consolidacaoTypes.ts";

export type MotorJoinBlocosCdsResultado = {
  blocos: MotorBlocoCdsComplementar[];
  alertas: MotorAlerta[];
  diagnostico: MotorJoinDiagnostico;
  ambiguo: boolean;
};

/** @deprecated Use MotorJoinBlocosCdsResultado */
export type MotorJoinCd5Resultado = {
  cd5: MotorCd5Normalizado | null;
  alertas: MotorAlerta[];
  diagnostico: MotorJoinDiagnostico;
};

export type MotorJoinRedeResultado = {
  rede: string | null;
  alertas: MotorAlerta[];
  diagnostico: MotorJoinDiagnostico;
};

export type MotorJoinCompradorResultado = {
  comprador: string | null;
  origemComprador: "hierarquia_exata" | "correcao_exata" | "rede_unica" | null;
  chaveComprador: string;
  fallbackComprador: boolean;
  alertas: MotorAlerta[];
  diagnostico: MotorJoinDiagnostico;
};

export type MotorJoinBandeiraResultado = {
  bandeira: string | null;
  alertas: MotorAlerta[];
  diagnostico: MotorJoinDiagnostico;
};

function alerta(codigo: string, mensagem: string, severidade: MotorAlerta["severidade"] = "aviso"): MotorAlerta {
  return { codigo, mensagem, severidade };
}

export function joinBlocosCdsComplementares(
  regional: string,
  loja: number,
  seqproduto: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): MotorJoinBlocosCdsResultado {
  const chaveLoja = chaveRegionalLojaProduto(regional, loja, seqproduto);
  const chaveRegional = chaveRegionalProduto(regional, seqproduto);
  const alertas: MotorAlerta[] = [];

  const porLoja = indexes.blocosCdsPorChaveLojaProduto.get(chaveLoja) ?? [];
  const porRegional = indexes.blocosCdsPorChaveRegionalProduto.get(chaveRegional) ?? [];
  const matches = porLoja.length > 0 ? porLoja : porRegional;
  const chaveUsada = porLoja.length > 0 ? chaveLoja : chaveRegional;

  if (matches.length === 0) {
    const diagnostico = criarJoinDiagnostico(
      "blocos_cds_complementares",
      chaveRegional,
      0,
      false,
      "blocos_cds_null",
      "aviso",
      "Produto sem blocos complementares de CDs",
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("grupo2_ausente", "Produto sem correspondência no Grupo 2 / blocos complementares"));
    return { blocos: [], alertas, diagnostico, ambiguo: false };
  }

  const blocosUnicos = new Map<string, MotorBlocoCdsComplementar>();
  for (const b of matches) {
    const chaveBloco = `${b.numeroBloco}|${b.origemArquivo}|${b.loja ?? "null"}`;
    if (!blocosUnicos.has(chaveBloco)) blocosUnicos.set(chaveBloco, b);
  }

  const contagemPorBloco = new Map<number, number>();
  for (const b of matches) {
    contagemPorBloco.set(b.numeroBloco, (contagemPorBloco.get(b.numeroBloco) ?? 0) + 1);
  }
  const blocoDuplicado = [...contagemPorBloco.values()].some((c) => c > 1);

  const blocos = [...blocosUnicos.values()];
  const ambiguo = blocoDuplicado;

  if (ambiguo) {
    const diagnostico = criarJoinDiagnostico(
      "blocos_cds_complementares",
      chaveUsada,
      matches.length,
      true,
      "blocos_cds_ambiguo",
      "aviso",
      `Ambiguidade blocos CDs: ${matches.length} correspondências para ${chaveUsada}`,
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("cd5_ambiguo", diagnostico.mensagem, "aviso"));
    return { blocos: [], alertas, diagnostico, ambiguo: true };
  }

  const diagnostico = criarJoinDiagnostico(
    "blocos_cds_complementares",
    chaveUsada,
    blocos.length,
    true,
    "blocos_cds_encontrados",
    "info",
    `${blocos.length} bloco(s) complementar(es) encontrado(s)`,
  );
  diagnosticos.push(diagnostico);
  return { blocos, alertas, diagnostico, ambiguo: false };
}

/** @deprecated Use joinBlocosCdsComplementares */
export function joinCd5(
  regional: string,
  seqproduto: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): MotorJoinCd5Resultado {
  const chave = chaveRegionalProduto(regional, seqproduto);
  const matches = indexes.cd5PorRegionalProduto.get(chave) ?? [];
  const alertas: MotorAlerta[] = [];

  if (matches.length === 0) {
    const diagnostico = criarJoinDiagnostico(
      "grupo2_cd5",
      chave,
      0,
      false,
      "cd5_null",
      "aviso",
      "Produto sem correspondência no Grupo 2 / CD5",
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("grupo2_ausente", "Produto sem correspondência no Grupo 2 / CD5"));
    return { cd5: null, alertas, diagnostico };
  }

  if (matches.length > 1) {
    const diagnostico = criarJoinDiagnostico(
      "grupo2_cd5",
      chave,
      matches.length,
      true,
      "cd5_null_ambiguo",
      "aviso",
      `Ambiguidade CD5: ${matches.length} correspondências para ${chave}`,
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("cd5_ambiguo", diagnostico.mensagem, "aviso"));
    return { cd5: null, alertas, diagnostico };
  }

  const diagnostico = criarJoinDiagnostico(
    "grupo2_cd5",
    chave,
    1,
    true,
    "cd5_unico",
    "info",
    "CD5 encontrado",
  );
  diagnosticos.push(diagnostico);
  return { cd5: matches[0], alertas, diagnostico };
}

export function joinInventario(
  loja: number,
  seqproduto: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): { inventario: MotorInventarioAgrupado | null; alertas: MotorAlerta[] } {
  const chave = chaveLojaProduto(loja, seqproduto);
  const found = indexes.inventarioPorLojaProduto.get(chave) ?? null;
  const alertas: MotorAlerta[] = [];

  diagnosticos.push(
    criarJoinDiagnostico(
      "inventario",
      chave,
      found ? 1 : 0,
      found != null,
      found ? "inventario_encontrado" : "inventario_null",
      found ? "info" : "aviso",
      found ? "Inventário encontrado" : "Inventário ausente para loja/produto",
    ),
  );

  if (!found) alertas.push(alerta("inventario_ausente", "Inventário ausente para loja/produto"));
  return { inventario: found, alertas };
}

export function joinValidacao(
  loja: number,
  seqproduto: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): { validacao: MotorLinhaValidacao | null; alertas: MotorAlerta[] } {
  const chave = chaveLojaProduto(loja, seqproduto);
  const found = indexes.validacaoPorLojaProduto.get(chave) ?? null;
  const alertas: MotorAlerta[] = [];

  diagnosticos.push(
    criarJoinDiagnostico(
      "validacao",
      chave,
      found ? 1 : 0,
      found != null,
      found ? "validacao_encontrada" : "validacao_null",
      found ? "info" : "aviso",
      found ? "Validação encontrada" : "Validação ausente para loja/produto",
    ),
  );

  if (!found) alertas.push(alerta("validacao_ausente", "Validação ausente para loja/produto"));
  return { validacao: found, alertas };
}

export function joinRede(
  codFornecedor: number | null,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): MotorJoinRedeResultado {
  const alertas: MotorAlerta[] = [];
  const chave = codFornecedor != null ? String(codFornecedor) : "null";

  if (codFornecedor == null || !Number.isFinite(codFornecedor)) {
    const diagnostico = criarJoinDiagnostico(
      "rede",
      chave,
      0,
      false,
      "rede_null",
      "aviso",
      "Fornecedor ausente — rede não resolvida",
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("rede_ausente", diagnostico.mensagem));
    return { rede: null, alertas, diagnostico };
  }

  const nomes = indexes.redePorFornecedor.get(codFornecedor) ?? [];
  const catalogoMatch = nomes.length > 0;

  if (nomes.length > 1) {
    const diagnostico = criarJoinDiagnostico(
      "rede",
      chave,
      nomes.length,
      true,
      "rede_ambigua",
      "erro",
      `Fornecedor ${codFornecedor} com ${nomes.length} NOME_REC distintos`,
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("catalogo_duplicado", diagnostico.mensagem, "erro"));
    return { rede: null, alertas, diagnostico };
  }

  if (nomes.length === 1) {
    const diagnostico = criarJoinDiagnostico(
      "rede",
      chave,
      1,
      true,
      "rede_nome_rec",
      "info",
      `Rede resolvida via NOME_REC: ${nomes[0]}`,
    );
    diagnosticos.push(diagnostico);
    return { rede: nomes[0], alertas, diagnostico };
  }

  const diagnostico = criarJoinDiagnostico(
    "rede",
    chave,
    0,
    false,
    "rede_null",
    "aviso",
    `Fornecedor ${codFornecedor} sem NOME_REC em Rede.txt`,
  );
  diagnosticos.push(diagnostico);
  alertas.push(alerta("rede_ausente", diagnostico.mensagem));
  return { rede: null, alertas, diagnostico };
}

export function joinBandeira(
  loja: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): MotorJoinBandeiraResultado {
  const chave = String(loja);
  const bandeira = indexes.bandeiraPorLoja.get(loja) ?? null;
  const alertas: MotorAlerta[] = [];

  diagnosticos.push(
    criarJoinDiagnostico(
      "bandeira",
      chave,
      bandeira ? 1 : 0,
      bandeira != null,
      bandeira ? "bandeira_encontrada" : "bandeira_null",
      bandeira ? "info" : "aviso",
      bandeira ? `Bandeira: ${bandeira}` : `Loja ${loja} sem bandeira no catálogo`,
    ),
  );

  if (!bandeira) alertas.push(alerta("bandeira_ausente", `Loja ${loja} sem bandeira no catálogo`));
  return { bandeira, alertas, diagnostico: diagnosticos[diagnosticos.length - 1]! };
}

export function joinOrdemCd(
  bandeira: string | null,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): { ordem: { cd1: number; cd2: number; cd3: number; cd4: number; cd5: number } | null; alertas: MotorAlerta[] } {
  const alertas: MotorAlerta[] = [];
  if (!bandeira) {
    diagnosticos.push(
      criarJoinDiagnostico("ordem_cd", "null", 0, false, "ordem_null", "aviso", "Ordem CD indisponível sem bandeira"),
    );
    alertas.push(alerta("ordem_cd_ausente", "Ordem CD indisponível sem bandeira"));
    return { ordem: null, alertas };
  }

  const chave = bandeira.trim().toUpperCase();
  const matches = indexes.ordemPorBandeira.get(chave) ?? [];

  if (matches.length === 0) {
    diagnosticos.push(
      criarJoinDiagnostico("ordem_cd", chave, 0, false, "ordem_null", "aviso", `Bandeira ${bandeira} sem ordem de CDs`),
    );
    alertas.push(alerta("ordem_cd_ausente", `Bandeira ${bandeira} sem ordem de CDs`));
    return { ordem: null, alertas };
  }

  if (matches.length > 1) {
    diagnosticos.push(
      criarJoinDiagnostico(
        "ordem_cd",
        chave,
        matches.length,
        true,
        "ordem_ambigua",
        "erro",
        `Bandeira ${bandeira} com ${matches.length} ordens de CD`,
      ),
    );
    alertas.push(alerta("catalogo_duplicado", `Bandeira ${bandeira} com ordens duplicadas no catálogo`, "erro"));
    return { ordem: null, alertas };
  }

  diagnosticos.push(
    criarJoinDiagnostico("ordem_cd", chave, 1, true, "ordem_unica", "info", "Ordem CD encontrada"),
  );
  return { ordem: matches[0], alertas };
}

export function joinComprador(
  rede: string | null,
  produto: MotorProdutoLojaNormalizado,
  catalogoCompradores: Parameters<typeof resolverComprador>[0],
  conflitosComprador: { chave: string }[],
  diagnosticos: MotorJoinDiagnostico[],
): MotorJoinCompradorResultado {
  const alertas: MotorAlerta[] = [];
  const { divisao, setorN2, grupoN3 } = produto.hierarquia;
  const chaveHierarquia =
    rede && divisao && setorN2 && grupoN3
      ? chaveCompradorHierarquia(rede, divisao, setorN2, grupoN3)
      : "incompleta";

  if (!rede) {
    const diagnostico = criarJoinDiagnostico(
      "comprador",
      chaveHierarquia,
      0,
      false,
      "comprador_null",
      "aviso",
      "Comprador indisponível sem rede",
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("comprador_ausente", diagnostico.mensagem));
    return {
      comprador: null,
      origemComprador: null,
      chaveComprador: chaveHierarquia,
      fallbackComprador: false,
      alertas,
      diagnostico,
    };
  }

  const conflito = conflitosComprador.find((c) => c.chave === chaveHierarquia);

  const res = resolverComprador(catalogoCompradores, rede, divisao, setorN2, grupoN3);
  if (res.comprador) {
    const alertasRes: MotorAlerta[] = [];
    if (res.fallbackComprador) {
      alertasRes.push(
        alerta(
          "comprador_fallback_rede_unica",
          `Comprador ${res.comprador} resolvido por rede com comprador único: ${rede}`,
          "info",
        ),
      );
    }
    if (conflito) {
      alertasRes.push(
        alerta(
          "comprador_conflito_correcao",
          `Comprador resolvido via correção para ${chaveHierarquia}`,
          "info",
        ),
      );
    }
    const diagnostico = criarJoinDiagnostico(
      "comprador",
      chaveHierarquia,
      1,
      true,
      res.fallbackComprador ? "comprador_fallback_rede_unica" : "comprador_encontrado",
      "info",
      `Comprador: ${res.comprador}`,
    );
    diagnosticos.push(diagnostico);
    return {
      comprador: res.comprador,
      origemComprador: res.origemComprador,
      chaveComprador: res.chaveComprador,
      fallbackComprador: res.fallbackComprador,
      alertas: alertasRes,
      diagnostico,
    };
  }

  if (conflito) {
    const diagnostico = criarJoinDiagnostico(
      "comprador",
      chaveHierarquia,
      2,
      true,
      "comprador_conflito",
      "erro",
      `Conflito de comprador não resolvido para ${chaveHierarquia}`,
    );
    diagnosticos.push(diagnostico);
    alertas.push(alerta("catalogo_duplicado", diagnostico.mensagem, "erro"));
    return {
      comprador: null,
      origemComprador: null,
      chaveComprador: chaveHierarquia,
      fallbackComprador: false,
      alertas,
      diagnostico,
    };
  }

  const diagnostico = criarJoinDiagnostico(
    "comprador",
    chaveHierarquia,
    0,
    false,
    "comprador_null",
    "aviso",
    res.alertas.join("; "),
  );
  diagnosticos.push(diagnostico);
  alertas.push(alerta("comprador_ausente", res.alertas.join("; ")));
  return {
    comprador: null,
    origemComprador: null,
    chaveComprador: res.chaveComprador,
    fallbackComprador: false,
    alertas,
    diagnostico,
  };
}

export function joinBre(
  loja: number,
  seqproduto: number,
  indexes: MotorConsolidacaoIndexes,
  diagnosticos: MotorJoinDiagnostico[],
): { bre: import("../bre/breTypes.ts").MotorBreItemResultado | null; alertas: MotorAlerta[] } {
  const chave = chaveLojaProduto(loja, seqproduto);
  const found = indexes.brePorLojaProduto.get(chave) ?? null;
  const alertas: MotorAlerta[] = [];

  diagnosticos.push(
    criarJoinDiagnostico(
      "bre",
      chave,
      found ? 1 : 0,
      found != null,
      found ? "bre_encontrado" : "bre_null",
      found ? "info" : "erro",
      found ? "Resultado BRE encontrado" : "Resultado BRE ausente",
    ),
  );

  if (!found) alertas.push(alerta("resultado_bre_ausente", "Resultado BRE ausente para loja/produto", "erro"));
  return { bre: found, alertas };
}

export function chaveProdutoConsolidacao(produto: MotorProdutoLojaNormalizado): string {
  return chaveConsolidacao(produto.regional, produto.loja, produto.seqproduto);
}

export function resolverRedeCatalogo(catalogo: CatalogoRedeFornecedor[], codFornecedor: number): string[] {
  const nomes: string[] = [];
  for (const item of catalogo) {
    if (item.seqPessoa === codFornecedor && item.nomeRede) {
      if (!nomes.includes(item.nomeRede)) nomes.push(item.nomeRede);
    }
  }
  return nomes;
}
