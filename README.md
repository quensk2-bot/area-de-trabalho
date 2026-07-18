# ADM — Motor Operacional V7

Repositório do Motor Operacional V7 (ruptura regional) e shell React/Vite.

## Motor V7 — comandos

```bash
npm run motor:test              # 562 testes
npm run motor:piloto            # piloto MT loja 73
npm run motor:revalidacao       # revalidação Excel × V7
npm run motor:piloto-revalidar  # piloto + revalidação em uma execução
npm run motor:persistencia-teste          # teste remoto TESTE (via RPC)
npm run motor:persistencia-teste-atomico  # 20 cenários RPC atomica
npm run motor:persistencia-teste-chunks   # teste remoto chunks TESTE/2099-01-16
npm run motor:persistencia-carga-piloto-mt  # carga piloto MT loja 73 (chunks)
npm run build
```

Documentação: `architecture/motor-operacional-v7/`

### Fase 3A — Data Mart (publicação, sem banco)

Módulo `src/motor/datamart/` — pipeline `executarPipelineDm()` mapeia `MotorProdutoLojaConsolidado` → `dm_produto_loja` + `dm_produto_loja_cd` (cds[] N posições). Ver `FASE-3A-DATAMART.md`.

### Fase 3C — Persistência em chunks

`persistirLoteMotorChunked()` → RPCs PostgreSQL em chunks de 500 produtos. Ver `FASE-3C-PERSISTENCIA-CHUNKS-CARGA-PILOTO.md`.

### Fase 3B.2 — Persistência atômica (RPC)

`persistirLoteMotorAtomico()` → RPC PostgreSQL `persistir_lote_motor_v1`. Ver `FASE-3B2-PERSISTENCIA-ATOMICA.md`.

### Fase 3B.1 — Persistência controlada

Módulo `src/motor/persistencia/` — `persistirLoteMotor()` grava `motor_v7.*` via service_role. Ver `FASE-3B1-PERSISTENCIA-CONTROLADA.md`.

### Fase 3B — Auditoria persistência

Gap código × banco auditado e resolvido na 3B.1 — ver `FASE-3B-AUDITORIA-PERSISTENCIA.md`.

### Estado atual (main)

| Commit | Descrição |
|--------|-----------|
| `4f0cb38` | Orquestrador piloto + revalidação |
| `3d65b28` | Comparador e exportação CDs dinâmicos |
| `c94a171` | Consolidador cds[] |

Piloto MT loja 73: **APROVADO COM RESSALVAS** — paridade 8.274, 0 CD estrutural, baseline Comprador/BRE/Rede preservado.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
