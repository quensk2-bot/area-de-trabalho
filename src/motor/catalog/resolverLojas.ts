/**
 * Resolve lojas por regional+bandeira a partir das fontes disponíveis.
 * Função pura quando opera sobre arquivos; Supabase query para resolução exata.
 *
 * ORDEM DE PRECEDÊNCIA:
 * 1. Supabase app_v7.lojas (service_role) — única fonte com coluna REGIONAL.
 *    Usa createServiceRoleClient() existente no projeto.
 * 2. motor_ordem_cds_padrao.xlsx (aba Bandeira) — catálogo padronizado.
 *    NÃO possui coluna regional — retorna lojas de todas as regionais.
 * 3. Ordem CDs.xlsx (aba Bandeira) — arquivo importado bruto.
 *    NÃO possui coluna regional — retorna lojas de todas as regionais.
 * 4. bandeira.csv — arquivo simples, também sem coluna regional.
 *
 * Usada pelos scripts CLI de geração e publicação regional.
 * Ambos já carregam dotenv/config e têm acesso a SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from "node:fs";
import path from "node:path";
import { parseBandeiraFromCsv } from "./parseOrdemCds.ts";
import { parseBandeiraFromXlsx, fileExists } from "./parseOrdemCds.ts";
import { resolveOrdemCdsPadraoPath } from "./catalogService.ts";
import type { CatalogoLoja } from "../../auth-v7/catalogoLojasTypes.ts";

const RUPTURA_BASE = "C:\\area-de-trabalho-v7\\importar\\RUPTURA";

/**
 * Filtra uma lista de lojas+bandeira por bandeira (prefix match).
 * As bandeiras nos arquivos-fonte podem ter sufixo de estado (ex: "Comper MT").
 *   --bandeira COMPER → match "Comper MT", "Comper DF"
 *   --bandeira FORT   → match "FORT", "Fort MT"
 *   --bandeira ATAC   → match "Atac MS", "Atac SP"
 *
 * NOTA: Apenas o Supabase app_v7.lojas tem coluna regional.
 * Os arquivos .csv/.xlsx NÃO filtram por regional.
 */
function filtrarPorBandeira(
  catalogo: { loja: number; bandeira: string }[],
  bandeira: string,
): { loja: number; bandeira: string }[] {
  const bandeiraNorm = bandeira.toUpperCase().trim();
  return catalogo
    .filter((l) => {
      const b = l.bandeira.toUpperCase().trim();
      // Match exato ou prefixo (ex: "Comper MT" → "COMPER")
      if (b === bandeiraNorm) return true;
      if (b.startsWith(bandeiraNorm)) return true;
      return false;
    })
    .sort((a, b) => a.loja - b.loja);
}

/**
 * Tenta resolver lojas via Supabase app_v7.lojas (service_role).
 * Reusa createServiceRoleClient() existente no projeto.
 * Retorna null se Supabase não estiver disponível ou não retornar dados.
 */
async function resolverLojasViaSupabase(
  regional: string,
  bandeira: string,
): Promise<number[] | null> {
  try {
    const { createServiceRoleClient } = await import(
      "../export/hibrido/publicarStoragePrivado.ts"
    );
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .schema("app_v7")
      .from("lojas")
      .select("loja, bandeira, regional")
      .eq("ativo", true)
      .ilike("regional", regional)
      .ilike("bandeira", `${bandeira}%`);

    if (error) {
      console.warn(`   ⚠️  Supabase lojas: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) return null;

    return data
      .map((r: { loja: number }) => r.loja)
      .filter((l: number) => l > 0)
      .sort((a: number, b: number) => a - b);
  } catch (e) {
    console.warn(`   ⚠️  Supabase service_role indisponível: ${(e as Error).message}`);
    return null;
  }
}

/**
 * Carrega o catálogo de lojas por bandeira a partir de arquivos.
 * Nenhum desses arquivos possui coluna regional.
 */
export function carregarCatalogoLojasBandeira(
  regional: string,
  dataReferencia?: string,
): { loja: number; bandeira: string }[] {
  // 1. motor_ordem_cds_padrao.xlsx — catálogo padronizado (sem regional)
  if (dataReferencia) {
    const padraoPath = resolveOrdemCdsPadraoPath(regional, dataReferencia);
    if (padraoPath && fileExists(padraoPath)) {
      try {
        const result = parseBandeiraFromXlsx(padraoPath);
        if (result.itens.length > 0) {
          return result.itens.map((i) => ({ loja: i.loja, bandeira: i.bandeira }));
        }
      } catch {
        // fallthrough
      }
    }
  }

  // 2. Ordem CDs.xlsx — arquivo importado bruto (sem regional)
  const ordemCdsPath = path.join(RUPTURA_BASE, "Ordem CDs.xlsx");
  if (fileExists(ordemCdsPath)) {
    try {
      const result = parseBandeiraFromXlsx(ordemCdsPath);
      if (result.itens.length > 0) {
        return result.itens.map((i) => ({ loja: i.loja, bandeira: i.bandeira }));
      }
    } catch {
      // fallthrough
    }
  }

  // 3. Fallback: bandeira.csv
  const csvPath = path.join(RUPTURA_BASE, "bandeira.csv");
  if (fileExists(csvPath)) {
    try {
      const result = parseBandeiraFromCsv(csvPath);
      if (result.itens.length > 0) {
        return result.itens.map((i) => ({ loja: i.loja, bandeira: i.bandeira }));
      }
    } catch {
      // fallthrough
    }
  }

  return [];
}

/**
 * Resolve lista de lojas para uma regional+bandeira específica.
 *
 * @param regional — usado para filtrar via Supabase (service_role) ou localizar padronizados
 * @param bandeira — filtro de bandeira (prefix match para arquivos, ilike para Supabase)
 * @param dataReferencia — usado para localizar o diretório padronizado (fallback)
 * @returns array de números de loja, ordenado. Vazio se não encontrar.
 *
 * ORDEM:
 * 1. Supabase app_v7.lojas (única fonte com coluna regional)
 * 2. motor_ordem_cds_padrao.xlsx (filtra apenas por bandeira)
 * 3. Ordem CDs.xlsx / bandeira.csv
 */
export async function resolveLojasFromBandeiraCsv(
  regional: string,
  bandeira: string,
  dataReferencia?: string,
): Promise<number[]> {
  // 1. Tenta Supabase (fonte oficial com coluna regional)
  const viaSupabase = await resolverLojasViaSupabase(regional, bandeira);
  if (viaSupabase !== null && viaSupabase.length > 0) {
    console.log(`   📋 Fonte: Supabase app_v7.lojas — ${viaSupabase.length} loja(s)`);
    return viaSupabase;
  }

  // 2. Fallback: arquivos (sem coluna regional, filtra apenas por bandeira)
  const catalogo = carregarCatalogoLojasBandeira(regional, dataReferencia);
  if (catalogo.length === 0) return [];

  const filtrado = filtrarPorBandeira(catalogo, bandeira);
  console.log(
    `   ⚠️  Fonte: arquivo (sem filtro regional) — ${filtrado.length} loja(s) — Supabase indisponível`,
  );
  return filtrado.map((l) => l.loja).sort((a, b) => a - b);
}

/**
 * Valida se uma lista de lojas é consistente:
 * - sem duplicatas
 * - todas > 0
 */
export function validarListaLojas(lojas: number[]): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  const set = new Set<number>();

  for (const loja of lojas) {
    if (loja <= 0) {
      erros.push(`Loja inválida: ${loja}`);
      continue;
    }
    if (set.has(loja)) {
      erros.push(`Loja duplicada: ${loja}`);
    }
    set.add(loja);
  }

  return { ok: erros.length === 0, erros };
}
