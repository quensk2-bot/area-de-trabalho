import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "catalog");

export function catalogFixturePath(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

export function ensureCatalogFixtures(): {
  rede: string;
  compradores: string;
  ordemCds: string;
  plan6: string;
  regras: string;
} {
  if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  const redePath = catalogFixturePath("rede_sample.txt");
  if (!fs.existsSync(redePath)) {
    fs.writeFileSync(
      redePath,
      "SEQPESSOA;RAZAO;SEQREDE;NOME_REC\n1001;FORN A;10;REDE ALPHA\n1002;FORN B;;\n1003;FORN C;20;REDE GAMMA\n",
      "utf8",
    );
  }

  const compradoresPath = catalogFixturePath("compradores_sample.xlsx");
  if (!fs.existsSync(compradoresPath)) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { REDE: "REDE ALPHA", "SEÇÃO": "MERCEARIA", "NIVEL 2": "BEBIDAS", "NIVEL 3": "REFRIGERANTES", COMPRADOR: "JOAO" },
        { REDE: "REDE GAMMA", "SEÇÃO": "PERFUMARIA", "NIVEL 2": "HIGIENE", "NIVEL 3": "SABONETE", COMPRADOR: "MARIA" },
      ]),
      "Compradores",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Rede: "REDE ALPHA", SETOR: "MERCEARIA", SETOR2: "BEBIDAS", CATEGORIA: "REFRIGERANTES", COMPRADOR: "JOAO_CORR" },
      ]),
      "Compradores Rede",
    );
    XLSX.writeFile(wb, compradoresPath);
  }

  const ordemPath = catalogFixturePath("ordem_cds_sample.xlsx");
  if (!fs.existsSync(ordemPath)) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { DIVISÃO: "NORDESTE", BANDEIRA: "FORT", UF: "PE", "1º": 101, "2º": 102, "3º": 103, "4º": 104, "5º": 105 },
      ]),
      "Ordem",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { LOJA: 103, BANDEIRA: "FORT", "TIPO LOJA": "COMPACTA" },
        { LOJA: 104, BANDEIRA: "FORT", "TIPO LOJA": "PADRAO" },
      ]),
      "Bandeira",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ DIVISÃO: "NORDESTE", BANDEIRA: "FORT", UF: "PE", CD: 101, ORDEM: "1º" }]),
      "Sequência",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Modalidade: "CD Cesta Basica (Armazenagem)", "Tipo Loja": "COMPACTA" },
        { Modalidade: "CD Fort Compacto (Armazenagem)", "Tipo Loja": "PADRAO" },
      ]),
      "Modalidade",
    );
    XLSX.writeFile(wb, ordemPath);
  }

  const plan6Path = catalogFixturePath("plan6_sample.txt");
  if (!fs.existsSync(plan6Path)) {
    const headers = [
      "CODIGO",
      "DESCRICAO",
      "MODALIDADECD",
      "COL3",
      "COL4",
      "COL5",
      "COL6",
      "COL7",
      "COL8",
      "COL9",
      "COL10",
      "COL11",
      "COL12",
      "COL13",
      "COL14",
      "COL15",
      "COL16",
      "COL17",
      "COL18",
      "COL19",
      "COL20",
      "COL21",
      "COL22",
      "COL23",
      "COL24",
      "COL25",
      "COL26",
      "COL27",
      "COL28",
      "COL29",
      "COL30",
      "COL31",
      "COL32",
      "COL33",
      "COL34",
      "COL35",
    ];
    const rowComum = headers.map((h) => (h === "CODIGO" ? "9001" : h === "DESCRICAO" ? "PROD COMUM" : h === "MODALIDADECD" ? "CD PADRAO" : "")).join(";");
    const rowExclusivo = headers.map((h) =>
      h === "CODIGO" ? "9002" : h === "DESCRICAO" ? "PROD EXCLUSIVO" : h === "MODALIDADECD" ? "CD Cesta Basica (Armazenagem)" : "",
    ).join(";");
    const rowExclusivoG = headers.map((h) =>
      h === "CODIGO" ? "9003" : h === "DESCRICAO" ? "PROD EXCLUSIVO G" : h === "MODALIDADECD" ? "CD Fort Compacto (Armazenagem)" : "",
    ).join(";");
    fs.writeFileSync(plan6Path, `${headers.join(";")}\n${rowComum}\n${rowExclusivo}\n${rowExclusivoG}\n`, "utf8");
  }

  const regrasPath = catalogFixturePath("regras_sample.xlsx");
  if (!fs.existsSync(regrasPath)) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Fornecedor: "FORN A", Motivo: "TESTE", Categoria: "CAT", "Seção": "MERCEARIA", Loja: 103, Bandeira: "FORT", Status: 1 },
      ]),
      "Regras",
    );
    XLSX.writeFile(wb, regrasPath);
  }

  return {
    rede: redePath,
    compradores: compradoresPath,
    ordemCds: ordemPath,
    plan6: plan6Path,
    regras: regrasPath,
  };
}
