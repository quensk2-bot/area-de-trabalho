import type { CatalogoLoadResult, CatalogoRedeFornecedor } from "./catalogTypes.ts";
import { deduplicar, parseNumero, parseTxtSemicolon, readTxtWin1252 } from "./catalogUtils.ts";

export function parseRede(filePath: string): CatalogoLoadResult<CatalogoRedeFornecedor> {
  const { headers, rows } = parseTxtSemicolon(readTxtWin1252(filePath));
  const erros = [];
  const itensBrutos: CatalogoRedeFornecedor[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const seqPessoa = parseNumero(row[headers.indexOf("SEQPESSOA")] ?? null);
    if (seqPessoa == null) continue;
    itensBrutos.push({
      seqPessoa,
      razao: row[headers.indexOf("RAZAO")]?.trim() ?? "",
      seqRede: parseNumero(row[headers.indexOf("SEQREDE")] ?? null),
      nomeRede: row[headers.indexOf("NOME_REC")]?.trim() ?? null,
    });
  }

  const dedup = deduplicar(itensBrutos, (i) => String(i.seqPessoa));
  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros,
    alertas: dedup.removidas > 0 ? [`${dedup.removidas} duplicata(s) SEQPESSOA removida(s)`] : [],
  };
}

export function resolverRedeFornecedor(
  catalogo: CatalogoRedeFornecedor[],
  codFornecedor: number,
  razaoFallback: string | null,
): string {
  const found = catalogo.find((c) => c.seqPessoa === codFornecedor);
  if (found?.nomeRede) return found.nomeRede;
  return razaoFallback ?? "";
}
