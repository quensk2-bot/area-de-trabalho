import type { EntradaCatalogoMotor } from "./catalogoArquivosMotor.ts";
import { extensaoArquivo } from "./reconhecerTipoArquivoDrive.ts";

export type ResultadoValidacaoFormato = {
  valido: boolean;
  vazio: boolean;
  formatoInvalido: boolean;
  acimaLimite: boolean;
  avisos: string[];
};

export function validarFormatoArquivoDrive(
  nome: string,
  tamanhoBytes: number | null | undefined,
  entrada: EntradaCatalogoMotor | null,
): ResultadoValidacaoFormato {
  const avisos: string[] = [];
  if (!entrada) {
    return { valido: false, vazio: false, formatoInvalido: true, acimaLimite: false, avisos: ["Arquivo não reconhecido no catálogo MT"] };
  }
  const ext = extensaoArquivo(nome);
  const formatoInvalido = !entrada.formatosPermitidos.includes(ext);
  if (formatoInvalido) avisos.push(`Formato ${ext || "(sem extensão)"} não permitido para ${entrada.tipoArquivo}`);
  const vazio = tamanhoBytes != null && tamanhoBytes === 0;
  if (vazio) avisos.push("Arquivo vazio");
  const acimaLimite = tamanhoBytes != null && tamanhoBytes > entrada.tamanhoMaximoBytes;
  if (acimaLimite) avisos.push(`Tamanho acima do limite (${entrada.tamanhoMaximoBytes} bytes)`);
  const valido = !formatoInvalido && !vazio && !acimaLimite;
  return { valido, vazio, formatoInvalido, acimaLimite, avisos };
}
