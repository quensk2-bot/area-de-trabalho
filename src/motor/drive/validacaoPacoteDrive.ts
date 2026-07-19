import { calcularHashMetadadosPacoteFromLinhas } from "./hashMetadadosPacote.ts";
import type { EntradaCatalogoMotor, StatusArquivoPacote, TipoArquivoMotor } from "./catalogoArquivosMotor.ts";
import { CATALOGO_ARQUIVOS_MOTOR_MT } from "./catalogoArquivosMotor.ts";
import { classificarTamanhoArquivoDrive } from "./classificarTamanhoArquivoDrive.ts";
import { extensaoArquivo, reconhecerTipoArquivoDrive } from "./reconhecerTipoArquivoDrive.ts";
import { normalizarNomeArquivoDrive } from "./normalizarNomeArquivoDrive.ts";
import { validarFormatoArquivoDrive } from "./validarFormatoArquivoDrive.ts";

export type ArquivoDriveRemotoEntrada = {
  driveFileId: string;
  nome: string;
  mimeType: string | null;
  tamanhoBytes: number | null;
  modifiedTime: string | null;
  md5Checksum: string | null;
  webViewLink?: string | null;
};

export type ArquivoPacoteDriveClassificado = ArquivoDriveRemotoEntrada & {
  driveFolderId?: string;
  tipoArquivo: TipoArquivoMotor | null;
  nomeNormalizado: string;
  extensao: string;
  obrigatorio: boolean;
  reconhecido: boolean;
  duplicado: boolean;
  vazio: boolean;
  precisaPadronizacao: boolean;
  ordemProcessamento: number | null;
  categoriaTamanho: ReturnType<typeof classificarTamanhoArquivoDrive>;
  parserDestino: string | null;
  motorEtapa: string | null;
  status: StatusArquivoPacote;
  observacao: string | null;
  avisos: string[];
};

export type ResumoPacoteDrive = {
  quantidadeEsperados: number;
  quantidadeEncontrados: number;
  quantidadeValidos: number;
  quantidadeFaltantes: number;
  quantidadeDuplicidades: number;
  quantidadeDesconhecidos: number;
  quantidadePequenos: number;
  quantidadeMedios: number;
  quantidadeGrandes: number;
  tamanhoTotalBytes: number;
  pacoteCompleto: boolean;
  faltantes: TipoArquivoMotor[];
  avisos: string[];
  status: string;
};

export type DiagnosticoPacoteDrive = {
  todosObrigatoriosEncontrados: "ok" | "warn" | "fail";
  nenhumDuplicado: "ok" | "fail";
  nenhumVazio: "ok" | "fail";
  formatosValidos: "ok" | "fail";
  catalogoCompativel: "ok" | "warn" | "fail";
  competenciaCoerente: "ok" | "warn";
  pastaCadastrada: "ok" | "fail";
  pacoteNaoProcessadoAnteriormente: "ok" | "warn";
  metadadosIntegros: "ok" | "fail";
  aptoValidacao: "ok" | "warn" | "fail";
  itens: Array<{ rotulo: string; estado: "ok" | "warn" | "fail"; detalhe?: string }>;
};

function mapStatus(
  entrada: EntradaCatalogoMotor | null,
  validacao: ReturnType<typeof validarFormatoArquivoDrive>,
  duplicado: boolean,
): StatusArquivoPacote {
  if (duplicado) return "duplicado";
  if (!entrada) return "desconhecido";
  if (validacao.vazio) return "vazio";
  if (validacao.formatoInvalido || validacao.acimaLimite) return "invalido";
  return "reconhecido";
}

export function classificarArquivosPacoteDrive(
  arquivos: ArquivoDriveRemotoEntrada[],
  driveFolderId: string,
  catalogo: readonly EntradaCatalogoMotor[] = CATALOGO_ARQUIVOS_MOTOR_MT,
): ArquivoPacoteDriveClassificado[] {
  const porTipo = new Map<TipoArquivoMotor, number>();
  return arquivos.map((a) => {
    const entrada = reconhecerTipoArquivoDrive(a.nome, catalogo);
    const validacao = validarFormatoArquivoDrive(a.nome, a.tamanhoBytes, entrada);
    const avisos = [...validacao.avisos];
    let duplicado = false;
    if (entrada) {
      const count = (porTipo.get(entrada.tipoArquivo) ?? 0) + 1;
      porTipo.set(entrada.tipoArquivo, count);
      if (count > 1 && !entrada.permiteMaisDeUm) {
        duplicado = true;
        avisos.push("Mais de um arquivo para o mesmo tipo");
      }
    }
    const status = mapStatus(entrada, validacao, duplicado);
    return {
      ...a,
      driveFolderId,
      tipoArquivo: entrada?.tipoArquivo ?? null,
      nomeNormalizado: normalizarNomeArquivoDrive(a.nome),
      extensao: extensaoArquivo(a.nome),
      obrigatorio: !!entrada?.obrigatorio,
      reconhecido: status === "reconhecido",
      duplicado,
      vazio: validacao.vazio,
      precisaPadronizacao: !!entrada?.precisaPadronizacao,
      ordemProcessamento: entrada?.ordemProcessamento ?? null,
      categoriaTamanho: classificarTamanhoArquivoDrive(a.tamanhoBytes),
      parserDestino: entrada?.parserDestino ?? null,
      motorEtapa: entrada?.motorEtapa ?? null,
      status,
      observacao: avisos.length ? avisos.join("; ") : null,
      avisos,
    };
  });
}

export function calcularResumoPacote(
  classificados: ArquivoPacoteDriveClassificado[],
  catalogo: readonly EntradaCatalogoMotor[] = CATALOGO_ARQUIVOS_MOTOR_MT,
): ResumoPacoteDrive {
  const obrigatorios = catalogo.filter((c) => c.obrigatorio);
  const reconhecidos = classificados.filter((a) => a.status === "reconhecido");
  const tiposOk = new Set(reconhecidos.map((a) => a.tipoArquivo).filter(Boolean));
  const faltantes = obrigatorios.filter((c) => !tiposOk.has(c.tipoArquivo)).map((c) => c.tipoArquivo);
  const avisos: string[] = [];
  const desconhecidos = classificados.filter((a) => a.status === "desconhecido").length;
  const duplicidades = classificados.filter((a) => a.duplicado || a.status === "duplicado").length;
  if (desconhecidos > 0) avisos.push(`${desconhecidos} arquivo(s) desconhecido(s) no pacote.`);
  if (duplicidades > 0) avisos.push(`${duplicidades} duplicidade(s) detectada(s).`);
  const pequenos = classificados.filter((a) => a.categoriaTamanho === "pequeno").length;
  const medios = classificados.filter((a) => a.categoriaTamanho === "medio").length;
  const grandes = classificados.filter((a) => a.categoriaTamanho === "grande").length;
  const tamanhoTotalBytes = classificados.reduce((acc, a) => acc + (a.tamanhoBytes ?? 0), 0);
  const pacoteCompleto = faltantes.length === 0 && duplicidades === 0 && !classificados.some((a) => a.status === "vazio" || a.status === "invalido");
  const status = pacoteCompleto ? "pronto_validacao" : faltantes.length > 0 ? "incompleto" : "invalido";
  return {
    quantidadeEsperados: obrigatorios.length,
    quantidadeEncontrados: classificados.length,
    quantidadeValidos: reconhecidos.length,
    quantidadeFaltantes: faltantes.length,
    quantidadeDuplicidades: duplicidades,
    quantidadeDesconhecidos: desconhecidos,
    quantidadePequenos: pequenos,
    quantidadeMedios: medios,
    quantidadeGrandes: grandes,
    tamanhoTotalBytes,
    pacoteCompleto,
    faltantes,
    avisos,
    status,
  };
}

export function calcularHashMetadadosPacote(classificados: ArquivoPacoteDriveClassificado[]): string {
  const linhas = [...classificados]
    .filter((a) => a.status !== "faltante")
    .sort((a, b) => {
      const ta = a.tipoArquivo ?? "zzz";
      const tb = b.tipoArquivo ?? "zzz";
      if (ta !== tb) return ta.localeCompare(tb);
      return a.driveFileId.localeCompare(b.driveFileId);
    })
    .map(
      (a) =>
        `${a.tipoArquivo ?? ""}|${a.driveFileId}|${a.nomeNormalizado}|${a.modifiedTime ?? ""}|${a.tamanhoBytes ?? ""}|${a.md5Checksum ?? ""}`,
    );
  return calcularHashMetadadosPacoteFromLinhas(linhas);
}

export function hashReduzido(hash: string | null | undefined): string {
  if (!hash) return "—";
  return hash.slice(0, 6).toUpperCase();
}

export function determinarStatusPacote(resumo: ResumoPacoteDrive, hashDuplicado: boolean): string {
  if (hashDuplicado) return "duplicado";
  return resumo.status;
}

export function montarDiagnosticoPacote(input: {
  resumo: ResumoPacoteDrive;
  pastaCadastrada: boolean;
  competenciaDivergente?: boolean;
  pacoteDuplicado?: boolean;
  hashAlteradoPosValidacao?: boolean;
}): DiagnosticoPacoteDrive {
  const { resumo } = input;
  const item = (rotulo: string, estado: "ok" | "warn" | "fail", detalhe?: string) => ({ rotulo, estado, detalhe });
  const itens = [
    item("Todos os arquivos obrigatórios encontrados", resumo.quantidadeFaltantes === 0 ? "ok" : "fail", resumo.faltantes.join(", ") || undefined),
    item("Nenhum arquivo duplicado", resumo.quantidadeDuplicidades === 0 ? "ok" : "fail"),
    item("Nenhum arquivo vazio", resumo.quantidadeValidos === resumo.quantidadeEncontrados - resumo.quantidadeDesconhecidos ? "ok" : "fail"),
    item("Todos os formatos válidos", resumo.status !== "invalido" ? "ok" : "fail"),
    item("Catálogo compatível", resumo.quantidadeDesconhecidos === 0 ? "ok" : "warn", resumo.quantidadeDesconhecidos ? `${resumo.quantidadeDesconhecidos} desconhecido(s)` : undefined),
    item("Competência coerente", input.competenciaDivergente ? "warn" : "ok", input.competenciaDivergente ? "Competência informada difere do mês físico da pasta cadastrada." : undefined),
    item("Pasta cadastrada", input.pastaCadastrada ? "ok" : "fail"),
    item("Pacote não processado anteriormente", input.pacoteDuplicado ? "warn" : "ok"),
    item("Metadados íntegros", input.hashAlteradoPosValidacao ? "warn" : "ok"),
    item(
      "Apto para validação",
      resumo.pacoteCompleto && !input.pacoteDuplicado ? "ok" : resumo.pacoteCompleto ? "warn" : "fail",
    ),
  ];
  const pick = (estado: "ok" | "warn" | "fail") => estado;
  return {
    todosObrigatoriosEncontrados: pick(itens[0]!.estado),
    nenhumDuplicado: pick(itens[1]!.estado),
    nenhumVazio: pick(itens[2]!.estado),
    formatosValidos: pick(itens[3]!.estado),
    catalogoCompativel: pick(itens[4]!.estado),
    competenciaCoerente: pick(itens[5]!.estado),
    pastaCadastrada: pick(itens[6]!.estado),
    pacoteNaoProcessadoAnteriormente: pick(itens[7]!.estado),
    metadadosIntegros: pick(itens[8]!.estado),
    aptoValidacao: pick(itens[9]!.estado),
    itens,
  };
}

/** Compat 4C.1 */
export type ArquivoDriveListado = ArquivoPacoteDriveClassificado;
export function classificarArquivosListados(
  arquivos: ArquivoDriveRemotoEntrada[],
  catalogo = CATALOGO_ARQUIVOS_MOTOR_MT,
): ArquivoPacoteDriveClassificado[] {
  return classificarArquivosPacoteDrive(arquivos, "", catalogo);
}
export function resumoCatalogoMt(classificados: ArquivoPacoteDriveClassificado[]) {
  const r = calcularResumoPacote(classificados);
  return {
    esperados: r.quantidadeEsperados,
    encontrados: r.quantidadeValidos,
    faltantes: r.faltantes,
    desconhecidos: r.quantidadeDesconhecidos,
    duplicados: r.quantidadeDuplicidades,
    pacoteCompleto: r.pacoteCompleto,
  };
}
