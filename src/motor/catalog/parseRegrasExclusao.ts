import XLSX from "xlsx";
import type { CatalogoLoadResult, CatalogoRegraExclusao } from "./catalogTypes.ts";
import { deduplicar } from "./catalogUtils.ts";

type SheetRow = Record<string, unknown>;

export function parseRegrasExclusao(filePath: string): CatalogoLoadResult<CatalogoRegraExclusao> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = ["Regras", "DADOS"].find((n) => workbook.Sheets[n]);
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      origem: filePath,
      itens: [],
      quantidadeCarregada: 0,
      duplicatasRemovidas: 0,
      erros: [
        {
          numeroLinha: null,
          campo: "Regras",
          valorOriginal: null,
          codigoErro: "SHEET_AUSENTE",
          mensagem: "Sheet Regras/DADOS não encontrada",
          severidade: "critico",
        },
      ],
      alertas: [],
    };
  }

  const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: null })[0] ?? [];
  const hasStatus = headers.includes("Status");

  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null });
  const itensBrutos: CatalogoRegraExclusao[] = rows.map((r) => ({
    fornecedor: r.Fornecedor != null ? String(r.Fornecedor).trim() : null,
    motivo: r.Motivo != null ? String(r.Motivo).trim() : null,
    categoria: r.Categoria != null ? String(r.Categoria).trim() : null,
    secao: r["Seção"] != null ? String(r["Seção"]).trim() : null,
    loja: r.Loja != null ? Number(r.Loja) : null,
    bandeira: r.Bandeira != null ? String(r.Bandeira).trim() : null,
    status: hasStatus && r.Status != null ? Number(r.Status) : null,
  }));

  const dedup = deduplicar(itensBrutos, (i) =>
    `${i.fornecedor ?? ""}|${i.secao ?? ""}|${i.loja ?? ""}|${i.bandeira ?? ""}`,
  );

  const alertas: string[] = [];
  if (!hasStatus) {
    alertas.push("Coluna Status ausente em Regras definidas.xlsx — regras dependentes de Status permanecem bloqueadas");
  }

  return {
    origem: filePath,
    itens: dedup.itens,
    quantidadeCarregada: dedup.itens.length,
    duplicatasRemovidas: dedup.removidas,
    erros: [],
    alertas,
  };
}
