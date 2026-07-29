export type TipoArquivoRuptura = "grupo_ruptura_1" | "grupo_cds_2" | "validacao_ruptura" | "inventario_lojas";
export type HeaderValidation = { ok: boolean; missing: string[]; extra: string[]; headers: string[] };
export type ParsedTxtRow = { numeroLinha: number; payload: Record<string, string> };
