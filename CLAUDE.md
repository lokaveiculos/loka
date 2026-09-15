| 1 | 🔴 **CONFIRMADO 18/08/2026:** a conta de serviço das Functions v2 **não consegue ler o Realtime Database**. Diagnóstico deu timeout de 20s em `ler loka_db/veiculos`. É por isso que o e-Frotas nunca gravou multa. Conserto no IAM — ver abaixo. | 🔴 |
# SISTEMA LOKÁ — Contexto do projeto

LOKÁ Aluguel de Veículos · Feira de Santana/BA · CNPJ 39.911.638/0001-10.
Responsável: Rogel de Oliveira Carneiro (não é desenvolvedor — explicar o porquê
antes do como, em português do Brasil, com comandos prontos para colar).

## Regras de trabalho permanentes

1. **Commit e push automáticos.** Após qualquer alteração de arquivo neste repo,
   eu (Claude) faço `git add` + `git commit` + `git push` para `origin/main` sem
   pedir confirmação. Mensagem de commit descritiva em português.
   Publicação = GitHub Pages, propaga em 1–10 min. Sempre lembrar de dar
   **Ctrl+Shift+R** e conferir o build no rodapé.
2. **Teste no navegador a cada pedido.** Depois de publicar, abrir a página no
   **Chrome** (real, com as sessões do Rogel) e verificar se a funcionalidade
   está OK — render, console de erros, rede.
   Se a página exigir login, pedir ao Rogel que autentique — nunca digitar senhas.
3. **Não alterar páginas sem pedido explícito.** O sistema está em pleno
   funcionamento. Mudanças pontuais apenas; nunca reescrever o sistema inteiro
   nem remover funcionalidade existente. Checar regressão.
4. **Carimbo de versão.** Todo HTML alterado tem DOIS carimbos que devem bater:
   linha 4 `<!-- LOKA deploy: vNN-AAAAMMDD-HHMM -->` e a constante
   `LOKA_BUILD` no JS. Incrementar em cada entrega.
   `gestao.html` e `fatura.html` têm **numeração independente**.
5. **Validar sintaxe** antes de entregar.
6. **Nunca disparar consulta e-Frotas "para ver se funciona"** — cada placa é
   cobrada pelo Serpro. Ambiente atual: `producao`.

## Estrutura

| Onde | O quê |
|---|---|
| `C:\...\Github\loka` | **Repo git** (origin: lokaveiculos/loka) → GitHub Pages |
| `loka\sistema\` | Todas as páginas publicadas em `lokaveiculos.com.br/sistema/` |
| `C:\...\Github\deploy` | Backend Cloud Functions e-Frotas — **repo git local** (sem remote) |

URLs de produção:
- Sistema: https://lokaveiculos.com.br/sistema/gestao.html
- Multas: https://lokaveiculos.com.br/sistema/multas.html

## Stack

HTML + CSS + JS **puro** (ES5-ish, `var`, sem bundler, sem framework).
Firebase SDK **compat 9.23.0** via CDN. Realtime Database projeto **`loka-b8dd2`**
(`https://loka-b8dd2-default-rtdb.firebaseio.com`), plano Blaze.
Cloud Functions v2, Node 20, região **`southamerica-east1`**.
DNS via Cloudflare.

## Builds atuais (verificados em 18/08/2026)

| Arquivo | Build |
|---|---|
| `gestao.html` | **v90-20260915-1620** |
| `fatura.html` | v75-20260812-1700 |
| `multas.html` | **v11-20260915-1050** |

## Modelo de dados — `loka_db`

```
clients[] veiculos[] ativos[] historico[] contratos[] manutencoes[]
multas[] fornecedores[] checklists[]
financeiro/{receber[],pagar[],acertos[]}
efrotas_status  efrotas_cursor  versaoAtual  _ultimaEscrita  _writerBuild
```
Nós de raiz irmãos: `loka_users`, `loka_perfis`, **`loka_encerrados`** (lápides —
proibido excluir), `loka_backups`, `loka_backups_meta`, `faturas`, `reservas`.

## Armadilhas conhecidas (aprendizados caros)

1. **Arrays do Firebase voltam como objeto** (`{0:…,1:…}`). Normalizar sempre
   (`cleanArr`, `normArr` no front; `_paraLista` nas Functions).
2. **Contratos multi-veículo**: usar `_placasDoAtivo()` / `_idsDoAtivo()`,
   nunca `a.placa` direto.
3. **Nunca gravar `loka_db` inteiro sem passar por `_setDBProtegido()`.**
4. **localStorage não pode sobrescrever o Firebase** (corrigido na v81).
   Firebase é a única fonte da verdade no carregamento.
5. **Ressurreições:** locações encerradas voltando aos ativos. Defesas: lápides
   em `loka_encerrados` (fora do `loka_db`), assinatura
   `cliente+placas+retirada+devolução` à prova de formato de data, `_writerBuild`.
   Funções que **não podem ser removidas**: `_assinaturaAtivo`,
   `_iniciarTombstones`, `_semearTombstones`, `_setDBProtegido`,
   `aplicarEncerrados`, `reconciliarStatusVeiculos`.
6. **`th` do CSS global tem fundo claro** — texto de cabeçalho deve ser preto
   negrito (`#111827 !important`), nunca branco.
7. **"A versão não mudou"** → cache, ou o arquivo publicado é de outra linhagem.
   Conferir o Raw no GitHub, linha 4.
8. **Aparelho desatualizado corrompe o banco**, não só mostra tela velha.
9. **Curinga `'*'` nas permissões** (v89). "Todos" não grava a lista item a item:
   grava `paineis:['*']` em `loka_perfis`, `acoes:{'*':true}`, e
   `oficinasAssoc:['*']` / `clientesAssoc:['*']` em `loka_users`. É proposital —
   assim a permissão alcança o que for criado **depois** (foi o que faltou quando
   o painel `multasefrotas` nasceu e ficou fora de todos os perfis salvos).
   Quem lê permissão precisa passar por `_temCuringa()` / `_paineisEfetivos()` /
   `_podeAcao()`, nunca por `indexOf` direto na lista.
   ⚠️ `_ACOES_RESTRITIVAS` (`manutencaoEscopoOficina`, `manutencaoEscopoCliente`,
   `multasEscopoCliente`) **não entram no curinga**: elas *limitam* a visão, então
   incluí-las em "Todas as ações" faria o perfil ver menos, não mais.

## Backend e-Frotas (`Github\deploy`)

```
functions/index.js          2 callables: dispararConsultaMultas, testarConexaoEfrotas
functions/efrotas-client.js mTLS com e-CNPJ A1 (.pfx) via node-forge
functions/adaptador.js      InfracaoDTO (Serpro) → formato interno
functions/multas-db.js      merge em loka_db/multas + identifica locatário
regras/                     database.rules.TRANSICAO.json / ALVO.json
```
Secrets no Secret Manager: `EFROTAS_PFX_B64`, `EFROTAS_SENHA`, `EFROTAS_CNPJ`.
Certificado e-CNPJ A1 válido até **jan/2027**.
Endpoint produção: `efrotas.estaleiro.serpro.gov.br/efrotas/api`,
rota `/consultas/v1/infracoes/placa/{placa}`. Auth **só por certificado**.
Consulta diária agendada está **desligada** (controle de custo).

Deploy: `cd deploy/functions && npm install && cd .. && firebase deploy --only functions`.
Se a CLI perguntar sobre apagar funções que existem na nuvem e não no fonte:
responder **No**.

## Pendências abertas

| # | Pendência | Prioridade |
|---|---|---|
| 1 | ✅ RESOLVIDO 18/08 — `dispararConsultaMultas` já repassa `d.placas`; o seletor de placas é respeitado |  |
| 2 | Senhas em **texto puro** em `sistema/index.html` (inclui master) — considerar comprometidas | 🔴 |
| 3 | Regras do banco abertas (`.read/.write: true`) → exposição LGPD. Aplicar TRANSICAO v11 (exige `_writerBuild`), depois ALVO (exige login) | 🔴 |
| 4 | ✅ RESOLVIDO 15/09 — `gestao.html` v90: "Testar conexão" confirma antes e a parte paga do Diagnóstico ficou atrás de botão |  |
| 5 | Migrar login para **Firebase Auth** | 🟠 |
| 6 | TLS e-Frotas: `validarServidor = false` em `efrotas-client.js:76` — embutir cadeia ICP-Brasil | 🟠 |
| 7 | Reservas/Pré-Cadastro gravam sem login — precisam Auth anônimo ou Cloud Function antes do ALVO | 🟡 |
| 8 | Unificar nomes de oficina no histórico ("JT CAR MECANICA" / "JT CAR MECÂNICA" / "JT Car"…) | 🟡 |
| 9 | Limpar código morto: `mrComprovantes`, `pagDataIni/pagDataFim` | 🟢 |

### Pendência 1 — resolvida
Corrigido em 18/08/2026: o handler passou a repassar `placas: d.placas`.
Validado em produção: lote de 25 placas respeitou a seleção.

## Decisões registradas (18/08/2026)

- **`PROMPT-MIGRACAO_1.md` foi descartado** por decisão do Rogel. Ele descreve um
  pacote "v16" com marcadores `[FIX-n]` e uma função `diagnosticoBanco` que **não
  existem** na pasta `deploy`. A fonte da verdade do backend é o
  `deploy/CONFERENCIA.md`. Não seguir aquele prompt.
- **A pasta `deploy` agora é repo git local** (commit inicial `f6cfdc6`), ainda
  **sem remote**. `node_modules`, `.pfx`/`.pem`/`.key`, `.env` e `*.zip` ficam de
  fora pelo `.gitignore`. Definir o remote depende de decisão do Rogel:
  repositório **privado** é o recomendado (o `loka` é servido pelo GitHub Pages,
  então versionar o backend lá dentro exporia o código-fonte na web).
- **Navegador de teste: Chrome real.** As páginas exigem login; eu nunca digito
  senha — peço ao Rogel que autentique e sigo a partir dali.

## Backups fora do repo

`C:\Users\Usuario\OneDrive\Desktop\Github\backups-loka` — **nunca versionar**.
O repo `loka` é servido pelo GitHub Pages, então qualquer coisa commitada ali
fica pública na web, e esses arquivos têm dados de cliente (LGPD).
Primeiro backup: `loka_db-COMPLETO-20260818-153545.json` (banco inteiro),
`multas-20260818-153545.json` / `.csv` (336 multas).

Baixar o banco inteiro a qualquer momento:
```bash
curl -s "https://loka-b8dd2-default-rtdb.firebaseio.com/loka_db.json" -o backup.json
```

## `multas.html` — escopo da página (18/08/2026)

A página lista **apenas** multas com `origem === 'efrotas'`. As 336 importadas
por PDF (sem campo `origem`, R$ 73.510,67 em aberto, todas com locatário)
continuam no painel **Multas** do `gestao.html` — decisão do Rogel: a página
nova começa zerada, para dar de ver o que a consulta automática realmente
carrega. **Nada foi apagado do banco**; a página só lê.

⚠️ O e-Frotas **nunca gravou uma multa em produção**: `origem='efrotas'` = 0
registros. É o sintoma que o backend precisa resolver (ver pendência 1).

## 🔴 Causa raiz do e-Frotas (confirmada em 18/08/2026)

**A conta de serviço que executa as Functions v2 não tem acesso ao Realtime
Database.** Confirmado pelo diagnóstico de custo zero da `multas.html`
("🗄 Testar o banco"):

```
✅ abrir referência do banco — loka-b8dd2-default-rtdb.firebaseio.com (0ms)
❌ ler loka_db/veiculos — Tempo esgotado (20s)   (20003ms)
```

Por isso `testarConexaoEfrotas` responde OK (nunca toca no banco) e
`dispararConsultaMultas` nunca termina (a primeira coisa que faz é ler o banco).
Explica também o `loka_db/efrotas_status` inexistente.

**Conserto (sem mexer em código):** conceder o papel **Firebase Realtime
Database Admin** (`roles/firebasedatabase.admin`) à conta de serviço do runtime
no IAM do projeto `loka-b8dd2`.

Functions v2 rodam sobre Cloud Run e usam por padrão a **Compute Engine default
service account**. O project number é **633462890390** (é o `messagingSenderId`
do `firebase-config.js`), então a conta provável é:

```
633462890390-compute@developer.gserviceaccount.com
```

Confirmar na aba **Detalhes** da função no console antes de conceder.

## Avisos do deploy a tratar

| Prazo | Aviso |
|---|---|
| **30/10/2026** | Node.js 20 será descomissionado — sem atualizar o runtime, não dá mais para publicar |
| — | `firebase-functions` desatualizado (`^5.1.0`); atualizar tem *breaking changes*, fazer com calma |

## Org Policy do projeto

O projeto barra a **criação** de funções novas:
`Build service account needs to be specified due to Org Policies`.
Atualizar funções existentes funciona normalmente. Por isso o diagnóstico de
banco é um **modo** da `dispararConsultaMultas` (`{ soDiagnostico: true }`), e
não uma função separada. Evite adicionar novos `exports` sem resolver a política.

## Papel do banco concedido — 18/08/2026, 16h

Concedido **Administrador do Firebase Realtime Database** à conta
`633462890390-compute@developer.gserviceaccount.com` (a que executa as
Functions v2, confirmada na linha `serviceAccountName` do YAML do Cloud Run).

Antes ela tinha só: Editor do Cloud Build, Editor do Cloud Functions, Gravador
de registros, Gravador do Artifact Registry, Leitor de objetos do Storage —
nenhum papel de banco. A conta `firebase-adminsdk-fbsvc@…` **já tinha** o papel,
mas não é ela que roda a função.

⚠️ **Conceder o papel não basta na hora:** o Cloud Run reaproveita instâncias
quentes, que carregam o token antigo em cache. Para valer, é preciso **forçar
revisão nova** — `firebase deploy --only functions` — ou esperar a instância
ociosa morrer (mín. de instâncias = 0).

### ✅ Confirmado funcionando — 18/08/2026, 16h20

Depois da concessão do papel e de ~4 min de propagação (sem precisar de novo
deploy — a instância quente expirou sozinha), o diagnóstico passou:

```
✅ abrir referência do banco   (0ms)
✅ ler loka_db/veiculos — leu 1 registro   (145ms)
✅ gravar loka_db/_diagnostico — gravou    (291ms)
✅ apagar loka_db/_diagnostico — limpo     (435ms)
```

De 20 000 ms de timeout para 145 ms. **A causa raiz era o IAM, e está corrigida.**
Falta validar ponta a ponta com uma consulta real (cobrada) e conferir se a
multa é gravada com `origem='efrotas'` e o `efrotas_status` passa a existir.

---
# SISTEMA AUTO MAIS

AUTO MAIS COMERCIO E CORRETORA DE VEÍCULOS LTDA · CNPJ 05.622.137/0001-00
Rua Juarez Távora, 346 — São João — Feira de Santana/BA.
Mesmo dono (Rogel). **Empresa, repositório e banco separados da LOKÁ.**

## 🔴 LEIA ANTES DE MEXER — qual é o sistema de verdade

| | |
|---|---|
| **Repo** | `C:\...\Github\automaiscar` → `github.com/lokaveiculos/automaiscar` |
| **Domínio** | **`automaiscar.com.br`** (GitHub Pages, `CNAME` no repo) |
| **Sistema** | https://automaiscar.com.br/sistema/login.html |
| **CRM** | https://automaiscar.com.br/sistema/crm.html — **já existe**, no menu como "CRM / Leads" |

⚠️ **O `AutoMais_Deploy.zip` NÃO é a fonte da verdade.** É um pacote antigo,
anterior ao CRM. Em 26/08/2026 ele foi publicado por engano dentro do repo
`loka` (em `/automais`), e um segundo CRM foi construído lá — duplicando algo
que já existia. Como as duas cópias apontavam para o **mesmo** Firestore
(`automais-6afbb`), aquilo virou uma segunda porta para os dados reais rodando
código velho. **A cópia foi removida** (commit `7d0546f` no repo `loka`).

**Regra:** trabalho da Auto Mais é no repo `automaiscar`. Nunca em `loka/automais`.
Antes de "criar" qualquer tela para a Auto Mais, conferir se ela já existe em
`automaiscar/sistema/` — o zip que o Rogel tiver em mãos pode estar defasado.

## Estrutura do repo `automaiscar`

```
CNAME                 automaiscar.com.br
index.html            site institucional "Em Breve" (público)
login.html            ⚠️ órfão — hoje só redireciona para sistema/login.html
sistema/              O SISTEMA DE VERDADE
  login.html index.html crm.html veiculos.html vendas.html
  contratos.html cadastros.html despesas.html despesa_form.html
  gestao.html ds.css firebase-shared.js logo-wm.png
*.zip                 backups soltos, servidos publicamente pelo Pages
```

⚠️ Há uma **cópia velha e duplicada** dos HTML na **raiz** do repo
(`cadastros.html`, `contratos.html`, `despesas.html`, `gestao.html`,
`veiculos.html`, `vendas.html`, `index.html`). Elas ficam no ar e ninguém
aponta para elas. Só `sistema/` vale. Limpar é pendência A3.

Menu do sistema: Painel · Vendas · **CRM / Leads** · Contratos · Veículos ·
Clientes/Fornec. · Despesas · Manutenção.

## Stack (diferente da LOKÁ — não confundir)

| | LOKÁ | Auto Mais |
|---|---|---|
| Repo | `loka` | **`automaiscar`** |
| Domínio | lokaveiculos.com.br | **automaiscar.com.br** |
| Banco | Realtime Database | **Firestore** |
| Projeto Firebase | `loka-b8dd2` | **`automais-6afbb`** |
| SDK | compat 9.23.0 | compat **10.7.1** |

Coleções: `veiculos clientes fornecedores contratos vendas manutencoes
usuarios despesas leads` + `config/empresa`.
Compartilhado: `sistema/firebase-shared.js` (cache localStorage `automais_v3`,
sessão `am_user` válida por 8h, helpers `fsave`/`fdel`).
⚠️ `login.html` **não** carrega o `firebase-shared.js` — inicializa o Firebase
sozinho no fim do arquivo.

Em 26/08/2026 o banco tinha: 24 veículos, 12 clientes, 12 contratos,
22 despesas, 1 venda, 4 usuários.

## Autenticação (corrigida em 26/08/2026)

Antes: `USERS_FIXOS` no `login.html` com `rogel` / `daniel01` **em texto puro**,
num arquivo que o GitHub Pages serve publicamente. Estava assim tanto em
`sistema/login.html` quanto no `login.html` órfão da raiz e dentro do
`AutoMais_GitHub.zip` (que o Pages entregava a quem pedisse).

Agora `sistema/login.html`:
1. consulta a coleção `usuarios` do Firestore (`where login == u`);
2. confere por **SHA-256 + salt aleatório** (`senhaHash` + `salt`), via
   `crypto.subtle` — exige HTTPS, que o site tem;
3. aceita registros **legados em texto puro** (campo `senha`) e os **converte
   para hash no primeiro login certo**, apagando o texto puro (`_migrarParaHash`);
4. cai no cache `localStorage` só se o Firestore estiver fora do ar;
5. mostra um bloco **"Nenhum administrador cadastrado"** enquanto não existir
   usuário com `perfil:'admin'` — some sozinho depois de criado.

Providências tomadas junto: `login.html` da raiz virou redirecionamento (era de
junho/2026, órfão, sem banco, com a senha dentro); `AutoMais_GitHub.zip` saiu do
versionamento e entrou no `.gitignore` (o arquivo continua no computador do Rogel).

Usuários em 26/08/2026: `rogel` (admin, **senhaHash** — criado pelo próprio
Rogel na tela de primeiro acesso) e `thaina`, `sandro`, `bruno`
(`perfil:'atendimento'`, ainda em texto puro — migram no próximo login de cada um).

## Regras do Firestore

**Não estão uniformes.** `usuarios`, `veiculos` etc. respondem HTTP 200 sem
login pela API REST; já `leads` responde **403 PERMISSION_DENIED**. Ou seja,
existem regras por coleção, e a maioria está aberta. Mapear antes de mexer.

## Pendências abertas — Auto Mais

| # | Pendência | Prioridade |
|---|---|---|
| A1 | 🔴 Regras do Firestore abertas na maioria das coleções — dados de cliente expostos (LGPD) | 🔴 |
| A2 | 🟠 Migrar login para **Firebase Auth** — resolve A1 e acaba com senha gerida por conta própria | 🟠 |
| A3 | 🟠 Limpar a cópia velha dos HTML na **raiz** do repo `automaiscar` (7 arquivos no ar que ninguém usa) | 🟠 |
| A4 | 🟠 `AutoMais_Deploy.zip` e `files.zip` continuam versionados e baixáveis em `automaiscar.com.br/*.zip` | 🟠 |
| A5 | 🟡 Trocar as senhas de `thaina`, `sandro` e `bruno` — estiveram em texto puro num banco aberto | 🟡 |
| A6 | 🟡 `appId` do `firebaseConfig` parece placeholder (`...web:1e9c3d7e5b5b5b5b5b5b5b`) — Firestore não precisa dele, conferir antes de usar Analytics/Auth | 🟡 |
| A7 | 🟢 Mensagens de commit do repo `automaiscar` são ilegíveis (`asdf`, `JHGF`, `1127`) | 🟢 |

## Testado em 26/08/2026

- ✅ `USERS_FIXOS` não existe mais em nenhum HTML/JS do repo; `grep daniel01` = 0
- ✅ `automaiscar.com.br/login.html` (antigo) redireciona para `sistema/login.html`
- ✅ `automaiscar.com.br/AutoMais_GitHub.zip` → HTTP 404
- ✅ tela de login carrega, `crypto.subtle` disponível, console sem erros
- ✅ bloco de primeiro acesso **oculto** (correto: o admin `rogel` já existe)
- ✅ 14 testes de senha passando (hash, senha errada, legado em texto puro)
- ✅ `lokaveiculos.com.br/automais/*` → HTTP 404 (cópia removida)
- ✅ sistema da LOKÁ intacto (`gestao`, `multas`, `fatura` → HTTP 200)
- ⏳ **falta testar logado** — o Rogel precisa entrar; eu não digito senha

## CRM da Auto Mais — consertado em 15/09/2026 (commit `f8e005d`)

O `sistema/crm.html` estava **abrindo em branco em produção**. Três defeitos
somados, o primeiro sendo o fatal:

1. 🔴 A página carregava o `firebase-shared.js` **sem antes carregar o SDK
   compat do Firebase**. O shared chama `firebase.initializeApp()` logo na
   linha 10 → `firebase is not defined` → o arquivo inteiro morre ali e
   **nenhuma** função global passa a existir (`loadDB`, `checkAuth`, `toast`).
2. 🔴 Faltava `var DB=loadDB();` na primeira linha do script inline.
   O shared **não** declara `DB` — cada página declara a sua.
3. 🟠 O lucide não era carregado e `renderIcons()` / `toggleTheme()` /
   `updateThemeBtn()` não existiam: ícones do menu invisíveis e o botão
   "Aparência" do topo chamava função inexistente.

⚠️ **O `AutoMais_Deploy.zip` trazia só a correção 2.** Sozinha ela não
resolveria nada — o item 1 quebra antes. Reforça a regra: o zip não é a fonte
da verdade, conferir sempre contra o repo `automaiscar`.

**Checklist para qualquer página nova do sistema Auto Mais** (o
`despesa_form.html` é a exceção legítima — é avulso e traz o próprio `loadDB`):

| Item | Por quê |
|---|---|
| `firebase-app-compat.js` + `firebase-firestore-compat.js` **antes** do shared | senão o shared morre na linha 10 |
| `<script src="firebase-shared.js">` | globais do sistema |
| `<script async ...lucide...>` com `onload="renderIcons()"` | ícones do menu |
| `var DB=loadDB();` na 1ª linha do script inline | o shared não declara `DB` |
| `id="main"` no HTML | `showLoading()` procura exatamente esse id |
| `renderIcons()` / `toggleTheme()` / `updateThemeBtn()` locais | o topo chama os três |
| `checkAuth(...)` no final | sessão de 8h |

Auditoria em 15/09/2026: todas as 8 páginas do menu passam nesse checklist.

### Validação sem custo
Não há teste de runtime "de graça" no navegador sem login, então o padrão daqui
em diante é: extrair o `<script>` inline e rodar com stubs no Node.
22 testes passaram no CRM (render com lista cheia/vazia/ausente, filtros,
modal, mover etapa, tema, `renderIcons` sem lucide carregado).

⚠️ **Python não funciona nesta máquina** — o `python` do PATH é o atalho da
Microsoft Store, sem interpretador. Usar **Node** (`v24`) para scripts.

## 🔴 FATURAMENTO DESATIVADO — 15/09/2026

**O projeto `loka-b8dd2` está com o faturamento desativado.** É a causa do
`INTERNAL` na consulta de multas — não há bug de código envolvido.

```
Error: Request to .../secrets/EFROTAS_PFX_B64 had HTTP Error: 403,
This API method requires billing to be enabled.
Please enable billing on project #loka-b8dd2
```

Evidência coletada em 15/09:

| Serviço | Estado |
|---|---|
| GitHub Pages (gestao/multas/fatura) | ✅ HTTP 200 |
| Realtime Database | ✅ HTTP 200 |
| Cloud Functions | ❌ HTTP 500, **inclusive no modo `soDiagnostico`** |
| `firebase deploy` | ❌ falha ao ler o secret |

A função morre antes de rodar qualquer linha do código: ela declara
`secrets: [EFROTAS_PFX_B64, ...]`, que o runtime injeta **na inicialização**.
Sem faturamento, o Secret Manager recusa e o processo nem sobe. Por isso nem o
diagnóstico de custo zero responde.

`loka_db/efrotas_status` congelado em **18/08 19:33** marca a última execução
bem-sucedida. As multas `origem='efrotas'` subiram de 133 (18/08) para 184
depois disso, então o faturamento caiu em algum momento entre 18/08 e 15/09.

**Conserto:** reativar o faturamento no console
(`https://console.cloud.google.com/billing/linkedaccount?project=loka-b8dd2`)
e então repetir `firebase deploy --only functions`. Nada a corrigir no código.

⚠️ Sem Blaze o projeto cai para o plano Spark, cujo Realtime Database tem
limites bem menores (100 conexões simultâneas, 1 GB armazenado, 10 GB/mês de
transferência). O sistema segue funcionando, mas sob teto — vale conferir o
consumo enquanto o faturamento estiver fora.

### Testado logado em 15/09/2026 (Rogel autenticou, eu dirigi a página)

- ✅ `crm.html` **renderiza** — kanban, 4 cards de métricas, filtros, sessão
  ("Logado como Rogel (Admin)"). O bug da tela branca acabou.
- ✅ ícones do menu aparecem (lucide carregando)
- ✅ modal "+ Novo Lead" abre e já traz o **Responsável** preenchido pela sessão
- ✅ botão "Aparência" alterna claro/escuro, troca o ícone e **persiste** no reload
- ✅ sessão sobrevive ao reload (não volta para o login)
- 🔴 **`leads` dá `Missing or insufficient permissions`** no console
  (`firebase-shared.js:53`). O CRM não lê nem grava lead nenhum.

⚠️ Os **"0 leads" na tela não querem dizer "não há leads"** — querem dizer
"não consegui ler". Não confundir os dois ao olhar o painel.

## 🔴 Próximo bloqueio do CRM: regras do Firestore em `leads`

O sistema **não usa Firebase Auth** — a sessão é própria, em `localStorage`
(`am_user`, 8h). Para o Firestore, o cliente é **anônimo**. As demais coleções
estão abertas e por isso funcionam; `leads` tem regra exigindo autenticação,
então é a única que nega. Já estava mapeado ("Regras do Firestore não estão
uniformes"), agora está confirmado em produção e com o erro exato.

Consertar `leads` isolado (abrindo a regra) faria o CRM funcionar, mas **pioraria
a A1** — dados de lead expostos. O caminho certo é a **A2 (Firebase Auth)**, que
resolve A1 e `leads` de uma vez. Decisão do Rogel.

## 🔴 REGRESSÃO — login voltou a ter senha em texto puro (11/09/2026)

O commit **`81d597b`** (11/09 10:50, mensagem "1050") **desfez a correção de
26/08**: trocou o `sistema/login.html` seguro pela versão de junho
(−146 linhas, +31). Saíram `crypto.subtle`, `senhaHash`, `salt` e a migração
automática; **voltou o `USERS_FIXOS` com `rogel` / `daniel01` em texto puro**,
num arquivo que o GitHub Pages serve publicamente.

Confirmado no ar em 15/09: `USERS_FIXOS` presente, `daniel01` presente,
`crypto.subtle` ausente. A versão segura continua guardada em **`5352cff`**.

⚠️ Foi o mesmo padrão do CRM duplicado de agosto: **upload manual de arquivos
antigos pelo GitHub** (as mensagens "1050", "1107", "0929" são desse lote).
Antes de subir arquivo por fora, conferir se ele não é mais velho que o repo.

⚠️ **Não restaurar sem o Rogel presente:** não dá para ler o banco daqui (o
sandbox bloqueia leitura de produção), então não se sabe se a conta dele ainda
tem `senhaHash` válido. Restaurar às cegas pode trancá-lo para fora.
Em 15/09 ele preferiu **não mexer** por ora. A senha `daniel01` deve ser
considerada **queimada** — esteve pública na web.

## Estado do e-Frotas em 15/09/2026 — BLOQUEADO por faturamento

A conta de faturamento **`01D058-0F50AD-F87B9C` ("Minha conta de faturamento 1",
org rodlogtransportes.com) está FECHADA.** O projeto `loka-b8dd2` continua
vinculado a ela — o vínculo existe, mas aponta para uma conta encerrada, o que
não paga nada.

Reabrir exige cadastrar cartão (o Google pede ao clicar em "Reabrir conta de
faturamento"). Provável motivo do encerramento: meio de pagamento inválido numa
conta sem uso — o custo do projeto é ~R$ 0,00/mês.

**Enquanto estiver fechada:**
- `dispararConsultaMultas` → HTTP 500 em ~0,25s, **inclusive no modo
  `soDiagnostico`**. A função declara `secrets:[…]`, injetados na inicialização;
  sem faturamento o Secret Manager recusa e o container nem sobe.
- `firebase deploy --only functions` → falha ao ler `EFROTAS_PFX_B64`.
- Log: `The request failed because billing is disabled for this project.`

**Não afetado:** GitHub Pages, Realtime Database, todo o sistema de gestão.
Só o e-Frotas depende de Cloud Functions.

**Teste de custo zero para saber se voltou** (não toca no Serpro):
```bash
curl -s -X POST "https://southamerica-east1-loka-b8dd2.cloudfunctions.net/dispararConsultaMultas" \
  -H "Content-Type: application/json" \
  -d '{"data":{"soDiagnostico":true,"placas":["DIAGNOSTICO0"]}}' -w "\nHTTP %{http_code}\n"
```
A placa inexistente é trava de segurança: se o backend publicado for uma versão
que não conhece `soDiagnostico`, ele cai na varredura normal e consulta ZERO
placas em vez da frota inteira.

### Esperando deploy (commit `afb75e6` no repo deploy)

Correção pronta e **não publicada**, por causa do bloqueio: o callable só
repassa ao navegador a mensagem de um `HttpsError`; `Error` comum vira só
"internal", sem texto. Era por isso que o operador via `INTERNAL` puro enquanto
a explicação ficava no log. `comoHttpsError()` preserva a mensagem.
Publicar assim que o faturamento voltar.

## 🔐 Migração para Firebase Auth — Auto Mais (em andamento, 15/09/2026)

**Estado: código pronto no branch `firebase-auth` (commit `2526ba4`), NÃO publicado.**
O `main` e o site no ar continuam como estavam. Publicar o login novo antes de
as contas existirem no Firebase trancaria todo mundo para fora.

### Por que
A sessão era só do navegador (`localStorage.am_user`), invisível para o
Firestore. O banco via **visitante anônimo** — daí as regras terem de ficar
abertas (A1) e a `leads`, única fechada, negar (CRM sem funcionar).

### O que mudou no código
| Arquivo | Mudança |
|---|---|
| `firebase-shared.js` | `checkAuth` via `onAuthStateChanged`, **mesma assinatura** — as 8 páginas não foram reescritas. `loginParaEmail`/`emailParaLogin`, `logout` com `signOut`, sessão de 8h mantida |
| `login.html` | `signInWithEmailAndPassword`; **`USERS_FIXOS` removido** (mata a regressão de 11/09) |
| 8 páginas do menu | só o `<script>` do `firebase-auth-compat.js` |
| `despesa_form.html` | avisa em vez de falhar calado quando a sessão expira |
| `firestore.rules` | regras novas exigindo login — **não aplicar ainda** |

### Decisões tomadas (pelo Rogel, 15/09)
- **Login continua sendo `rogel`.** O código completa com `@automaiscar.com.br`
  por trás (`AM_DOMINIO`). Quem digitar o e-mail inteiro também entra.
  ⚠️ Consequência: "esqueci a senha" por e-mail só funciona se a caixa existir
  de verdade. Enquanto não existir, **quem repõe senha é o Rogel, no console**.
- **A tela de Usuários do `gestao.html` fica como está.** Por isso as regras
  exigem só "estar logado", sem separar admin de atendimento — não dá para
  fazer regra por perfil sem os documentos de `usuarios` terem id = uid do Auth.
  ⚠️ Ela continua gravando `senha` em texto puro no banco e **não cria conta no
  Auth** — usuário criado por ali não consegue entrar. Criar gente nova é no
  console do Firebase até isso ser refeito.

### Cuidados embutidos no código (não remover)
- Sessão vencida faz **`signOut()` antes** de redirecionar. Sem isso o Auth
  reconheceria o usuário no `login.html` e o sistema entraria em **vai-e-vem
  sem fim** entre as duas páginas.
- Página sem o `firebase-auth-compat.js` **falha fechado** (manda pro login) de
  propósito — vale mais barrar do que deixar passar sem identidade.
- Banco fora do ar **não** impede de trabalhar: cai num perfil padrão.
- Quem não tem registro em `usuarios` entra como **atendimento, nunca admin**.

### Ordem obrigatória (apertar as regras é o ÚLTIMO passo)
1. Ligar **E-mail/senha** no console do Firebase — Rogel
2. Criar as contas e definir as senhas — Rogel (eu nunca digito senha)
3. Publicar o branch no `main` — **banco ainda aberto**
4. Todos confirmam que entram
5. Só então publicar o `firestore.rules`
6. Conferir tudo, inclusive o `leads`

Validado: `node --check` nos 10 arquivos + **18 testes de runtime** da
autenticação, incluindo os casos que trancariam todo mundo (sessão vencida,
usuário inativo, banco fora do ar, página sem o SDK de auth).

### Depois que estiver no ar
- Apagar os campos `senha` em texto puro que sobraram na coleção `usuarios` —
  viram peso morto, quem guarda senha agora é o Auth
- `daniel01` está **queimada** (esteve pública na web)

## 🔧 Auditoria do sistema Auto Mais — 15/09/2026 (commit `0d50387`)

Varredura de todas as 10 páginas procurando o mesmo defeito que deixou o CRM em
branco: **função chamada que nunca foi definida**. Achou 8 defeitos reais, todos
corrigidos e publicados.

### O maior: 8 funções perdidas do shared em 09/06/2026
O commit `28b5874` enxugou o `sistema/firebase-shared.js` de **11.662 → 8.831
bytes** e levou junto `exportCSV`, `exportPrint` e as **seis máscaras**. As
páginas nunca pararam de chamá-las. Por **mais de três meses**:
- nenhuma máscara de CPF/CNPJ/telefone/CEP/placa formatava
- nenhum botão de exportar funcionava (Veículos, Vendas, Despesas, Relatórios)

⚠️ **Consequência nos dados:** os cadastros feitos nesse período têm CPF e
telefone gravados **sem formatação** (`66726212534`). O conserto é só daqui para
frente — os registros antigos continuam crus até alguém normalizar.

### Os outros
| # | Defeito | Efeito |
|---|---|---|
| 2 | `maskPhone` usava `(\d{4,5})`, guloso | Fixo de 10 dígitos saía `(75) 32252-932`. É o formato do telefone da própria loja |
| 3 | `dlVanda` no onclick (erro de digitação) | Botão de **excluir venda** nunca funcionou |
| 4 | `gerarCV` removida em 19/06, ainda chamada | "Ver contrato" e impressão termo+checklist quebrados |
| 5 | `gerarCompra`/`gerarConsig` só no `contratos.html` | Imprimir contrato de compra/consignação **pela tela de Vendas** quebrava |
| 6 | Chamada órfã de `verChecklist` | Estourava a cada venda registrada, dentro de `setTimeout` |

Sobre o **6**: o checklist **não** foi ressuscitado. Ele já existe na forma nova
(`gerarChecklist_html`, marcado por padrão no seletor de documentos) — a chamada
velha é que ficou para trás. Ressuscitar a tela antiga exigiria trazer de volta
CSS que também já não existe.

**Não corrigido de propósito:** `impVendaDocsPorCt()` no `contratos.html` chama
`impTermoChecklist()`, que só existe no `vendas.html`. Mas é **código morto** —
ninguém chama. Consertar exigiria duplicar uma cadeia de geradores de contrato
sem ganho nenhum de uso.

### Como auditar de novo
O analisador fica em `scratchpad/auditoria.js` (não versionado). Ele extrai o
`<script>` inline de cada página, junta as globais do shared e aponta o que é
chamado sem existir — inclusive via `onclick` do HTML, que foi por onde o
`toggleTheme` do CRM passou batido.

⚠️ **Ele tem 3 falsos positivos conhecidos:** `exportPrint` (a limpeza de strings
tropeça na regex `/"/g` de dentro do `exportCSV`) e `Comissao` (é rótulo de tela,
não chamada). Conferir na mão antes de "consertar" qualquer coisa que ele aponte.

### Testado no ar, logado, em 15/09
- ✅ CPF digitado vira `123.456.789-01`; fixo vira `(75) 3225-2932`
- ✅ as 8 funções existem na página (`typeof` = function)
- ✅ `vendas.html`: `gerarCV`, `gerarCompra`, `gerarConsig`, `dlVenda` presentes;
  `dlVanda` e a chamada órfã sumiram do HTML servido
- ✅ console sem erros — só o aviso conhecido do `leads`
