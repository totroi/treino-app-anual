# IronTracker — Hipertrofia Anual

Aplicativo web mobile-first para acompanhamento de treinos de musculação periodizados ao longo dos **12 meses do ano** (divisão **A / B / C**), integrado ao **Google Sheets** e hospedado na **Vercel**.

---

## Principais Funcionalidades

- **Autenticação via Google Sheets (`POST /api/auth`):**
  - Controle de acesso gerenciado diretamente na aba **`Usuarios`** da planilha do Google Sheets.
  - Validação realizada no servidor (Vercel Serverless Function) sem expor a lista de usuários e senhas no navegador.
  - Suporta senhas em texto simples ou hash SHA-256 (`sha256:<hash>`), além de ativação/desativação instantânea (`ativo = SIM` ou `NAO`).
- **Sincronização Inteligente com Cache de Borda (`GET /api/workouts`):**
  - Cache CDN de 5 minutos (`s-maxage=300, stale-while-revalidate=600`), suportando facilmente **100+ usuários diários sem custo** no plano gratuito da Vercel e dentro dos limites do Google Sheets.
  - Fallback completo offline (`src/data/fallbackWorkouts.js`) carregado sob demanda e sincronizado com os 254 exercícios da planilha.
- **Histórico de Cargas Unificado entre Meses:**
  - Normalizador inteligente (`getCanonicalExerciseKey`) que unifica o histórico do mesmo exercício mesmo quando há variações de nome ou prefixo `OPCIONAL` entre meses diferentes.
  - Migração transparente dos dados anteriores do `localStorage` (`gym_tracker_logs`) para o perfil do usuário logado.
  - Indicador de progressão de carga (`+2kg`), preenchimento rápido da última carga com 1 toque, exclusão de lançamentos individuais e **Exportação/Importação de Backup JSON**.
- **UX de Academia:**
  - Barra de progresso da sessão atual (obrigatórios e total).
  - Possibilidade de **reabrir/desmarcar** qualquer exercício concluído individualmente.
  - Chips de filtro rápido por **Grupo Muscular** e botão para **Ocultar/Mostrar Opcionais**.
  - **Cronômetro de Descanso Flutuante** com presets (`15s` Rest-Pause, `30s`, `60s`, `90s`, `120s`, `+15s`) e alerta sonoro via Web Audio API.

---

## Estrutura da Planilha Google Sheets

A planilha base (`1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0`) possui 4 abas:
1. **`Table 1` (`gid: 190965404`):** Base masculina dos 254 exercícios nos 12 meses (13 colunas `A–M`: `Mês`, `Grupo muscular`, `Especificação do grupo muscular`, `Treino`, `Exercício`, `Séries/Reps`, `Cadência`, `Técnica Avançada`, `Modo de execução`, `Observação`, `Descanso`, `Ordem`, `Conexão`).
2. **`Table_Feminino` (`gid: 676096017`):** Base feminina dos 252 exercícios nos 12 meses ("Golden Era Liga Leve • Estética Chun-Li" — ênfase em glúteos, quadríceps, posteriores, panturrilhas e cintura fina com `Stomach Vacuum` em `Ordem = 99` e 32 pares conectados `PAR-N`).
3. **`Usuarios` (`gid: 416797079`):** Controle de acesso e versão (`M` vs `F`) com as colunas:
   - `usuario` | `senha` | `nome` | `ativo` (`SIM`/`NAO`) | `perfil` (`admin`/`user`) | `observacao` | `sexo` (`M` ou `F`)
   - Quando `sexo = F` (ou `Feminino`), o aplicativo ativa automaticamente a periodização `Table_Feminino`, a metodologia feminina no modal de Princípios, a identidade visual rosa em 100% da interface (incluindo Modo Foco OLED e novas silhuetas SVG de glúteos/abdução/passadas/elevação pélvica) e o favicon dinâmico `/favicon-pink.svg`.
4. **`Source References` (`gid: 201829341`):** Referências bibliográficas completas da periodização masculina e feminina.

---

## Como Executar Localmente

```bash
npm install
npm run dev
```

O servidor local do Vite já inclui middleware integrado para responder às rotas `/api/auth` e `/api/workouts?sexo=M|F`.

Para executar a suíte completa de testes E2E (Playwright — 126 casos de teste):

```bash
npm run test:e2e
```
