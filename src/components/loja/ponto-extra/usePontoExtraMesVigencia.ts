import { useCallback, useState } from "react";
import { currentMonthKey, isMesVigenciaValido } from "./pontoExtraSharedUtils";
import { getMesVigenciaPersistido, setMesVigenciaPersistido } from "./pontoExtraWorkflow";

export function usePontoExtraMesVigencia() {
  const [mesVigencia, setMesVigenciaState] = useState(getMesVigenciaPersistido);

  const setMesVigencia = useCallback((value: string) => {
    const mes = isMesVigenciaValido(value) ? value : currentMonthKey();
    setMesVigenciaPersistido(mes);
    setMesVigenciaState(mes);
  }, []);

  return { mesVigencia, setMesVigencia };
}
