export type { PilotOpcoes, PilotResultado } from "./pilotTypes.ts";
export { resolvePilotFilePaths, defaultPilotOutputDir } from "./pilotFilePaths.ts";
export { executarPiloto } from "./pilotRunner.ts";
export {
  filtroLojaGrupo1,
  filtroProdutosGrupo2,
  filtroLojaInventario,
  extrairSeqprodutosGrupo1,
} from "./pilotStoreFilter.ts";
export { selecionarAmostraEstratificada, ESTRATOS_PILOTO } from "./pilotSampleSelector.ts";
