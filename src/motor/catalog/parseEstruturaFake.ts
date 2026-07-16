import XLSX from "xlsx";
import type { CatalogoEstruturaFake, CatalogoLoadResult } from "./catalogTypes.ts";

type SheetRow = Record<string, unknown>;

export function parseEstruturaFake(filePath: string): CatalogoLoadResult<CatalogoEstruturaFake> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.includes("Planilha1") ? "Planilha1" : workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { defval: null });

  const itens: CatalogoEstruturaFake[] = rows.map((r) => ({
    bandeira: r.BANDEIRA != null ? String(r.BANDEIRA) : null,
    setor: r.SETOR != null ? String(r.SETOR) : null,
    setor2: r.SETOR2 != null ? String(r.SETOR2) : null,
    rede: r.Rede != null ? String(r.Rede) : null,
    loja: r.LOJA != null ? String(r.LOJA) : null,
    seqproduto: r.SEQPRODUTO != null ? String(r.SEQPRODUTO) : null,
    descricao: r.DESCCOMPLETA != null ? String(r.DESCCOMPLETA) : null,
    estruturaReal: r["Estrura Real"] != null ? String(r["Estrura Real"]) : "Fake",
  }));

  return {
    origem: filePath,
    itens,
    quantidadeCarregada: itens.length,
    duplicatasRemovidas: 0,
    erros: [],
    alertas: ["Estrutura Fake carregada apenas como contexto — append final permanece bloqueado até Fase 2B.2"],
  };
}
