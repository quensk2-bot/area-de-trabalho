# MT/COMPER — Homologação com Ressalvas

**Decisão:** APROVADO COM RESSALVAS · Gate 10 congelado em `V7-RUPTURA-MT-1.0`  
**Data:** 2026-07-20  
**Escopo:** Regional MT · Bandeira COMPER · 15 lojas · 176.683 produtos V7

---

## Ressalva oficial

> O V7 processa o universo integral dos arquivos TXT. A planilha oficial Excel pode apresentar quantidade menor de produtos por filtros, Base Limpa e materializações do Power Query. As comparações de regras devem considerar a interseção válida de chaves.

---

## Critérios de aceite

| Critério | Resultado esperado | Status |
|----------|-------------------|--------|
| Divergências críticas **novas** (fora baseline) | 0 | ✅ |
| CDs estruturais | 0 | ✅ |
| Produtos somente Excel | 0 | ✅ |
| Regras CP/MP/LP na interseção | Baseline Comprador/BRE/Rede documentado | ✅ com ressalva |
| Diferença de universo V7 × Excel | Documentada (produtos só V7) | ✅ aceita |

---

## Classificação agregada (15 lojas)

| Categoria | Descrição | Tratamento |
|-----------|-----------|------------|
| **Interseção** | Chaves `loja\|seqproduto` presentes em V7 e Excel | Base válida para comparar regras |
| **Somente V7** | Produtos no TXT integral ausentes do Excel filtrado | **Justificada** — universo maior do motor |
| **Somente Excel** | Produtos no Excel ausentes do V7 | **Deve ser 0** — nenhuma chave órfã Excel |
| **Críticas novas** | Divergências fora Comprador/BRE/Rede/CD | **0** — gate aprovado |
| **Justificadas** | Comprador (correção PQ), BRE (classificação prazo), Rede (1 caso piloto) | Aceitas com ressalva |
| **Informativas** | Deltas ≤ 3 unidades em métricas agregadas | Monitoramento |
| **Campos ausentes V7** | 22 colunas percentuais/sku derivados do PQ | Documentadas na BASE (`CAMPOS_AUSENTES_V7`) |

Valores numéricos atualizados em `homologacao_comper_mt.json` (`.tmp` e `architecture/hibrido-v7/`).

| Métrica agregada (15 lojas) | Valor |
|----------------------------|-------|
| Interseção válida | **129.828** chaves |
| Somente V7 | **46.855** produtos |
| Somente Excel | **0** |
| Críticas novas | **0** |
| Justificadas (Comprador+BRE+Rede) | **10.762** |
| CDs estruturais | **0** |

---

## Tabela de ressalvas

| Causa | Impacto | Aceitação | Responsável | Ação futura |
|-------|---------|-----------|-------------|-------------|
| Universo TXT integral vs Excel filtrado (Base Limpa / PQ) | V7 processa ~176k produtos; Excel regional ~131k na interseção agregada; milhares só V7 por loja | **Aceita** — não reduzir V7 artificialmente | Motor V7 / Negócio Ruptura | Documentar filtros PQ oficiais; opcional export filtrado para conferência |
| Comprador — join hierárquico vs materialização PQ | Divergências na interseção (pares TERCIO↔AGNALDO etc.) | **Aceita** — baseline Fase 2E.3.8 | Catálogo Compradores / PQ | Auditar aba CORREÇÃO e sincronizar catálogo |
| BRE — classificação CP vs MP (`pendenciaCpaCd`, estoque CD) | ~46 produtos/loja padrão CP→MP na interseção | **Aceita** — regra V7 auditada | Motor V7 / Regras | Alinhar gate Excel se política mudar |
| Rede — join `Rede.txt` por SEQPESSOA | 1 divergência histórica loja 73 | **Aceita** | Cadastro Rede | Validar cadastro na próxima competência |
| Colunas ausentes V7 (%, Sku´s, fórmulas PQ) | 22 colunas vazias na BASE exportada | **Aceita** — escopo híbrido JSON | Export BASE | Implementar somente se negócio exigir paridade visual Excel |
| Bloqueados (`Status Estoque CDs`) — Excel zera contagem | Delta agregado alto vs V7 (Excel não materializa bloq da mesma forma) | **Aceita na comparação agregada** | Homologação | Comparar bloq apenas na interseção campo a campo |
| Publicação multi-loja Storage | 15 lojas + manifest + dashboards | **Aceita** após validação Gate 3 | H6/H9 híbrido | Expandir FORT somente após gate regional equivalente |

---

## Referências

- `architecture/motor-operacional-v7/FASE-2E38-DIAGNOSTICO-FINAL-DIVERGENCIAS.md`
- `architecture/hibrido-v7/MT-OPERACAO-COMPLETA.md`
- `src/motor/scripts/homologacaoComperMt.ts`
- `homologacao_comper_mt.json`

---

## Decisão final

**MT/COMPER APROVADO COM RESSALVAS E CONGELADO NA VERSÃO 1.0** (`V7-RUPTURA-MT-1.0`).

Não exigir redução artificial do universo V7 para igualar totais Excel. Homologação de regras permanece restrita à **interseção válida de chaves**.
