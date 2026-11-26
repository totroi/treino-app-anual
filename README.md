# IronTracker — Hipertrofia Anual

Aplicativo web PWA mobile-first (Dark OLED Blue & Pink Chun-Li) para acompanhamento de treinos de musculação periodizados ao longo dos **12 meses do ano** (divisão **A / B / C**), integrado ao **Google Sheets** e hospedado na **Vercel** com custo zero.

---

## Principais Funcionalidades

- **Autenticação via Google Sheets (`POST /api/auth`):**
  - Controle de acesso gerenciado diretamente na aba **`Usuarios`** da planilha do Google Sheets.
  - Validação realizada no servidor (Vercel Serverless Function) com tokens assinados HMAC-SHA256 (`verifySignedToken`) sem expor a lista de usuários no navegador.
  - Suporta senhas em texto simples ou hash SHA-256 (`sha256:<hash>`), além de ativação/desativação instantânea (`ativo = SIM` ou `NAO`).
- **Sincronização Inteligente com Cache de Borda (`GET /api/workouts`):**
  - Cache CDN de 1 hora (`s-maxage=3600, stale-while-revalidate=86400`), suportando facilmente **100+ usuários diários sem custo** no plano gratuito da Vercel e dentro dos limites do Google Sheets.
  - Fallbacks completos offline (`src/data/fallbackWorkouts.js` com **227 exercícios** masculinos e `src/data/fallbackWorkoutsFemale.js` com **252 exercícios** femininos), 100% sincronizados 1:1 com a planilha e os 24 guias mensais.
- **Leitor Interno Offline de Guias Mensais (Dark OLED):**
  - Todos os **24 guias mensais** (12 Masculinos + 12 Femininos) embarcados como Markdown em chunks lazy por sexo (`src/content/guides/{male,female}/*.md`), renderizados internamente no tema Dark OLED com sumário rápido e zero requisições extras à Vercel.
- **Atualização PWA no App (R1) & Persistência Local Blindada (R2):**
  - Botão **`Atualizar App Agora`** no menu de perfil + indicador visual no cabeçalho (`SKIP_WAITING` + versão por hash SHA-256 real em `sw.js`), eliminando a necessidade de remover e readicionar o ícone da tela de início.
  - **Persistência local dupla (`localStorage` + `IndexedDB` 2 gerações + `navigator.storage.persist()` + tombstones):** protege os PRs e o histórico contra limpezas parciais de cache do navegador, sem perder registros após atualizações do PWA.
- **Cronômetro de Descanso *Music-First* com 3 Níveis de Volume (R3):**
  - Presets (`10s` Rest-Pause Mentzer, `30s`, `60s`, `90s`, `120s`, `±15s`) e alerta sonoro via motor primário **WAV `<audio>`** (compatível com tela bloqueada iOS/Android sem derrubar Spotify/YouTube Music, fallback Web Audio API) com seletor persistente de volume **Baixo / Médio / Alto**.
- **Modo Eco OLED Enriquecido & 47 Silhuetas SVG Personalizadas (R6 / R7):**
  - **47 arquétipos SVG distintos** cobrindo todos os 186 exercícios únicos (diferenciando `Crucifixo` vs `Supino`, `Gêmeos no Leg Press` vs `Leg Press`, `Mesa Flexora` vs `Extensora` vs `Adutora`, etc.).
  - Tela **Ultra Eco OLED (Stage 2)** exibindo **Cadência**, Séries/Reps, Descanso, Ordem, Especificação, Última/PR e Técnica Avançada, mantendo >92% `#000000`; Stage 1 com preenchimento rápido de **PR** e acordeão **Execução & Nota**.
- **Painel Admin de Tracking Agregado Anônimo (R5):**
  - Exclusivo para usuários `perfil = admin` no menu de perfil (`GET/POST /api/tracking`), consolidando acessos/dia, sessões simultâneas (janela de 15 min), regiões aproximadas via cabeçalhos de borda da Vercel (sem armazenar IP bruto ou PII) e média de exercícios concluídos nas abas **`Tracking_Historico`** e **`Tracking_Sessoes_Ativas`**.

---

## Estrutura da Planilha Google Sheets

A planilha base (`1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0`) possui 6 abas:
1. **`Table 1` (`gid: 190965404`):** Base masculina dos **227 exercícios** nos 12 meses (13 colunas `A–M`: `Mês`, `Grupo muscular`, `Especificação do grupo muscular`, `Treino`, `Exercício`, `Séries/Reps`, `Cadência`, `Técnica Avançada`, `Modo de execução`, `Observação`, `Descanso`, `Ordem`, `Conexão`), limitada a 1–2 técnicas de intensificação por treino (+ `Stomach Vacuum #99`).
2. **`Table_Feminino` (`gid: 676096017`):** Base feminina dos **252 exercícios** nos 12 meses ("Golden Era Liga Leve • Estética Chun-Li" — ênfase em glúteos, quadríceps, posteriores, panturrilhas e cintura fina com `Stomach Vacuum` em `Ordem = 99` e 32 pares conectados `PAR-N`).
3. **`Usuarios` (`gid: 416797079`):** Controle de acesso e versão (`M` vs `F`) com as colunas:
   - `usuario` | `senha` | `nome` | `ativo` (`SIM`/`NAO`) | `perfil` (`admin`/`user`) | `observacao` | `sexo` (`M` ou `F`)
   - Quando `sexo = F` (ou `Feminino`), o aplicativo ativa automaticamente a periodização `Table_Feminino`, a metodologia feminina no modal de Princípios, a identidade visual Pink OLED em 100% da interface e o favicon dinâmico `/favicon-pink.svg`.
4. **`Source References` (`gid: 201829341`):** Referências bibliográficas completas das 15 obras canônicas e 24 guias mensais.
5. **`Tracking_Historico`:** Histórico diário agregado de acessos, sessões únicas, pico simultâneo, regiões, exercícios concluídos, séries e distribuição M/F.
6. **`Tracking_Sessoes_Ativas`:** Janela rotativa do dia corrente (≤ 200 linhas, podada automaticamente na virada de data) para cálculo em tempo real de sessões simultâneas e deduplicação por `session_id`.

---

## Variáveis de Ambiente (Vercel — Opcional para R5 Tracking)

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: e-mail da Service Account do Google Cloud com acesso **Editor** à planilha.
- `GOOGLE_PRIVATE_KEY`: chave privada PEM da Service Account (com `\n`).
- `AUTH_SECRET`: segredo HMAC-SHA256 para assinatura e validação dos tokens de sessão.

*(Se `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` não estiverem configuradas, o app opera normalmente em modo fail-open sem bloquear login, treinos ou PRs.)*

---

## Como Executar Localmente

```bash
npm install
npm run dev
```

O servidor local do Vite inclui middleware integrado para responder às rotas `/api/auth`, `/api/workouts?sexo=M|F` e `/api/tracking`.

Para verificar paridade dos 24 guias Markdown e executar a suíte completa de testes E2E (Playwright):

```bash
node scripts/check-guides-parity.mjs
npm run lint
npm run build
npm run test:e2e
```
