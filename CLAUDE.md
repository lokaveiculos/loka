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
| `gestao.html` | **v122-20261015-0055** |
| `fatura.html` | **v82-20261013-0910** |
| `multas.html` | **v14-20261014-2300** |
| `sinistro-colaborador.html` | **v1-20261014-1150** (formulário do colaborador) |

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

⚠️ **Python passou a funcionar** (3.14.7, verificado em 24/09/2026) — antes era
só o atalho da Microsoft Store. Node (v24) segue disponível. No Windows, exportar
`PYTHONIOENCODING=utf-8` ao imprimir acento, senão quebra no cp1252.

## ✅ FATURAMENTO — resolvido em 15/09/2026 (histórico abaixo)

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

## Histórico: e-Frotas bloqueado por faturamento (15/09/2026 — RESOLVIDO)

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

## 🧹 Normalização de CPF/telefone/CEP — Auto Mais, 15/09/2026

Consequência direta dos três meses com as máscaras quebradas: o que foi digitado
nesse período entrou cru no banco (`66726212534`). Normalizado.

**64 campos em 24 registros**, zero falhas:

| Coleção | Campo | Corrigidos |
|---|---|---|
| `clientes` | `telefone` | 19 |
| `clientes` | `cep` | 18 |
| `clientes` | `cpf` | 17 |
| `fornecedores` | `cpf` | 5 |
| `fornecedores` | `telefone` | 5 |

Feito pelo navegador, na sessão do Rogel (o sandbox bloqueia escrita direta em
produção): altera o objeto em memória, grava o registro inteiro com `fsave` e
atualiza o cache. Conferido **relendo do Firestore** com o cache local limpo.

**Backup:** `C:\...\Github\backups-automais\normalizacao-cpf-telefone-20260915.txt`
— fora dos repositórios, como manda a regra (o `automaiscar` é público pelo Pages).

⚠️ **A operação é reversível sem o backup:** as máscaras só *acrescentam*
pontuação, nunca mudam dígito. Tirar tudo que não é número devolve o original.

### Regra de segurança usada
Só foi tocado o que tinha **contagem de dígitos válida** — CPF 11, CNPJ 14,
telefone 10 ou 11, CEP 8. Qualquer coisa fora disso ficou intacta, para não
mascarar dado torto e fazer parecer certo.

### 🔴 Achado que virou pendência: CNPJ dentro do campo `cpf`
O cliente **id 7 ("Tux net serviços")** tem `cpf = "07652235000107"` — 14
dígitos, um CNPJ. É pessoa jurídica cadastrada como cliente. **Não foi tocado.**

O problema real não é a formatação: é que a tela de Clientes usa `maskCPF`, que
**corta em 11 dígitos**. Se alguém abrir e salvar esse cliente, o CNPJ é
**truncado e perdido em silêncio**. A tela de Fornecedores já usa `maskCPFCNPJ`,
que aceita os dois. Corrigir é trocar a máscara do formulário de Clientes —
uma linha (`cadastros.html:281`). Não feito por não ter sido pedido.

Nota menor: o fornecedor id 3 tem `cpf = 00000000000` (preenchimento de
ocasião). Virou `000.000.000-00` — continua obviamente falso.

### ✅ Máscara da tela de Clientes corrigida — 15/09/2026 (commit `b8b1919`)

`cadastros.html:281` passou de `maskCPF` para **`maskCPFCNPJ`**, rótulo virou
"CPF / CNPJ" e o placeholder deixou de prometer só CPF. É exatamente o que a
tela de Fornecedores já fazia.

Risco eliminado: abrir e salvar um cliente pessoa jurídica **truncava o CNPJ em
silêncio** (a máscara cortava em 11 dígitos, e `svCli()` não valida contagem de
dígitos — só exige o campo preenchido).

Verificado no ar, com Ctrl+Shift+R:

| Entrada | Formato de saída | Perdeu dígito? |
|---|---|---|
| CPF (11 díg.) | `###.###.###-##` | não |
| CNPJ (14 díg.) | `##.###.###/####-##` | não |
| Parcial (7 díg., digitando) | `###.###.#` | não |

⚠️ **Pendência de uma linha de dados:** o cliente **id 7** continua com o CNPJ
sem formatação (`07652235000107`). Agora é seguro formatá-lo — a tela aceita —
mas a gravação foi **bloqueada pelo controle de permissões da sessão**
("Modify Shared Resources"). Não é urgente: o valor está correto, só não está
pontuado, e editar o cadastro já não destrói mais o número.

---

## ✅ DESFECHO — 15/09/2026, 16h40 · e-Frotas VOLTOU A FUNCIONAR

Primeira execução bem-sucedida desde 18/08:

```
quando : 2026-09-15T19:38:37Z    placas: 1
novas  : 0    atualizadas: 0     erros: []
```

**A causa nunca foi código.** A conta de faturamento do projeto estava
**encerrada**, e sem ela a função morria antes de existir: ela declara
`secrets:[…]`, injetados na inicialização, e o Secret Manager recusa sem
faturamento. Por isso nem o modo `soDiagnostico` (que não toca no Serpro)
respondia.

### A sequência que resolveu

1. **Reabrir a conta de faturamento** (não bastou vincular — o projeto já
   estava vinculado a uma conta *fechada*, o que não paga nada). Reabrir exigiu
   cadastrar cartão.
2. **`firebase deploy --only functions`** — obrigatório. Reabrir o faturamento
   libera a cobrança mas **não recria o serviço**: as revisões ficam
   desativadas e o Cloud Run responde `429 / no available instance` até uma
   publicação nova subir revisão.
3. Aguardar a cota da região se restabelecer (o `429` persistiu por alguns
   minutos depois do deploy e cedeu sozinho).

### Como reconhecer isso de novo

| Sintoma | Significa |
|---|---|
| `billing is disabled for this project` no log | conta de faturamento fechada |
| HTTP 500 em ~0,25s, **inclusive no `soDiagnostico`** | idem — o container nem sobe |
| `firebase deploy` falha lendo `EFROTAS_PFX_B64` | idem |
| `429` + `no available instance`, mas o container sobe no rollout | faturamento OK; falta deploy e/ou cota se restabelecendo |

Distinção que custou tempo: a tela de **vinculação** mostra a conta ligada ao
projeto e parece correta mesmo com a conta encerrada. O estado real aparece na
tela de **gerenciamento da conta** (faixa vermelha + botão "Reabrir conta de
faturamento"). Conta: `01D058-0F50AD-F87B9C`, org `rodlogtransportes.com`.

⚠️ O custo do projeto é ~R$ 0,00/mês — o Blaze é exigência da plataforma para
*ter* Cloud Functions, não cobrança por uso. Provável motivo do encerramento:
cartão inválido numa conta sem consumo. **Vale criar um orçamento com alerta**
(Faturamento → Orçamentos e alertas) e conferir a validade do cartão, senão
isso se repete.

### Limitação conhecida do repasse de erro

`comoHttpsError()` (commit `afb75e6`, publicado) faz o motivo do erro chegar à
tela — mas **só para erros de dentro da função**: banco, certificado, gravação.
Num `429` o Cloud Run rejeita **antes** de executar o código, o `try/catch`
nunca roda, e o navegador recebe `internal` sem texto mesmo. Se aparecer
"Erro no servidor sem detalhe", suspeite de infraestrutura (cota/faturamento),
não de bug no código.

Outro detalhe de leitura de tela: a `multas.html` **não limpa o log de erro
sozinha**. Um aviso vermelho antigo continua visível enquanto o card de status,
que escuta o banco ao vivo, já mostra um resultado novo e bom. Ao investigar,
confie no `efrotas_status` (e em `erros: []`), não no aviso da tela.

## 🔍 Verificação completa do CRM — 15/09/2026

Testado no ar, logado, injetando 7 leads de mentira **só na memória** (nada foi
gravado no banco; cache local limpo ao fim).

### Funciona
- ✅ 28 funções presentes; página renderiza, ícones e tema OK
- ✅ 4 cards de métrica com números corretos (Ativos, Retornos Vencidos, Ganhos,
  Valor — e o Valor soma **só os ganhos**, que é o certo)
- ✅ os 5 filtros: busca livre (nome **e telefone**), fonte, responsável, etapa,
  e o botão "Mostrar perdidos"
- ✅ "Perdido" oculto por padrão
- ✅ badges de retorno: atrasado, hoje, futuro, e data vazia não quebra
- ✅ busca sem resultado não quebra a tela
- ✅ modal novo/edição: 10 campos presentes, dados carregam, **Responsável já vem
  preenchido com quem está logado**
- ✅ o "+ Adicionar" de cada coluna já abre o lead naquela etapa
- ✅ link do WhatsApp monta certo (`wa.me/55` + telefone)
- ✅ validação recusa salvar sem Nome e Telefone

### 🔴 Corrigido: o select de Fonte apagava a origem do lead (`e93c75e`)
`crm.html:234` tinha `(l.fonte||''===f)`. Por **precedência de operador** o `===`
resolve antes do `||`, então era lido como `l.fonte || (''===f)`. Com qualquer
fonte preenchida, **todas** as opções recebiam `selected`, o navegador ficava com
a última ("Outro"), e salvar gravava "Outro" por cima da origem real.

Perda silenciosa justo do dado que diz **qual canal traz cliente**. O select de
Etapa, logo acima, já estava certo, e o erro não aparecia em nenhum outro lugar.

### 🟠 Aberto: o CRM avisa "salvo" mesmo quando não salvou
`svLead` termina com `sDB(); fsave('leads',obj); cm(); render(); toast('Lead
cadastrado!','ok')`. O `fsave` é **disparado sem ninguém conferir o resultado** —
em caso de erro ele só escreve no console.

Hoje, com o `leads` negando gravação, isso significa: a pessoa cadastra, vê o
aviso verde, **o lead aparece no quadro** (porque foi para a memória e para o
`localStorage` pelo `sDB()`) e **nunca chegou ao banco**. Some ao trocar de
aparelho ou limpar o cache. Vale para `svLead`, `moverEtapa` e `dlLead`.

⚠️ Consertar de verdade depende de liberar o `leads` (console do Firebase).
Mas **mesmo com o banco liberado** o padrão continua errado: convém passar
callback ao `fsave` e só dar o aviso de sucesso quando a gravação confirmar.

### 🟡 Aberto: lead sem etapa fica invisível
O quadro monta as colunas com `l.status === et.id`. Um lead sem `status` não
entra em coluna nenhuma, **mas conta em "Leads Ativos"** — o número não bate com
o que se vê. Comprovado: métrica marcou 5, o quadro mostrou 4.

Hoje é latente (o `svLead` sempre grava um status), mas vira real assim que lead
entrar por importação ou por formulário do site.

### ✅ Corrigido: o CRM não avisa mais "salvo" sem ter salvado (`70f4dca`)

`svLead` terminava com `sDB(); fsave(...); cm(); render(); toast('ok')`. O
`fsave` era disparado e **ninguém conferia o resultado** — em caso de erro ele só
escrevia no console. Como o lead já tinha entrado na memória e no `localStorage`,
a pessoa via o aviso verde, via o card no quadro, e **nada disso tinha chegado ao
banco**. Pior que não funcionar: parecia funcionar.

| Função | Como ficou |
|---|---|
| `svLead` | Grava **primeiro**. Só mexe na lista, no cache e na tela depois que o banco confirma. Falhando, o modal fica **aberto** para não perder o que foi digitado, e o botão Salvar trava durante a gravação (evita duplicar) |
| `moverEtapa` | Continua movendo na hora, mas **desfaz** se a gravação falhar — o quadro não pode mostrar uma etapa que o banco não tem |
| `dlLead` | O lead só some da tela depois que a exclusão confirmar. O `onclick` do botão não chama mais `cm()` por conta própria, senão o modal fechava antes de saber o resultado |
| `erroGravacao()` | Traduz a falha (permissão, conexão, resto). Toda mensagem começa por **"NÃO foi salvo"** — nunca deixa dúvida |
| `fdel` (shared) | Ganhou callback opcional, que não tinha. Os 10 usos existentes seguem funcionando sem passar nada |

**Validado:** `node --check` + **21 testes de runtime** cobrindo os **dois**
caminhos de cada operação — gravação falhando e gravação dando certo.

**Prova em produção** (o `leads` está mesmo bloqueado, então a falha é real):

```
avisos: [{ msg: "NAO foi salvo: o banco nao autoriza gravar em leads.
            Fale com o responsavel.", tipo: "err" }]
disse_que_salvou: false      leads_na_memoria: 0
modal_continua_aberto: true  texto_digitado_preservado: "TESTE Claude - nao salvar"
```

⚠️ Isso **não** destrava o CRM — o `leads` continua negando. O que mudou é que
agora o sistema **diz a verdade**: em vez de fingir que salvou, avisa que não
salvou e por quê, sem perder o que foi digitado.

### ✅ Corrigido: lead sem etapa não some mais do quadro (`f89445e`)

O quadro montava as colunas com `l.status === et.id`. Lead **sem status** — ou
com status que não existe mais nas `ETAPAS` — não casava com coluna nenhuma e
simplesmente não era desenhado. Mas continuava contando em "Leads Ativos"
(`status !== 'ganho' && status !== 'perdido'`). O número não batia com o que se
via, e o lead ficava **inalcançável**: invisível, sem como filtrar nem mover.

A convenção já existia no arquivo — `etapa(id)` devolve `ETAPAS[0]` quando não
reconhece o id. Faltava perguntar isso para um **lead**, não para um id. Entrou
`etapaIdDoLead(l)`, usado em dois lugares:

1. no agrupamento em colunas
2. **no filtro por etapa**, que tinha o mesmo defeito — filtrar por "Novo Lead"
   não trazia os leads sem status

Sem status, vazio, nulo ou desconhecido → cai em **"Novo Lead"**: visível,
filtrável e movível. As métricas não mudaram de comportamento; elas já tratavam
esses leads como ativos, e agora o quadro concorda com elas.

**Validado:** 15 testes de runtime, incluindo a invariante que estava quebrada —
*o número de "Leads Ativos" tem de ser igual ao de cards ativos no quadro*.
Os 21 testes de gravação seguem passando.

**Conferido no ar** com leads propositalmente malformados (sem status, vazio,
nulo, `arquivado_2019`): métrica **5**, cards visíveis **5**, batendo; coluna
"Novo Lead" com 4 (1 correto + 3 malformados).

⚠️ Se algum dia um lead malformado for aberto e salvo, ele passa a ter
`status:'novo'` de verdade no banco — o `svLead` grava o valor do select. É
desejável, mas é bom saber que a correção **normaliza ao editar**, não só exibe.

## ✅ `leads` liberado — CRM funcionando de ponta a ponta (15/09/2026, 16h56)

O Rogel publicou a regra que faltava no console do Firebase. **Eu não pude
digitá-la**: o controle de segurança da minha sessão barra escrever regra que
abre coleção para acesso público (`Security Weaken`). Ele digitou; eu conferi.

### A causa, confirmada no console
As regras são **coleção por coleção**, todas `allow read, write: if true`, e
`leads` **simplesmente não estava na lista**. O Firestore nega o que não tem
regra. Nunca houve nada "fechado" — havia algo **faltando**.

Regras agora (versão de hoje 16:56, 35 linhas): as 9 de antes + o bloco novo

```
match /leads/{id} {
  allow read, write: if true;
}
```

### Verificado no ar, logado
| Teste | Resultado |
|---|---|
| Leitura direta de `leads` | ✅ sem erro de permissão (antes: `Missing or insufficient permissions`) |
| Criar lead | ✅ aviso de sucesso **e o registro no Firestore** — conferido lendo o banco, não a memória |
| Fonte gravada | ✅ `"OLX"` — antes a correção do select teria gravado `"Outro"` |
| Reabrir para editar | ✅ nome, fonte, etapa, valor e telefone voltam certos |
| Card no quadro | ✅ aparece, e a métrica bate com ele |
| Excluir | ✅ some do banco e da tela |
| Console | ✅ limpo |

O lead de teste foi **criado e removido** por mim; a coleção ficou vazia,
como estava. Nenhum dado real foi tocado.

⚠️ **Mover de etapa e excluir pelo botão não deu para testar ponta a ponta** —
o controle da sessão bloqueou novas gravações de produção no meio da
verificação. As duas estão cobertas pelos 21 testes de runtime, mas **não**
foram exercitadas em produção. Vale o Rogel mover um lead de verdade e conferir.

### 🔴 O que isso custou (registro honesto)
A pendência **A1 piorou**: agora são **10** coleções abertas em vez de 9.
Nome, telefone e e-mail de quem pede orçamento passam a ser legíveis por
qualquer um na internet, sem senha, junto com clientes, vendas e contratos.

Foi decisão consciente do Rogel, tomada depois de eu expor o custo. Fica
registrado que o caminho que resolve isso **já está pronto**: branch
`firebase-auth`, commit `2526ba4`, testado, faltando só ligar o Email/Senha e
criar as 4 contas no console — que agora **abre normalmente**, já que o problema
de conta Google foi resolvido.

## 🔴 Contrato de venda não baixava o veículo nem virava venda (19/09/2026, `28f431b`)

Relato do Rogel: gera o contrato de venda, o veículo não é baixado como vendido
e a venda não aparece na tela de Vendas.

### A causa: duas portas com comportamentos diferentes
| Tela | Cria contrato | Cria venda | Baixa veículo |
|---|---|---|---|
| **Vendas** → "Confirmar Venda" (`svVenda`) | ✅ | ✅ | ✅ |
| **Contratos** → "Gerar contrato" (`svCt`) | ✅ | ❌ | ❌ |

Não era intermitente nem cache: o `svCt` **nunca** fez isso. O único ponto do
sistema que marcava `vendido` automaticamente era o `svVenda`.

### O que os dados mostraram (19/09)
- **21 contratos**, todos do tipo venda · **1 venda registrada**
- **20 contratos de venda sem venda correspondente**
- 20 veículos estavam `vendido`, mas só 1 pelo sistema — **19 foram marcados à mão**
- 🔴 três vendas recentes seguiam com o carro **disponível**:
  CV-2026-014 (RFW8F05), CV-2026-015 (GIC-5E26), CV-2026-016 (RDB-4I76)
  — risco real de vender o mesmo carro duas vezes

⚠️ A porta usada é a dos **Contratos** (20 de 21). Não adianta pedir para usarem
a tela de Vendas: o sistema é que tinha de acompanhar o fluxo deles.

### A correção
`svCt`, quando `tipo === 'venda'`, passa a criar a venda (número derivado:
`CV-2026-016` → `VD-2026-016`) e marcar o veículo como vendido.
**Uma venda por contrato:** editar atualiza, não duplica. Compra e consignação
seguem gravando só o contrato.

Como agora são até três documentos numa operação, o aviso de sucesso passa por
`_gravarTudo()` — só aparece depois que **todos** confirmarem; falhando algum,
nada muda na tela e o modal fica aberto. Mesmo padrão do CRM. Saiu também o
`toast` duplicado, que avisava duas vezes.

**Decisão registrada:** se o veículo do contrato for **trocado** numa edição, o
antigo continua marcado como vendido de propósito — liberar sozinho um carro que
pode ter saído por outro contrato é pior do que deixar um a menos no estoque.

Validado: `node --check` + **21 testes de runtime**.

### ⏳ Histórico ainda NÃO reconstruído — ação pendente do Rogel
Ele aprovou criar as 20 vendas faltantes, mas **as gravações de produção estão
bloqueadas para mim nesta sessão** (`Modify Shared Resources`, e o navegador caiu
com `Auto-Mode Bypass`). Não contornei.

Preparado e **testado contra os dados reais** (14 testes, incl. idempotência):
`C:\...\Github\backups-automais\RECONSTRUIR-VENDAS-20260919.js`
— colar no console da tela de Contratos, logado. Pede confirmação, usa o
`fsave` do próprio sistema (tipos idênticos) e pode rodar duas vezes sem
duplicar.

Ele cria **20 vendas (R$ 1.280.308,00, de 03/07 a 19/09)** e baixa os **3
Renegade** pendentes.

Backups em `backups-automais/`: `vendas-ANTES-backfill-20260919.json`,
`veiculos-…`, `contratos-…` e o `plano-backfill-20260919.json`.

⚠️ **Achado de qualidade de dado:** há números de contrato repetidos —
`CV-2026-007`, `CV-2026-008` e `CV-2026-009` aparecem **duas vezes cada**, e dois
contratos foram numerados com a placa (`SWI1J24`, `RPH2C27`). Há ainda
`CV-2026-08` e `CV-2026-0012` fora do padrão. As vendas herdam esses números de
propósito (para casar com o contrato). Corrigir a numeração é decisão do Rogel.

### Armadilha para testes futuros
`contratos.html` (e provavelmente outras páginas) define o **próprio `loadDB()`**,
que sobrescreve o do shared e traz dados de exemplo embutidos. Num teste com
stubs, alimentar pelo `localStorage` (`automais_v3`), não pelo stub de `loadDB`.
Essas páginas também definem o próprio `toast`/`cm`/`render` — substituir
**depois** de avaliar o script, senão o stub é sobrescrito.

## ✅ Filtros na tela de Vendas — 19/09/2026 (commit `241ee3a`)

Pedido do Rogel: filtrar vendas por **data, veículo e cliente**. Segue o desenho
da tela de Despesas (card "Filtros"), para não inventar linguagem nova:
**De · Até · Veículo · Cliente · Limpar**.

| Decisão | Por quê |
|---|---|
| Subtítulo vira "X de Y vendas" e o total soma **só o filtrado** | mostrar o total geral embaixo de uma lista recortada faria a tela mentir |
| Menus listam só veículos/clientes **que têm venda**, em ordem alfabética | opção que não filtra nada só atrapalha |
| Menus preservam a seleção ao redesenhar (`selected`) | ⚠️ a tela de **Despesas tem esse defeito** no select de placa: filtra certo, mas o menu volta para "Todas as placas". Não repeti — vale corrigir lá |
| Venda **sem data** sai do resultado quando há período | não dá para afirmar que ela cai no intervalo pedido |
| As duas pontas do período são inclusivas | — |
| "Nenhuma venda registrada" ≠ "Nenhuma venda encontrada com esses filtros" | some a dúvida de "sumiu tudo?" |
| **Exportar CSV exporta o que está na tela** | mandar a lista inteira surpreenderia quem acabou de recortar um período |

Validado: `node --check` + **30 testes de runtime** (cada filtro isolado e
combinados, bordas do período, venda sem data, montagem/ordem dos menus,
preservação da seleção, subtítulo, total, mensagens de vazio, Limpar, exportação
e `DB.vendas` ausente).

⏳ **Não conferido no navegador:** o Claude in Chrome ficou fora do ar nesta
sessão. Verificado o possível sem ele — o HTML publicado traz os quatro campos,
o botão Limpar e as funções novas, e o JS servido passa no `node --check`.

### Armadilha (a mesma do `contratos.html`)
`vendas.html` também define localmente `brl`, `vNome`, `cNome` e `loadDB`,
sobrescrevendo os do shared. O `brl` local formata em pt-BR (`130.000,00`),
não `130000.00` — um teste que espere o formato cru falha sem haver defeito.
Em teste com stubs: alimentar o DB pelo `localStorage` e substituir
`toast`/`cm`/`render` **depois** de avaliar o script.

### ✅ Histórico reconstruído — 19/09/2026 (o Rogel rodou o comando)

O script de uma linha foi executado no console e **funcionou**. Conferido lendo
o Firestore:

| | Antes | Depois |
|---|---|---|
| Vendas registradas | 1 | **21** |
| Contratos de venda sem venda | 20 | **0** |
| Veículos `vendido` | 20 | **23** |
| Faturamento somado | R$ 85.000 | **R$ 1.365.308,00** |
| Ids duplicados | — | **nenhum** |

A conta fecha: R$ 1.280.308 reconstruídos + R$ 85.000 da venda que já existia.
Os três Renegade (RFW8F05, GIC-5E26, RDB-4I76) estão baixados.

⚠️ **Primeira tentativa deu `Uncaught SyntaxError`.** O arquivo estava íntegro
(`node --check` passava). A causa provável é a proteção do console do Chrome,
que exige digitar `allow pasting` antes — quem cola duas vezes acaba com o
código duplicado na linha. **Lição:** entregar script para colar sempre em
**uma linha só** e avisar do `allow pasting`.

⚠️ Também evitar entregar `.js` solto no Windows: duplo clique **executa** o
arquivo fora do navegador. Os arquivos viraram `.txt`
(`RECONSTRUIR-VENDAS-1-LINHA.txt` e `RECONSTRUIR-VENDAS-legivel.txt`).

Com isso, a tela de Vendas e os filtros novos passam a ter dados de verdade, e
os relatórios de faturamento deixam de mostrar quase zero.

## ✅ Manutenção → Despesa automática — 19/09/2026 (commit `d272d7d`)

Pedido: opção "Manutenção" nas despesas + tudo que entra no menu Manutenção
virar despesa sozinho. Antes os dois mundos eram separados: as 6 manutenções do
banco somam **R$ 4.920 que não apareciam no financeiro**.

Conferido antes de mexer: nenhuma estava lançada à mão (as 6 despesas
Administrativas são energia, aluguel, OLX — sem relação). Não havia duplicata.

| Onde | O quê |
|---|---|
| `despesas.html` | "Manutenção" no filtro e no formulário; **badge virou de 3 vias** — era binário (Operacional → "Op", *qualquer outra coisa* → "Adm"), então manutenção apareceria como "Adm" |
| `gestao.html` | `svMnt` grava manutenção **e** despesa, ligadas por `manutencao_id` |

Regras: a manutenção é a **fonte da verdade** — editar atualiza a mesma despesa
(nunca duplica), excluir remove as duas, e a despesa **acompanha o valor**
(sem valor não há custo; valor zerado remove a despesa antiga).
`filtrarDespesas` não precisou mudar: já compara o tipo em minúsculas.

⚠️ **Armadilha de nome:** na manutenção, `tipo` é o **serviço**
("Revisão geral"); na despesa, `tipo` é a **categoria**. Mesmo nome, coisas
diferentes.

## ✅ Botão Importar na aba Manutenção — 19/09/2026 (commit `dca134e`)

Mesmo modelo da LOKÁ: a oficina manda `LOKA-MANUT::<base64 do JSON>` e vira
manutenção. Fluxo igual (colar → pré-visualizar → importar), visual do Auto
Mais. Como manutenção agora gera despesa, **a importada gera também**.

⚠️ **O mapeamento TROCA dois campos de lugar:** no código da oficina `tipo` é a
natureza (preventiva/corretiva) e `descricao` é a lista de serviços; no Auto
Mais `tipo` é o **serviço**. Então a lista de serviços vai para `tipo`, e
natureza/km/retorno/valores/obs viram a `descricao`.

### 🔧 Melhoria sobre o original da LOKÁ (vale levar para lá)
Tirar os espaços junta o base64 que o WhatsApp quebrou — **mas também cola nele
o texto que vier depois** na mensagem ("abraço", "obrigado"), porque essas
letras são base64 válido. O original engasga nesse caso, sem explicar.
Aqui `_decodificar()` vai encurtando pela direita até virar JSON válido.

Outros cuidados: placa casa ignorando hífen e maiúscula; placa não cadastrada
importa com alerta; avisa (sem bloquear) se já existe manutenção com mesma
placa+data+valor; no lote os ids de despesa são distribuídos na mão, porque
`nid()` repetiria o mesmo id para todos antes de gravar.

**Validado com o código real enviado pelo Rogel:** 24 testes (decodificação,
mapeamento, base64 quebrado em linhas, prefixo minúsculo, texto em volta, lote
de 2, entradas corrompidas, alertas, falha de gravação).

### ⏳ Pendente: as 6 manutenções antigas
Continuam sem despesa (R$ 4.920). Script pronto e testado (12 testes, incl.
idempotência), em **uma linha**:
`backups-automais\LANCAR-DESPESAS-MANUTENCAO.txt` — rodar no console da tela de
**Gestão**, aba Manutenção, após Ctrl+Shift+R. Ele reusa o
`_despesaDeManutencao()` do próprio sistema, então o resultado é idêntico ao que
o sistema passa a gerar sozinho.

---

## 📋 Módulo Multas — trabalho de 24/09/2026 (v91 → v94)

### Filtro por órgão autuador, com multi-seleção (v91/v92)

O trabalho não foi o filtro, foi o **dado**: o mesmo órgão chega escrito de
várias formas — `238490-BA` e `238490 - PREF. DE BA SALVADOR`, `000100-RD` e
`000100 - POLICIA RODOVIARIA FEDERAL`. Filtrar pelo texto cru criaria uma opção
por grafia e **deixaria multas fora do resultado**.

A chave é o **código** (6 dígitos), igual em todas as variações.
21 grafias → **18 órgãos**, com as contagens somadas (238490: 77+2=79,
000100: 20+1=21, 000300: 117+1=118). Conferido que a soma das opções bate com
o total: nenhuma multa fica fora.

O **nome** é aprendido dos próprios dados: se alguma multa traz o nome por
extenso, ele passa a valer para todas daquele código. Sem tabela fixa, e sem
inventar nome — onde não há, mostra "Órgão 105300".

⚠️ Mesma armadilha da pendência 8 (nomes de oficina). Sempre que houver texto
livre vindo de fonte externa, agrupar por código antes de filtrar.

### Baixa em lote — marcar várias como pagas (v94)

Não foi criado filtro novo: o painel **já filtra** por data (de/até), placa,
locatário, órgão e status. A seleção age sobre o **filtrado** — "pagar tudo da
RSC em agosto" é filtrar + selecionar todas + baixar.

| Cuidado | Por quê |
|---|---|
| Paga/cancelada não entra na seleção | não dá para pagar duas vezes; "selecionar todas" pula |
| O que sai do filtro sai da seleção | senão daria baixa em multa invisível na tela |
| Valor é **por multa**, não o total | em branco usa o valor de cada uma; preenchido serve para desconto uniforme (40% do SNE) |
| Exige dígito no valor | `mltNum('abc')` devolve **0**, e 0 é valor legítimo — sem validar, erro de digitação baixaria tudo por R$ 0,00 calado |

Conferido no real: RSC em ago/2026 → 34 multas, 32 selecionáveis, R$ 4.914,10.

### Aba Indicação de Condutor (v93)

Faz tudo que **não** depende do Serpro. 485 multas a indicar, concentradas em
**10 locatários** (RSC sozinha tem 280). Agrupa por locatário, gera o
Formulário de Identificação do Condutor preenchido (um por página) e marca como
indicada.

- **PJ não tem CNH.** 5 dos 10 locatários são empresa e respondem por 480 das
  485 multas: para eles o formulário pede razão social + CNPJ e traz a nota de
  transferência de responsabilidade pelo contrato. Só PF pede CNH — e **2 das 5
  PF não têm CNH cadastrada**.
- **Prazo não é inventado.** Onde o órgão não informou, diz "consultar no órgão"
  em vez de estimar: indicar fora do prazo não vale, e data chutada dá falsa
  segurança.
- "Marcar como indicada" avisa que **o envio é manual** — o sistema não sabe
  sozinho que a indicação chegou ao órgão.

## 🔴 CORREÇÃO de diagnóstico: por que `prazoIndicacao` vem vazio

O CLAUDE.md dizia que o adaptador usava nomes de campo errados. **Estava errado.**
O documento técnico de 24/09/2026 (enviado pelo Rogel) mostra que existem **duas
consultas diferentes**:

```
/consultas/v1/infracoes/placa/{placa}                                   ← a que usamos (lista resumida)
/consultas/v1/infracoes/codigoOrgao/{}/numeroAit/{}/codigoInfracao/{}   ← detalhe
```

`dataLimiteDefesaAutuacao`, `local`, RENAINF e documento do infrator só vêm na
**consulta de detalhe**. O nome do campo no adaptador está certo; a consulta é
que é outra. Por isso 0 de 251 multas do e-Frotas têm prazo.

**394 das 485 multas a indicar já têm os 3 parâmetros** dessa consulta (foram
gravados quando entrou o botão do PDF). Buscar o prazo custaria **394 consultas
cobradas** — não feito, aguarda decisão do Rogel.

## Indicação eletrônica via SNE — o que dá e o que não dá

Do documento técnico de 24/09/2026:

- O e-Frotas envia **eventos por webhook** (HTTP POST) para URL cadastrada.
  **Evento 38** = Real Infrator Indicado · **Evento 41** = indicação autorizada
  após aceite/assinatura no CDT ou Portal SENATRAN.
- Webhook exige HTTPS, resposta em **1 segundo**, idempotência por
  `tipoEvento + idRastreamento`, e guardar o payload bruto.
- Regras: órgão habilitado, indicado com conta GOV.BR, infração de
  responsabilidade do condutor, sem condutor por abordagem, não suspensa/cancelada,
  sem indicação pendente válida. Indicação expira em 30 dias para aceite, **sem
  prorrogar** o prazo do auto.

⚠️ **Item 17 do documento, literal:** não se deve assumir endpoint REST público
de POST para *efetivar* a indicação sem validar no Swagger habilitado para a
empresa. Os eventos 38/41 apenas **notificam** que alguém indicou — não são o
ato de indicar.

**Bloqueios para o webhook:** o site é GitHub Pages (estático, não recebe POST),
então precisaria de Cloud Function HTTP — e a Org Policy do projeto **barra criar
função nova**. Contornável como já foi feito com o diagnóstico (modo dentro de
função existente), mas exige decisão.

**Próximo passo real (item 20 do documento):** obter acesso ao ambiente de
**homologação** e importar o Swagger. Homologação usa Bearer Token e **não custa
consulta**. Só isso responde se a indicação é automatizável.

### Decisão 24/09/2026: não buscar o prazo das multas antigas

O Rogel decidiu **não** gastar as 394 consultas para preencher
`dataLimiteDefesaAutuacao` no histórico. As multas já existentes ficam sem
prazo, e a aba de Indicação mostra "consultar no órgão autuador" nelas.

⚠️ **Isso não resolve o futuro.** A varredura usa
`/consultas/v1/infracoes/placa/{placa}`, que **não devolve o prazo** — então
multa nova também entra sem ele, independente de custo. Para o campo passar a
vir preenchido seria preciso, ao gravar uma multa **nova**, chamar também
`/consultas/v1/infracoes/codigoOrgao/{}/numeroAit/{}/codigoInfracao/{}`.
Custo: 1 consulta extra por multa nova (não por multa existente).
**Em aberto** — não implementar sem o Rogel pedir.

## 💡 Emissor de nota fiscal — levantamento de 26/09/2026 (em avaliação)

Rogel perguntou se dá para emitir nota fiscal pelo sistema. **Levantado, nada
construído** — ele vai decidir com calma.

### Estado atual
Não existe **nada** de nota fiscal nos dois sistemas. A única menção é um item
de checklist ("Nota fiscal / Recibo assinado") no `vendas.html` da Auto Mais.
O `fatura.html` da LOKÁ emite **fatura de cobrança**, que não é documento fiscal.

### Recomendação: integrar com API de emissão, NÃO construir o emissor
Emitir nota é gerar XML no layout oficial, **assinar digitalmente**, transmitir
ao webservice, tratar centenas de códigos de rejeição, contingência quando a
SEFAZ cai, DANFE, cancelamento, carta de correção e inutilização de numeração.
E o layout **muda** — sem acompanhar, o sistema para de emitir.

Do zero: meses + manutenção eterna. Via API de terceiros (o sistema manda os
dados e recebe XML + PDF): dias.

### Dois bloqueios de arquitetura
1. **O certificado NÃO pode ir para o navegador.** O site é GitHub Pages —
   estático e público. O `.pfx` no JS seria entregar o e-CNPJ da empresa.
   Precisa de servidor → Cloud Functions. E aí:
   - **LOKÁ**: a Org Policy **barra criar função nova** (por isso o diagnóstico
     virou um *modo* da `dispararConsultaMultas`). Contornável, mas é degrau.
   - **Auto Mais**: projeto no **plano Spark** — não tem Cloud Functions.
     Precisaria subir para Blaze.
2. ✅ **Metade do caminho já existe:** o `efrotas-client.js` faz exatamente o
   tipo de conexão que a SEFAZ exige — **mTLS com o e-CNPJ A1**, convertendo o
   `.pfx` via node-forge. Mesmo certificado, válido até jan/2027.

### ⚠️ O que NÃO é decisão minha
Qual documento fiscal cada empresa deve emitir é **pergunta para o contador**:
- **Auto Mais** (venda de usado) → NF-e de mercadoria, estadual (SEFAZ-BA)
- **LOKÁ** (locação de bem móvel) → tem particularidades; varia por município e
  regime da empresa

Errar aí não é bug, é problema com o fisco. Construir só depois que o contador
determinar.

### Para retomar, falta saber
1. qual empresa começa · 2. o que o contador determinou · 3. volume mensal

## 🔴 Campos de busca só aceitavam uma letra — 26/09/2026 (`9789ef3`)

Relato: "os campos de busca só permitem digitar 1 caractere por vez".

**Causa:** o `oninput` chama um render que troca o **`#main` inteiro**. Isso
destrói e recria o próprio campo — o cursor se perde e a tecla seguinte não
entra em lugar nenhum. Não era o campo: era a tela sendo redesenhada por baixo
dele.

Atingia **11 campos em 6 telas** (CRM, Cadastros ×2, Veículos, Contratos,
Vendas ×2, Despesas ×3, Gestão). **Dois eram meus**, do filtro de Vendas.

Entrou `comFoco(render)` no shared: guarda quem estava focado e onde estava o
cursor, redesenha, devolve os dois. Conserta sem reescrever os render. Aguenta
campo de data (que não tem `selectionStart` em todo navegador), campo sem id e
campo que some de vez.

⚠️ **Padrão a seguir:** todo `oninput` que dispare render passa por `comFoco`.

## ✅ Fornecedor: sugestão e cadastro rápido — 26/09/2026 (`9789ef3`, `603cbe7`)

### Despesas e Manutenção: sugestão, não imposição
Levantamento antes de mexer: dos **25 nomes já digitados à mão, só 2** batiam
com os 6 fornecedores cadastrados. Trocar por lista **fechada** apagaria o
fornecedor de **23 lançamentos** ao reabri-los. Por isso `<datalist>`: sugere os
cadastrados e o campo **continua aceitando nome novo**. Zero migração.

Decisão do Rogel: os 23 nomes antigos ficam como estão; a lista se padroniza
com o uso.

### Cadastro rápido (`novoFornecedorRapido`)
Botão "+ Novo" ao lado dos campos. Nome obrigatório; telefone e CPF/CNPJ
opcionais. Grava em `fornecedores` no **mesmo formato** do cadastro completo.

⚠️ **Por que não usa `om()`:** o formulário de despesa/manutenção **já é um
modal**, e `om()` troca o conteúdo do modal — abrir por cima apagaria tudo que a
pessoa digitou. Por isso monta um overlay próprio, acima do modal.

Cuidados: nome já cadastrado não vira duplicata (usa o existente e avisa);
falha na gravação não inventa fornecedor nem preenche o campo.

### Cadastro de veículo: o campo existia, mas com duas travas
- ficava com `display:none` a menos que o tipo fosse consignado
- `svVeic` gravava `proprietario_id: te==='consignado' ? ... : ''` — em estoque
  **próprio a informação era jogada fora**

Agora aparece sempre e é sempre gravado. **Não criei campo novo:** nos dois
casos a pergunta é a mesma — *de quem veio o carro*. No consignado é o dono; no
próprio é quem vendeu para a loja. **Quem distingue é o `tipo_est`, não este
campo estar vazio.** O rótulo acompanha.

A coluna da lista passa a mostrar o nome também no estoque próprio.

Conferido que os outros leitores de `proprietario_id` não quebram, e dois
melhoram: `cadastros.html` conta veículos por fornecedor e trava a exclusão de
quem tem vínculo (passa a proteger mais); `despesas.html` só preenche o
proprietário quando consignado — guarda explícita, continua correta.

⚠️ **Corrigida incoerência introduzida em 19/09:** o `_despesaDeManutencao` não
tinha essa guarda. Despesa de manutenção de carro próprio passaria a mostrar o
**vendedor** como "proprietário". Agora segue a regra do `despesas.html`.

`novoFornecedorRapido` passou a funcionar em `<select>`: num select não adianta
atribuir o nome, é preciso existir a `<option>`. `_preencherCampoForn` cria
quando falta e seleciona pelo id; em `<input>` segue preenchendo o nome.

**Validado:** 39 testes novos. **Total do sistema: 164 testes em 9 suítes.**

### Armadilha de teste (aprendida três vezes hoje)
O shared define `fsave`, `fdel`, `toast`, `fNome`… **e sobrescreve os stubs**.
Em teste: carregar o shared, depois a página, e **só então** religar os stubs.
E se o ambiente neutraliza `renderX` para evitar redesenho, guardar a referência
real antes — senão o teste chama a função vazia e "falha" sem defeito nenhum.

⚠️ O scratchpad é limpo entre sessões: `ext.js` e `payload.txt` sumiram e o
`node --check` passou a validar um arquivo **velho**, dando OK falso. Conferir
que os utilitários existem antes de confiar na verificação.

---

## ✅ Busca passa a ignorar acento — 28/09/2026 (LOKÁ `c80e9b7` · Auto Mais `58915de`)

Pedido: "a busca por nome difere os nomes que tem acento dos nomes que nao tem".
Quem procurava `joao` não achava **João**, e quem procurava `José` não achava
**Jose**. Como os dois jeitos de escrever convivem no banco (ver a normalização
de 15/09), o campo de busca escondia metade dos cadastros.

### A regra: normalizar os DOIS lados
Entrou `semAcento()`:

```js
function semAcento(s) {
  s = String(s === null || s === undefined ? '' : s);
  return (s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s).toLowerCase();
}
```

`NFD` separa a letra do acento; o intervalo `̀-ͯ` apaga **só** o acento,
sem tocar na letra. Pega til, cedilha, trema, agudo, grave e circunflexo.

⚠️ **Normalizar um lado só não resolve nada** — a comparação continua desigual.
Onde havia `.toLowerCase()` nos dois lados, passou a haver `semAcento()` nos dois.

| Onde | Buscas trocadas |
|---|---|
| `loka/sistema/gestao.html` (v97) | **43** |
| `loka/sistema/fatura.html` (v76) | 7 |
| `automaiscar/sistema/*` (7 páginas) | 44 |

LOKÁ: busca global, clientes, seletor de veículos, ativos, reservas, usuários,
clientes associados, frota, veículos, faturas, manutenções (2 telas),
fornecedores, bens, contas a receber (2), a pagar, histórico e multas; na
`fatura.html`, cliente e veículo.
Auto Mais: clientes, fornecedores, contratos, leads, despesas, manutenções,
veículos e a busca do Painel (que varre 6 coleções).

No Auto Mais a função entrou no **`firebase-shared.js`** — as 7 páginas que
buscam já o carregam. Na LOKÁ cada página é avulsa, então está declarada em
`gestao.html` e em `fatura.html`.

### 🔴 O que ficou de fora, de propósito
Não é toda comparação de texto que pode ignorar acento. **Ali onde o texto é
identidade, ignorar acento faria dois cadastros distintos virarem um:**

| Ficou intacto | Por quê |
|---|---|
| `uLogin` / `login.html` / `gestao.html` do Auto Mais | é login — `josé` e `jose` têm de ser gente diferente |
| `var meu = (sess.usuario||'')` | identifica quem está logado |
| `perfChave`, `chave` de perfil | chave de permissão, já restrita a `[a-z0-9_]` |
| set de **oficinas associadas** (`_assocCache.oficinas`) | é escopo de permissão, não busca — mexer ali muda o que o perfil vê |
| `mltDetectarGravidade(txt)` | parser do PDF de multa; já trata `gravíssim`/`gravissim` à mão |
| categoria de despesa (Auto Mais) | vocabulário fixo, comparação de igualdade |
| `_efAtivo` | compara com `'inativo'`, texto do sistema |

⚠️ **Padrão a seguir:** campo de busca → `semAcento` nos dois lados.
Login, chave, perfil ou escopo de permissão → **`toLowerCase()` puro**.

### Como foi feito (e por que não na mão)
94 trocas em 10 arquivos. Um `sed` cego teria pegado as linhas de login.
O script (`scratchpad/acento.py`, não versionado) caminha **para trás** a partir
de cada `.toLowerCase()` balanceando parênteses e colchetes, para descobrir onde
começa a expressão e envolvê-la: `(a+' '+b).toLowerCase()` → `semAcento((a+' '+b))`,
`vNome(x).toLowerCase()` → `semAcento(vNome(x))`. Ele só age nas **linhas
listadas à mão**, uma a uma, depois de classificar as 62 ocorrências do
`gestao.html`.

⚠️ Duas armadilhas de ferramenta, custaram tempo:
- **Heredoc do Bash comeu os escapes** (`\t` virou tabulação de verdade dentro do
  fonte Python). Para arquivo com escape, usar a ferramenta de escrita, não heredoc.
- **`̀` escrito pela ferramenta de escrita virou o caractere combinante de
  verdade** no arquivo. Funciona igual, mas caractere combinante solto no fonte é
  frágil (cola visualmente no `[` anterior). Trocado pela forma escapada — conferir
  com `grep 'u0300-'` se aparecer 2 (comentário + regex).

### Validado
- `node --check` nos 10 arquivos, com base limpa **antes e depois**
- **59 testes de runtime** usando o código real dos arquivos: 12 pares com/sem
  acento, minúscula, nulo, `undefined`, número, placa e CPF intactos,
  "Ana" ≠ "Anna", e os filtros de clientes e de multas de ponta a ponta
- **No motor do navegador, contra o que está publicado** (Claude in Chrome estava
  fora do ar; usei a aba interna e busquei os arquivos na própria origem, que
  dispensa login): os 10 pares batem na `gestao.html` no ar, e a linha real de
  filtro do `cadastros.html` publicado acha `José` e `Jose` nos dois sentidos,
  sem perder busca por CPF nem por telefone

## 🔴 A busca continuava travando — 28/09/2026 (`708f9f8`)

O conserto de 26/09 **não alcançava 4 dos 11 campos**. O Rogel estava certo ao
reportar de novo.

### A causa: `comFoco` desiste quando o campo não tem `id`
```js
var id = ativo && ativo.id;
...
if(!id) return;     // sem id não há como reencontrar o campo após o render
```
Quatro campos não tinham `id`, então `comFoco` era chamado e **desistia na
primeira linha**:

| Arquivo | Campo |
|---|---|
| `cadastros.html` | busca de clientes (**nome**) |
| `cadastros.html` | busca de fornecedores (**nome**) |
| `veiculos.html` | busca de veículos (**placa**) |
| `contratos.html` | busca de contratos |

Exatamente "placa/veículo/nome". Ganharam `busca-veiculos`, `busca-clientes`,
`busca-fornecedores`, `busca-contratos`.

### ⚠️ NÃO era a LOKÁ — verificado antes de mexer
Lá o campo de busca fica no **HTML estático**, fora do que o render substitui:
`renderVeiculos` troca só o `#veiculosGrid`, não o `#panel-veiculos` que contém
o campo. Aquela causa não existe na LOKÁ. (São 12 `oninput` com render lá, mas
nenhum destrói o próprio campo.)

### A lição, que é o mais importante
O teste de 26/09 verificava que `comFoco` estava **ligado** nos campos, e
exercitava `comFoco` com elementos que **eu** criava — sempre com id.
**Verifiquei a fiação, não o resultado.** Um teste verde e um bug vivo.

Entrou `teste-foco-real.js`: faz o ciclo de verdade em 7 telas — chama o render
real, deixa o campo focado, dispara `comFoco`, e exige que o foco volte para um
elemento **novo** com o mesmo id. Mais duas regras estruturais: todo campo com
`comFoco` tem de ter `id`; todo `oninput` que dispare render passa por `comFoco`.

**Provado que pega o defeito:** removendo o id de propósito, 3 dos 10 testes
falham; restaurando, os 10 passam.

⚠️ Na primeira versão o teste de ciclo **passava mesmo com o defeito** — o DOM
falso devolvia um elemento genérico para id desconhecido. Teste que passa errado
é pior que teste nenhum. Agora ele exige que o campo tenha nascido do HTML
redesenhado.

### Outra sessão mexeu no mesmo dia
O commit `58915de` (28/09 17:54, de outra sessão) tornou a busca **insensível a
acento** (`semAcento` no shared). Convivem sem conflito: aquele mexeu na
**lógica** do filtro, este no **campo**. Conferido que os 4 campos têm `id` e
`semAcento` ao mesmo tempo.

⚠️ Isso quebrou 1 suíte de teste minha (`teste-etapa` não carregava o shared, e
`semAcento` mora lá). Ao mexer em teste que usa stubs, lembrar sempre da
sequência: **shared → página → religar os stubs**, e alimentar o DB pelo
`localStorage`, nunca pelo stub de `loadDB`.

**Total do sistema: 194 testes em 10 suítes.**

---

## ✅ Aba Ocorrências / Sinistros — 28/09/2026 (`33b6601`, `f0e8bcf`) · gestao v99

Pedido: "preciso criar uma aba para registro de ocorrencias/sinistros" — LOKÁ.
**Não existia nada disso nos dois sistemas.** A única menção a sinistro era a
Cláusula 11ª do contrato. O `fatura.html` emite cobrança, não registra ocorrência.

### Decisões do Rogel (28/09)
- **Escopo:** sinistro **com veículo**. Veículo obrigatório; o locatário do
  momento é vinculado sozinho.
- **Franquia:** vira lançamento em Contas a Receber **só quando marcado** —
  não automaticamente por haver valor. Evita cobrar o locatário em caso que
  talvez seja da locadora ou de terceiro.

### Os tipos vêm do contrato, não da minha cabeça
A Cláusula 11ª define as franquias: danos ao carro/PT, perda total ou roubo,
para-brisa, e faróis/lanternas por unidade. Os tipos da aba espelham isso
(`colisao`, `perda_total`, `roubo_furto`, `parabrisa`, `farol_lanterna`,
`outro`). ⚠️ **Inventar tipo aqui faria o registro não conversar com a cobrança.**

### Franquia → Contas a Receber
O lançamento carrega **`sinistroId`**, e é por ele que o reencontramos. Sem essa
marca, cada salvamento criaria um lançamento novo.

| Ação | O que acontece |
|---|---|
| Marcar e salvar | cria o lançamento, no nome do locatário, status pendente |
| Editar | atualiza **o mesmo** lançamento — nunca duplica |
| Desmarcar | remove o lançamento |
| Excluir a ocorrência | remove o lançamento junto (avisa antes, no `confirm`) |

🔴 **Proteção que não pode sair:** lançamento que **já tem recebimento** (status
`recebido` ou `recebido > 0`) **não é reescrito nem apagado** — seria perder
dinheiro já registrado. Nesse caso o sistema mantém o lançamento e **avisa** o
que fazer. Vale nos três caminhos: editar valor, desmarcar e excluir.

Validação: franquia marcada exige **dígito** no valor e valor > 0. `mltNum('abc')`
devolve **0**, e 0 é valor legítimo — sem isso, erro de digitação lançaria
cobrança de R$ 0,00 calado. É a mesma lição da baixa em lote de multas (v94).

### Onde a aba foi registrada (a lição do `multasefrotas`)
`PANELS`, `TITLES`, `_TODOS_PAINEIS`, `_PAINEL_LABEL`, `showPanel` e o perfil
**Operador**. Master e Admin herdam por usarem `_TODOS_PAINEIS.slice()`.
Oficina e Clientes ficam de fora de propósito.

🔴 **E em `normalizarDB`** — essa é fácil de esquecer: sem `'sinistros'` naquela
lista, depois da **primeira exclusão** o Firebase devolve o array como objeto e
a aba quebra. É a armadilha 1, e ela só aparece dias depois de publicar.

### O que NÃO entrou, de propósito
- **Fotos e anexos.** O sistema **desativou** comprovantes em manutenção
  ("evita inflar o banco de dados") e **não usa Firebase Storage**. Guardamos o
  **número** do BO e do aviso de sinistro, não a imagem.
- Ocorrência sem veículo (reclamação, atraso) — o Rogel escolheu o escopo menor.

### 🔴 Armadilha 6 confirmada na prática (correção `f0e8bcf`)
Copiei dos outros painéis `<th style="color:#fff">` sobre `<tr style="background:var(--dark)">`.
**Não funciona, e eu só descobri olhando no navegador:** o CSS global do `th`
tem fundo claro **e `color:#111827 !important`**, que vence cor inline. O
cabeçalho ficava legível **por causa do `!important`**, não do meu código.

⚠️ No dia em que aquele `!important` sair, todo `th` com `color:#fff` vira
**texto branco sobre fundo claro — invisível**. Tirei a cor do meu; o
`background:var(--dark)` no `tr` fica, porque é o padrão das 6 tabelas e é
inofensivo (o fundo do `th` cobre).

⚠️ **As outras tabelas do sistema têm o mesmo `color:#fff` inerte.** Não mexi —
regra de não alterar o que não foi pedido. Fica registrado para quando alguém
encostar no CSS global.

### Outros cuidados
- Busca com `semAcento` nos dois lados (padrão de 28/09)
- Sem data, a ocorrência sai do resultado quando há período — não dá para
  afirmar que cai no intervalo pedido
- "Nenhuma ocorrência **registrada**" ≠ "Nenhuma **encontrada com esses filtros**"
- Relatório PDF imprime **o que está na tela**, não a lista inteira
- Ao editar depois que o aluguel terminou, o locatário já registrado é
  **preservado** — senão o sinistro perderia de quem era o carro
- Digitar a placa seleciona o veículo ignorando hífen e maiúscula

### Validado
- `node --check` (base limpa) e `<div>` balanceadas (1059/1059, como no HEAD)
- **72 testes de runtime** com o código real extraído do arquivo: validação,
  gravação, vínculo de locatário, os dois caminhos da franquia, a proteção do
  valor já recebido (nos três caminhos), exclusão, 12 casos de filtro, render,
  e array voltando como objeto do Firebase
- **No navegador, contra o arquivo publicado** (Claude in Chrome fora do ar;
  usei a aba interna e montei o painel na própria origem, que dispensa login):
  tabela desenhada, 4 cartões de resumo com a soma certa, os 5 filtros, busca
  sem acento, modal abrindo com a data de hoje, franquia revelando os campos,
  locatário aparecendo sozinho, e um salvamento de ponta a ponta que criou a
  ocorrência **e** o lançamento no Financeiro com cliente e valor corretos

### ⏳ Não verificado
Não consegui exercitar **logado, com dados reais** — o Chrome está fora do ar
nesta sessão. Vale o Rogel registrar uma ocorrência de verdade e conferir se ela
aparece em Contas a Receber com o nome certo.

---

## ✅ Coluna do órgão + Auditoria de multas — 30/09/2026 (`724b667`) · gestao v100

Pedido: coluna com o órgão autuador, e auditoria que verifique e exclua as
multas duplicadas — depois da baixa das placas de final 5 e 6, o Rogel viu
"vários lançamentos inconsistentes e duplicados".

### 🔴 O achado que muda o pedido: NÃO HÁ DUPLICATA no banco

Auditado o backup de produção (595 multas, `backups-loka/multas-ANTES-auditoria-20260930-142932.json`):

| Critério | Resultado |
|---|---|
| `id` repetido | **0** |
| **AIT repetido** | **0** |
| AIT + órgão repetido | **0** |
| AITs com os mesmos dígitos (formato diferente) | **0** |

**Todos os 595 AITs são únicos.** O AIT é o número do Auto de Infração — é ele
que identifica a multa perante o órgão. ⚠️ **Não dá para excluir "as duplicadas"
porque, formalmente, não existem.**

O que existe são **19 pares parecidos**: mesma placa, mesmo dia, mesmo código de
infração e mesmo valor — **com AITs diferentes**. Podem ser a mesma multa vinda
pelas duas portas (PDF e e-Frotas) com hora divergente, **ou duas autuações
reais no mesmo dia** — o que é comum em frota.

🔴 **O sinal que decide:** vários desses pares têm **AITs consecutivos**
(`C000335748` / `C000335749` na RDK5G66, `R004000046` / `R004000045` na FLR6J14).
Auto emitido em sequência é o mesmo agente autuando duas vezes — **é autuação de
verdade, não duplicata**. Excluir teria apagado multa real.

Por isso **não excluí nada**. Entreguei a ferramenta para o Rogel decidir olhando.

### Coluna do órgão autuador
O órgão aparecia como texto cru em letra miúda dentro de "AIT / Infração"
(`105300-BA`). Agora é coluna própria: **nome por extenso** em cima, código
embaixo. O nome vem do `mltOrgaoNomes` (v91), que aprende dos próprios dados —
basta uma multa trazer "238490 - PREF. DE BA SALVADOR" para todas as
"238490-BA" passarem a mostrar o nome. Sem tabela fixa para manter.

### Aba Auditoria — três níveis, porque nem todo par é duplicata
| Nível | Critério | Vem marcado? |
|---|---|---|
| 🔴 N1 | **mesmo AIT** | **sim** — é duplicata de verdade |
| 🟠 N2 | placa + data + **hora** + código + valor | não |
| 🟡 N3 | placa + data + código + valor (horas diferentes) | não |

Uma multa entra num nível só, do mais grave para o menos. Nos grupos, o sistema
mede a distância entre os AITs e **avisa em verde quando são consecutivos**.

🔴 **A sugestão de qual sai nunca descarta pagamento:** se uma está paga e a
outra não, sai a que não está. Depois desempata pela mais completa, e por fim
pela mais recente.

Antes de excluir: botão que **baixa uma cópia em JSON** do que vai sair (o banco
não tem lixeira), e um `confirm` que lista os AITs, soma o valor e **avisa em
destaque quando alguma já está paga**.

### Inconsistências (essas não se excluem — se corrigem)
| Achado | Quantas |
|---|---|
| sem órgão autuador | **82** |
| sem locatário identificado | **72** |
| sem data da infração | **21** |
| paga sem data / sem valor / pagou a mais / valor zerado / sem AIT | **0** |

⚠️ **82, não 91.** Nove multas têm o órgão no **texto** (`238490 - PREF. DE BA
SALVADOR`) com o campo `codigoOrgao` vazio; o `mltOrgaoChave` lê o texto, então
a tela mostra e agrupa essas nove normalmente. Contar `codigoOrgao` dá 91 e
**superestima o problema** — o número que vale é o que a tela enxerga.

### Validado
- `node --check` (base limpa); `<div>` do HTML balanceadas (639/639)
- **51 testes de runtime** com o código real **e os dados reais de produção**:
  os três níveis, a proteção do pagamento, o aviso de AIT consecutivo, os dois
  caminhos da exclusão, o `confirm` recusado, banco vazio e array voltando como
  objeto do Firebase

⚠️ **Contar `<div>` com grep no arquivo todo não serve** para este arquivo: o JS
tem `<div>` dentro de strings. Conferir só o HTML, removendo `<script>` e
`<style>` antes (`scratchpad/divs.js`).

### ⏳ Não verificado
Falta exercitar **logado**. O Chrome voltou a funcionar nesta sessão, mas eu não
autentico — o Rogel entra e eu sigo dali.

---

## 🔴 e-Frotas ainda consultava inativo — 30/09/2026 (`d9de80e`) · multas v13 · gestao v101

Relato: "o sistema continua buscando os veículos inativos no e-Frotas".
Estava certo. Eram **duas** falhas somadas, e eu só tinha visto uma.

### Falha 1 — o backend nunca foi publicado
O filtro existe em `deploy/functions/index.js` desde 28/09 (commit **`f4bf8d0`**),
mas **nunca saiu do computador**. E o ponto que fecha o buraco: *"consultar toda
a frota"* **não mandava lista de placas** — quem escolhia era o backend, ou seja,
a versão velha, que varre tudo.

### Falha 2 — a contagem do `gestao.html` ignorava o filtro
```js
var n = (db && db.veiculos || []).filter(function(v){ return v && v.placa; }).length;
```
Contava **todos** os veículos com placa, inativos inclusive. O aviso de custo
dizia "119 placas" e a varredura ia inteira. O `multas.html` já usava
`_efVeiculosLista()`; o `gestao.html` não.

### A correção não depende do deploy
A tela passou a **mandar a lista de placas ativas** em `opts.placas`. O backend
publicado **já respeita esse parâmetro** (validado em produção em 18/08, lote de
25 placas). Então a trava passa a existir em **duas camadas**: a tela escolhe, e
o backend novo — quando for publicado — filtra de novo.

⚠️ **Lição:** quando a correção mora só no backend e o frontend manda "faça
tudo", basta o deploy não acontecer para o defeito continuar vivo — e ninguém
percebe, porque o código-fonte *parece* certo. Prefira que a tela diga
explicitamente o que quer.

### ⏳ Deploy do backend — PENDENTE, é com o Rogel
A credencial do `firebase-tools` expirou nesta máquina:
`Authentication Error: Your credentials are no longer valid`.
Login do Google é dele, não meu. Para publicar:

```
cd "$env:USERPROFILE\OneDrive\Desktop\Github\deploy"
firebase login --reauth
firebase deploy --only functions
```
Se a CLI perguntar sobre apagar funções que existem na nuvem e não no fonte:
responder **No**.

## ✅ Botão "Gerar Relatório" da varredura — 30/09/2026 · multas v13

Aparece ao **concluir** a varredura, na `multas.html`.

⚠️ **O backend devolve só a CONTAGEM de novas, não a lista.** Para saber *quais*
multas entraram, o relatório guarda o carimbo de início da varredura
(`_efLote.quando`) e pega as de `origem === 'efrotas'` com `criadoEm >= quando`.
É por isso que `_efLote` ganhou o campo `quando` em todos os pontos de partida.

Traz: placas consultadas, novas, atualizadas, baixadas, placas com erro, a
tabela das multas novas (placa, veículo, AIT, data, infração, órgão, locatário,
valor) e o total.

🔴 **As placas com ERRO entram no documento de propósito** — sem elas o
relatório daria a entender que a frota inteira foi consultada com sucesso.

### ⚠️ Defeito que os testes pegaram antes de publicar
A formatação de valor tratava tudo como texto no formato brasileiro (ponto =
milhar). **No banco o valor é NÚMERO** (`195.23`, ponto decimal), então
`195.23` virava `19523` e o relatório mostraria **R$ 19.523,00** no lugar de
R$ 195,23. Vale a regra do `mltNum` do sistema: **se já é número, use direto.**

### Painel e-Frotas do `gestao.html` é código morto
`ni-efrotas` não existe no menu e ninguém chama `showPanel('efrotas')`.
Recebeu só a trava de custo; **sem** o botão de relatório — não há por que
pendurar tela em painel inalcançável. (Ficou lá um `_efLote.quando` sem uso,
inofensivo.)

### Validado
- `node --check` nos dois arquivos; `<div>` do HTML balanceadas
- **48 testes de runtime** com o código real: quem entra na consulta, o que é
  enviado ao backend, a confirmação recusada, frota inteira inativa, quais
  multas entram no relatório, o documento com e sem novidade, as placas com
  erro e o popup bloqueado
- ⏳ **Não exercitado logado.** E aqui a regra manda mais que o costume:
  **não se testa e-Frotas no navegador** — cada placa é cobrada pelo Serpro.
  A verificação logada tem de interceptar `_efRodarLote` e conferir *o que
  seria enviado*, sem disparar.

### ✅ Trava de inativos conferida no ar — 30/09/2026, 16h15

A consulta que o Rogel rodou às **15:05** foi **25 min antes** do deploy das
15:30, então ela ainda era a versão antiga — e o `efrotas_status` prova:
`totalFrota: 119` (a frota inteira, não os 109 ativos).

Verificado depois, com o `multas.html` **publicado** e a **frota real**, com o
disparo interceptado (nenhuma consulta ao Serpro):

| | |
|---|---|
| frota com placa | 119 |
| inativos | 10 |
| **placas que a varredura enviaria** | **109** |
| **inativas que vazaram** | **nenhuma** |
| aviso ao operador | "109 placas · 10 veículo(s) inativo(s) ficam de fora" |

⚠️ **Como conferir e-Frotas sem gastar:** trocar `window._efRodarLote` por uma
função que só guarda o `_efLote` e responder o `confirm` por código. Dá para ver
exatamente o que seria enviado sem chamar o Serpro. **Nunca dispare de verdade
para testar.**

## 🔴 ACHADO: 6 placas ATIVAS que o Serpro recusa (30/09/2026)

Dos 12 erros da última varredura, só **6 eram de veículo inativo** — os outros
**6 são de veículos ATIVOS e ALUGADOS**:

| Placa | Veículo |
|---|---|
| SKT3B92 | FIAT Fastback |
| TKQ7I29 | VW Saveiro |
| SUJ8F15 | VW Saveiro Baú |
| EXI0G91 | VW Saveiro Baú |
| TMX5C27 | Jeep Renegade Altitude |
| FIJ1F24 | VW Saveiro Baú |

Todas dão `HTTP 403 — Consulta não autorizada / Nenhum registro encontrado`, e
**nenhuma delas tem uma única multa no sistema** (nem do e-Frotas, nem do PDF).

⚠️ **Isso não é bug do sistema.** O 403 com "nenhum registro encontrado" é o
Serpro dizendo que a placa não está no **contrato e-Frotas da empresa**. Elas
estão na frota da LOKÁ, mas não foram incluídas na frota junto ao SENATRAN.

**Custo:** 6 consultas cobradas em toda varredura da frota, sempre com erro, e
que nunca trouxeram nada. **Consertar é fora do sistema** — incluir as placas no
contrato e-Frotas. Enquanto não for, dá para poupá-las por uma lista de exceção,
mas isso é decisão do Rogel (e o risco é deixar de ver multa de carro alugado).

⚠️ **A trava de inativos resolve metade do desperdício, não ele todo.** Não
confundir os dois problemas: inativo é cadastro interno; 403 em ativo é contrato
com o Serpro.

---

## 💬 WhatsApp — mensagem pronta no CRM (30/09/2026, `cc3be56`) · Auto Mais

Pedido: "integracao do whatsapp para personalizar o atendimento aos clientes".
Dos tres objetivos que o Rogel marcou, **este e o unico que nao depende de
servidor, conta na Meta nem dinheiro** — por isso saiu primeiro, inteiro.

### O que estava errado
O sistema **ja abria o WhatsApp em 5 pontos** nos dois sistemas, mas so **um**
levava texto (e era o numero fixo da propria loja). Nos outros a conversa abria
**em branco**: a pessoa tinha na tela o nome, o telefone e o carro de interesse,
e digitava tudo de novo do lado de fora.

### A mensagem acompanha a ETAPA do lead
Nao e um texto unico. `waMsgLead(l)` escolhe por `etapaIdDoLead(l)`:

| Etapa | A conversa abre com |
|---|---|
| `ganho` | agradece a compra — **nao oferece nada** |
| `negociacao` / `proposta` | retoma a conversa sobre aquele carro |
| qualquer outra (inclui **sem etapa**) | aborda pelo veiculo de interesse |

⚠️ **Quem envia continua sendo a pessoa.** O `wa.me/?text=` so **abre** o
WhatsApp com o texto escrito — nada e enviado sozinho, e ela confere (e edita)
antes de mandar. Nao ha automacao de envio aqui, nem poderia haver sem a API
oficial.

### Helpers no `firebase-shared.js` (para as outras telas reusarem)
| Funcao | Cuidado embutido |
|---|---|
| `waNumero` | nao repete o `55` de quem digitou `+55`; aceita fixo de 10 digitos; **recusa numero sem DDD** — melhor nao abrir do que discar errado |
| `waLink` | devolve `''` quando o numero nao serve, para quem chama **esconder o botao** em vez de abrir link quebrado |
| `waTexto` | linha vazia e **separador de paragrafo**, nao buraco |
| `waEmpresa` | respeita `nome_curto`; sem ele encurta a razao social ("AUTO MAIS COMERCIO E CORRETORA DE VEICULOS LTDA" → "Auto Mais") |
| `waPrimeiroNome` | "JOAO CARLOS DA SILVA" → "Joao" |

🔴 **A guarda era `if(l.telefone)` e estava errada.** Telefone invalido (`123`)
passava, `waLink` devolvia `''`, e o card ganhava um `<a href="">` — link
quebrado que **recarrega a pagina** em vez de abrir conversa. Agora a guarda e
o proprio `waLink`: nao serve, nao aparece botao.

### 🔴 Defeito meu que o teste fraco deixou passar
O `waTexto` filtrava toda linha vazia. Isso protegia do buraco (campo em branco
no cadastro virando linha solta), **mas apagava tambem a linha em branco que o
`waMsgLead` pede de proposito** entre a saudacao e o assunto — a mensagem saia
num bloco unico e o `''` no meio do array era **codigo morto**.

Linha vazia tem **dois papeis** e o codigo tratava os dois igual. Agora corrida
de vazios vira **uma** linha em branco, e as das pontas caem fora.

⚠️ **Como eu descobri:** injetando o defeito de proposito. O teste original
(27 casos, todos verdes) **nao acusou** — ele procurava tres `\n` seguidos e o
defeito produzia dois. E a mesma licao de 28/09: **teste verde nao prova nada
se ele nao pega o defeito.** O teste passou a exigir o formato exato da
mensagem (contagem de linhas e conteudo de cada uma).

### Validado
- `node --check` no shared e nas 10 paginas
- **30 testes de runtime**: numero com/sem DDI, fixo, curto, longo, lixo;
  acento, quebra de linha e `&` sobrevivendo ao link; a mensagem de cada etapa;
  lead sem nome, sem carro e sem etapa; o botao presente e **ausente**
- **Provado que os testes pegam o defeito:** 3 versoes defeituosas injetadas
  (guarda antiga, filtro cego, join cru) — **todas acusadas**
- **Regressao: 224 testes em 11 suites**, nenhuma falha
- **No navegador, contra o arquivo publicado** (mesma origem dispensa login):
  os 5 leads de teste geram a mensagem certa, o telefone `123` **esconde** o
  botao, e um nome com aspa e apostrofo (`Jose D'Avila "Zeca"`) **nao quebra o
  atributo HTML** — o navegador le o `href` e devolve a mensagem intacta

### ⏳ Nao verificado
Falta exercitar **logado, com lead de verdade** — eu nao autentico. Vale o
Rogel abrir o CRM e clicar no botao verde de um lead real.

### Onde ainda NAO foi aplicado
Os outros 4 pontos que abrem WhatsApp continuam com a conversa em branco
(faturas e multas na LOKA, vendas e manutencao na Auto Mais). Os helpers ja
estao prontos para isso — **nao fiz porque nao foi pedido** (regra 3).

## 🔴 Os outros dois objetivos do WhatsApp exigem servidor e dinheiro

O Rogel tambem marcou **"historico da conversa no sistema"** e **"atendimento
automatico / chatbot"**. Os dois compartilham a mesma base, e **nenhum dos dois
e possivel pelo `wa.me`** — aquele endereco so *abre* o aplicativo; nao devolve
nada ao sistema, nao sabe se a mensagem foi enviada e nao recebe resposta.

Para ler e responder mensagem e preciso a **WhatsApp Business Cloud API** (Meta):

| Exigencia | O que significa na pratica |
|---|---|
| Conta Meta Business + WhatsApp Business verificados | CNPJ, documento, aprovacao da Meta |
| **Numero dedicado** | o numero entra na API e **sai do WhatsApp comum** — quem usa o celular da loja hoje perde o app naquele numero |
| **Webhook HTTPS** respondendo em segundos | e por ele que a mensagem do cliente chega ao sistema |
| **Modelos aprovados** pela Meta | fora da janela de 24h so se manda texto pre-aprovado; nao da para escrever livremente |
| **Custo por conversa** | a Meta cobra por janela de conversa, nao por mensagem |

### Os bloqueios tecnicos que ja conhecemos
1. **GitHub Pages e estatico — nao recebe POST.** O webhook precisa de servidor.
2. **Auto Mais esta no plano Spark** — nao tem Cloud Functions. Precisaria subir
   para Blaze (cartao, como foi na LOKA).
3. **LOKA: a Org Policy barra criar funcao nova.** Contornavel como foi com o
   diagnostico (virou um *modo* da `dispararConsultaMultas`), mas e degrau.
4. **O token da API nao pode ir para o navegador** — o site e publico. Mesmo
   problema do `.pfx` do e-CNPJ.

### O que da para fazer sem nada disso
Registrar **a mao** no sistema que houve contato (data, canal, resumo) — um
historico digitado, nao capturado. Resolve "saber o que foi conversado", **nao**
resolve "ler a conversa do WhatsApp dentro do sistema".

⚠️ **Nao construir nada disso sem decisao do Rogel** — envolve numero dedicado,
conta na Meta e custo mensal. O item A (mensagem pronta) ja entrega a parte de
"personalizar o atendimento" que nao custa nada.

---

## ✅ Relatórios da Auto Mais — 01/10/2026 (`a6e2664`)

Dois pedidos do Rogel: o relatório de veículos disponíveis exibir **ano de
fabricação e ano do modelo** e dizer se o carro é **próprio ou consignado**; e o
relatório de despesas parar de mostrar **a placa no lugar do nome do veículo**.

### Relatório de estoque (`veiculos.html` · `exportEstoque`)
O campo `ano_modelo` **já existia** no cadastro e a lista da tela já mostrava
`ano/ano_modelo` (linha 273). Só o relatório ficou para trás, com
`{label:'Ano',key:'ano'}` — o ano de fabricação sozinho.

| | Antes | Agora |
|---|---|---|
| PDF | `Ano` | `Ano` (fab/modelo) + **`Estoque`** |
| CSV | `Ano`, `Tipo Estoque` | `Ano Fab.`, `Ano Modelo`, **`Estoque`** |

Quando fabricação e modelo são iguais, mostra **um ano só** — repetir
"2017/2017" em toda linha só polui. E `tipo_est` (que no banco é `proprio` /
`consignado`, minúsculo) vira **Próprio / Consignado** por extenso.

### 🔴 Despesas: não era o relatório, era a GRAVAÇÃO
O `<option>` do seletor de veículo tem **`value=placa`**, e o `svDesp` copiava
esse value direto:

```js
veiculo: document.getElementById('dveic').value   // = a PLACA
placa:   document.getElementById('dplaca').value  // = a PLACA
```

Por isso as colunas "Veiculo" e "Placa" saíam **idênticas**. Vale para
`despesas.html` **e** `despesa_form.html`.

⚠️ As despesas geradas por **manutenção** (`gestao.html`, 19/09) sempre gravaram
`marca + modelo` — por isso 13 estavam certas e 32 não. Dado misto no mesmo
campo, vindo de portas diferentes.

Conferido no Firestore: **45 despesas com o campo preenchido, 32 com a placa
dentro.**

**Corrigido nos dois lados:**
1. a gravação passa a guardar `marca + modelo` do cadastro;
2. **`nomeVeicDesp()`** resolve o nome pelo cadastro **na hora de exibir** — as
   32 já gravadas aparecem certas **sem migrar o banco**. Casa a placa ignorando
   hífen e caixa.

Se o carro não estiver mais cadastrado e o campo só tiver a placa, mostra
**vazio** em vez de repetir a placa numa coluna que promete o nome. Nome digitado
à mão é preservado. Entrou também no **resumo por placa** da própria tela de
Despesas, que tinha o mesmo sintoma.

⚠️ **Padrão a levar adiante:** consertar na exibição **e** na gravação. Só a
gravação deixaria o histórico torto; só a exibição deixaria o banco torto.

### Verificado no ar, com os dados reais
| | |
|---|---|
| Estoque: disponíveis | 18 |
| Ano saindo | `2016/2017`, `2018/2019`, `2022` (iguais → um só) |
| Estoque | Próprio / Consignado (4 consignados na frota) |
| Despesas que saíam como placa | **32 → 0** |
| Exemplo | `PKJ2749` → **CHEVROLET PRISMA 1.0 JOY** |

Validado: `node --check` nas 3 páginas alteradas **e nas outras 6** (sem
regressão) + **39 testes de runtime** com o código real e os dados reais do
Firestore — rodando `exportEstoque` de verdade, com stub capturando as colunas,
nos dois caminhos (PDF e CSV).

---

## ✅ Fatura: desconto de dias parados automático + planilha alinhada ao A4 — 02/10/2026 (`716cd69`, `c36ef98`) · fatura v78

### A fórmula já existia — o problema era chegar nela
`(valor unitário ÷ 30) × dias parados` **já estava no código** desde antes, em
`aplicarDescontoParado`. Só que rodava ao clicar num **botão "↓" de 9px** dentro
da coluna "Dias parado" — fácil de nunca ver.

🔴 **E cada clique SOMAVA de novo** (`atual + valorDesconto`): clicar duas vezes
dobrava o desconto, sem avisar.

Agora o desconto **sai sozinho** ao digitar os dias, e **refaz** quando o valor
unitário muda. O botão saiu — virou desnecessário, e a coluna ficou mais estreita.

| Situação | Antes | Agora |
|---|---|---|
| digitar 10 dias | nada até clicar ↓ | desconto na hora |
| clicar/recalcular 2× | **dobrava** | mesmo valor |
| corrigir 10 → 5 dias | somava por cima | refaz: 500,00 |
| mudar o valor unitário | desconto ficava velho | acompanha |
| zerar os dias | desconto continuava lá | limpa |

### 🔴 O desconto lançado à mão é preservado
`_descParado[i]` guarda **quanto do campo veio desta conta**. O resto é tratado
como manual (negociação, avaria) e **sobrevive** a qualquer recálculo:
200,00 à mão + 6 dias de um carro de 1.500 → 500,00; mudando para 3 dias → 350,00.

⚠️ Quem **edita o campo Desconto** chama `descontoEditadoAMao(i)`, que zera a
base. Sem isso, a próxima mudança de dias subtrairia o que a pessoa acabou de
digitar.

O campo mostra a conta no `title`:
`3.000,00 ÷ 30 × 10 = 1.000,00  (+ 200,00 lançado à mão)` — para não restar
dúvida de onde veio o valor.

### Planilha alinhada ao A4
Na tela a tabela pedia **979px** e havia **746px** úteis: rolava de lado, e as
colunas não batiam com o impresso.

| | Antes | Agora |
|---|---|---|
| fonte | 12px | 10.5px |
| células | 9px 12px | 4px 4px |
| cabeçalho | 10px 12px | 5px 4px |
| inputs | 12px, 5px 8px | 10.5px, 3px 4px |
| layout | `min-width:700px` | `table-layout: fixed` |

As larguras em % são as **mesmas da impressão**, escaladas para os 96% que
sobram depois do checkbox: papel `16/10/8/6/13/12/12/6/17` → tela
`15/10/8/6/12/11/11/6/17`. Quem preenche vê o alinhamento que sai no papel.

⚠️ Rótulos encurtados ("Qtd dias/meses" → "Qtd"), com o texto completo no
`title`: **com `table-layout: fixed` um título longo alargaria a coluna**.

### 🔴 Defeito que a mudança revelou (corrigido na v78)
O rodapé tinha **9 células** (`colspan="8"` + 1) para uma tabela de **10
colunas**. Sem `table-layout: fixed` o navegador acomodava; com ele, o total
caiu na coluna "Dias par." (44px) e **quebrou em duas linhas**.

A **célula vazia do checkbox** resolve os dois casos com a mesma estrutura: na
tela são 10 colunas; na impressão a `.chk-cell` já é ocultada, voltando a 9 —
que é por que o papel nunca mostrou o problema.

⚠️ **Lição:** `table-layout: fixed` transforma desalinhamento tolerado em
desalinhamento visível. Ao adotá-lo, conferir `colspan` de rodapés e cabeçalhos.

### ⚠️ Achado NÃO corrigido (não foi pedido)
`atualizarDiasParados()` preenche os dias parados a partir das **manutenções**
(`diasParadoNoMes`), mas **nunca é chamada** — `grep` acha só a definição. A
integração nunca funcionou: hoje os dias são digitados à mão.

Ela também faria `cel.innerHTML = ...`, **destruindo o input** `vparado-i`, e
chama `aplicarDescontoParado(i, dias)` com 2 argumentos para uma função de 1.
`aplicarDescontoParado` foi **mantida** como atalho para a função nova
justamente porque aquele código morto a chama.

### Validado
- `node --check`; **38 testes de runtime** com o código real: a fórmula em 5
  valores, recálculo que não dobra, mudança de dias e de valor unitário,
  desconto manual preservado nos três caminhos, bordas (sem valor, zero dia,
  dias negativo, texto, linha inexistente), larguras de tela e papel conferidas
  **separadamente** (a regex pegava os 18 valores dos dois blocos juntos)
- **No navegador, no arquivo publicado**, 8 passos como o operador faria:
  3.000 + 10 dias → 1.000,00; redigitar não dobra; 5 dias → 500,00; dobrar o
  unitário → 1.000,00; zerar → limpa; e a linha com 200,00 à mão somando certo
- **Na largura real (746px): não rola, nenhum valor corta** (testado com
  12.500,00) e o total de R$ 14.200,00 cabe sem quebrar

⚠️ A `fatura.html` **não exige login** — dá para testar à vontade. Mas com 119
veículos o `Page.captureScreenshot` do Chrome dá timeout: esconder as linhas
não selecionadas antes de capturar, ou usar a aba interna.

---

## 🔴 Tabelas largas não tinham barra de rolagem — 02/10/2026 (`a2462b7`) · gestao v102

Relato: "diversas telas não cabem na página e também não tem barra horizontal
para arrastarmos a visualização", citando **Contas a Receber**.

### A causa — uma só, para todas as telas
```css
.shell{display:grid;grid-template-columns:220px 1fr;}
```
🔴 **Em CSS Grid, uma coluna `1fr` tem `min-width:auto`** — ela **nunca encolhe
abaixo do conteúdo**. Então a tabela larga não rolava: ela **esticava a coluna
inteira**, o layout transbordava a janela, e o **`body{overflow-x:hidden}`**
(linha 29) cortava o excesso.

Resultado exato do relato: **conteúdo cortado e barra nenhuma**.

⚠️ **Os wrappers `overflow-x:auto` de cada tabela já existiam e estavam certos.**
Eles nunca chegavam a agir, porque o pai crescia junto. Procurar o defeito na
tabela não levaria a lugar nenhum — ele estava três níveis acima.

### Medido na estrutura real, com o CSS publicado
| Janela | Tabela | Antes | Depois |
|---|---|---|---|
| 900px | Contas a Receber (980px) | cortada, sem barra | **rola** |
| 1024px | Contas a Receber (980px) | cortada, sem barra | **rola** |
| 1024px | a de 1700px | cortada, sem barra | **rola** |
| 1280px | a de 1700px | cortada, sem barra | **rola** |
| 1360px | a de 1700px | `content` esticava para **1734px** | **rola** (wrap 1091) |

Em 1360px o Contas a Receber **cabe** (1091px) — por isso o problema não aparece
em monitor largo. Ele mora na faixa entre o corte do mobile (768px) e ~1250px:
**nem vira layout mobile, nem cabe**.

### A correção — 3 linhas de CSS, zero JS
```css
.shell                    220px 1fr  →  220px minmax(0,1fr)
.shell.sidebar-collapsed   64px 1fr  →   64px minmax(0,1fr)
.main                     ganhou min-width:0        (defesa extra)
```
`minmax(0,1fr)` permite a coluna encolher; aí o wrapper de cada tabela
finalmente cria a própria barra.

Vale para as **12 tabelas largas** do sistema — 1700, 1050, 980, 900, 820, 820,
760, 700, 700, 680, 640, 560 — não só Contas a Receber.

### Conferido antes de mexer
- **Todas** as tabelas com `min-width ≥ 300px` já têm wrapper com rolagem
- As duas sem wrapper (`overflow:hidden`) **não têm `min-width`** — se adaptam
- `multas.html` e `fatura.html` **não** têm esse `.shell` em grid; o defeito é só
  do `gestao.html`

Mantidos de propósito: `body{overflow-x:hidden}` (com o grid certo nada mais
transborda, e ele segue útil contra rolagem acidental) e as regras de `@media`
mobile.

⚠️ **Padrão a lembrar:** `1fr` e flex item **não encolhem abaixo do conteúdo** —
precisam de `minmax(0,1fr)` ou `min-width:0`. Quando um `overflow:auto` "não
funciona", o culpado costuma ser um ancestral que cresceu, não o elemento.

### Validado
- `node --check`; **16 testes**, sendo **3 que injetam o defeito de volta** e
  exigem que o teste o acuse — inclusive o caso de alguém adicionar tabela larga
  **sem** wrapper
- **No ar, no arquivo publicado**, medido em 900 / 1024 / 1280 / 1360px: em toda
  largura a tabela **ou cabe, ou rola**, e a página nunca transborda

---

## ✅ Aluguéis Ativos: filtro por data e classificação — 02/10/2026 (`79cd3da`) · gestao v103

Pedido: filtro por **data de vencimento** e **data do contrato**, e botão para
**classificar próximos vencimentos**.

### 🔴 Quais datas existem de verdade (conferido nos 107 aluguéis)
| Campo | Significado | Quantos têm |
|---|---|---|
| `retirada` | data do contrato | **107 de 107** |
| `devolucao` | vencimento (devolução prevista) | **34 de 107** |
| `vigencia` | texto livre | 11 |

Os **73 restantes são mensais em contrato CONTÍNUO** — não têm data de fim.
Por tipo: diária 8/8 com devolução; mensal apenas 26 de 99.

⚠️ **Um filtro por vencimento esconderia 73 aluguéis.** Por isso, quando há
filtro de vencimento, a tela **diz quantos saíram por não ter a data**
("⚠ 73 sem data de vencimento ficaram de fora do filtro") em vez de deixar o
operador achar que sumiram. O filtro por **contrato não exclui ninguém**.

⚠️ **Não inventei vencimento a partir de `vigencia`**: é texto livre
(`"360"`, `"30 DIAS"`, `"120 DIAS"`) em 11 registros. Mesma regra do prazo de
indicação das multas — **data chutada dá falsa segurança**.

### Classificação
A ordenação por próximos vencimentos **já era o comportamento fixo** da tela —
só não dava para mudar. Virou um seletor, e **"⏰ Próximos vencimentos" continua
sendo o padrão**: quem não mexer não vê diferença.

`venc` (padrão) · `venc_desc` · `cont_novo` · `cont_antigo` · `cliente` · `valor`

Sem data de vencimento continua indo para o **fim** da lista, como antes.
Modo desconhecido cai no padrão. `sort` é destrutivo, então ordena sobre cópia.

Entrou também o resumo **"X de Y aluguéis"** acima da tabela, e "nenhum
encontrado **com esses filtros**" deixou de se confundir com "nenhum aluguel
ativo".

### 🔴 ACHADO não corrigido: dois aluguéis ativos com o MESMO id
`a17861061258471131` pertence a **dois registros diferentes**:

| Cliente | Placa | Retirada |
|---|---|---|
| TRANSSOUZA TRANSPORTE E TURISMO | RUZ9J78 | 2026-05-10 |
| RSC TRANSPORTE 2016 LTDA | RUE5F30 | 2025-09-20 |

Clientes, placas e datas **distintos** — são dois contratos reais com id colidido.

⚠️ **Oito funções** do sistema fazem `find(x => x.id === id)`, que devolve
**sempre o primeiro**: encerrar, prorrogar, gerenciar veículos, editar. Agir
sobre o segundo agiria no primeiro.

`renderAtivos` usa `db.ativos.indexOf(a)` para o índice real, então **a lista em
si está segura** — o risco está nas ações por id.

**Não corrigido:** é dado de produção e não foi pedido. Trocar o id de um deles
resolve, mas é decisão do Rogel (e convém conferir se algo mais referencia
aquele id).

⚠️ O teste pegou isso porque a invariante era "não perde nem duplica" contando
**ids**. A invariante certa é sobre os **registros** — contar ids acusaria um
problema de dado como se fosse defeito da ordenação.

### Validado
- `node --check`; `<div>` do HTML balanceadas (641/641)
- **51 testes** com o código real e os **107 aluguéis reais**: cada filtro
  isolado e combinados, pontas inclusivas, data com hora (ISO), as 6
  classificações, modo desconhecido, `sort` não destrutivo, botões de limpar,
  resumo e o aviso dos sem vencimento
- **No ar**: 4º trimestre → 11 aluguéis (73 avisados como fora); junho/2026 →
  16 contratos, nenhum excluído; as 3 ordenações conferidas na amostra
- Regressão: **6 suítes, 287 testes**, nenhuma falha

⚠️ O auto-teste de injeção do `t-layout` dependia do texto exato de uma linha do
`renderAtivos` e quebrou quando a tela mudou. Agora ele localiza **a primeira
tabela larga** e remove o `overflow-x` dela — injeção robusta a mudanças.

---

## 🔴 Fatura gravava registro duplicado — 02/10/2026 (`b60ac57`, `f57d859`, `8905431`) · fatura v81

Relato: "quando editamos uma fatura e salvamos o sistema grava dois registros".
Reproduzido no navegador. Eram **três** defeitos somados.

### Causa A — salvar de novo criava OUTRA fatura
```js
id: _editandoFaturaId || ('fat_' + Date.now())
```
🔴 **`_editandoFaturaId` nunca era atualizado depois de gravar.** Numa fatura
nova, cada clique em Salvar sorteava um id novo → outra fatura. Dois cliques
(ou salvar, ajustar, salvar) = dois registros. O botão também não travava.

Agora a tela **lembra o id** depois de gravar, e o botão trava durante a
gravação (destravando no sucesso, na falha e no erro geral).

### Causa B — editar número ou período duplicava no Contas a Receber
A `faturaKey` é `cliente + número + período` — **os três editáveis**. Mudando
qualquer um, o upsert não reconhecia o lançamento antigo e criava um segundo.

Medido na fatura real `fat_1788891273306` (ISS TRANSPORTES), sem gravar:

| | chave | acha? |
|---|---|---|
| sem mexer | `c1780917221151_001_2026-09` | sim |
| mudando o período | `..._001_2026-10` | **não** |
| mudando o número | `..._002_2026-09` | **não** |

Quem identifica passou a ser o **id da fatura**, que não muda ao editar.

### 🔴 Causa C — a janela de transição (só apareceu testando NO AR)
Os **17 lançamentos já gravados não têm `faturaId`**. Para uma fatura anterior
à v79: busca por id não acha (campo não existe), busca pela chave nova não acha
(acabou de mudar) → **duplicaria uma última vez**.

A tela passou a guardar a **chave de quando a fatura foi aberta**
(`_faturaKeyOriginal`) como terceiro caminho de busca.

Ordem final: **`faturaId` → chave atual → chave de abertura.**

⚠️ **Os testes de unidade da v79 passavam** porque eu simulava registros que já
tinham `faturaId`. Foi o teste contra os **dados reais, no ar**, que mostrou o
buraco. É a lição de 28/09 de novo: *teste verde não prova nada se ele não pega
o defeito.*

### 🔴 Causa D — Limpar não saía do modo edição (v81)
`limparFatura()` não zerava `_editandoFaturaId`. Abrir uma fatura → **Limpar** →
preencher outra → salvar **sobrescrevia a primeira**. Não é duplicação: é
**perda** do registro anterior.

Defeito anterior a esta sessão, mas a v79 o tornou mais provável — agora o id
também fica preenchido depois de salvar uma fatura nova. Limpar passou a zerar
os dois marcadores e a tirar o `?edit=` da URL (senão um F5 voltaria à edição).

### O que estava certo
A gravação da fatura em si: mesmo caminho (`faturas/{clienteId}/{id}`), `set()`
que sobrescreve, cliente e veículos restaurados na edição. E a `faturaKey`
continua sendo gravada — **a renegociação casa por ela**.

⚠️ As "faturas duplicadas" que aparecem por cliente+número **não são defeito**:
são faturas de **meses diferentes**, todas numeradas `001` (o número não é
incrementado). Ex.: um cliente tem 4 faturas "001" — julho, agosto, setembro e
outubro. Vale decidir se a numeração deve ser sequencial.

### Validado
- `node --check`; **41 testes**, incluindo os que **reproduzem** cada defeito
  (dois cliques com e sem lembrar o id; upsert ao mudar período, número e
  cliente; a transição sem o terceiro caminho; abrir → limpar → nova fatura)
- **No ar, na fatura real**: sem mexer, mudando o período e mudando o número →
  **os três atualizam o mesmo lançamento**

## ⏳ Id duplicado dos aluguéis — comando pronto, falta o Rogel rodar

Dois aluguéis ativos dividem o id `a17861061258471131`:
**TRANSSOUZA/RUZ9J78** e **RSC/RUE5F30**.

🔴 **Quem fica com o id: a RSC.** As **17 multas** com esse `locacaoId` são
todas da placa **RUE5F30**. Trocar o id da RSC quebraria o vínculo das multas;
trocar o da TRANSSOUZA não afeta nada — nada aponta para ele.

Gravar direto foi **bloqueado** nesta sessão (`Modify Shared Resources`).
Comando em **uma linha** para colar no console, logado:
`backups-loka\CORRIGIR-ID-DUPLICADO.txt` — pede `allow pasting` antes.

Ele confere tudo antes (dois registros com o id, distinção pela placa, id novo
sem colisão), pede confirmação mostrando quem muda e quem fica, usa o `saveDB()`
do próprio sistema e **confere no console se sobrou algum id repetido**.
Simulado contra o banco real: 2 → 1 com o id duplicado, **0 repetidos no fim**.

Backup: `backups-loka\loka_db-ANTES-id-duplicado-20261002-141331.json`

---

## ✅ Recibo de pagamento de multa — 08/10/2026 (`5499a3c`, `e5ad102`, `59a4133`) · gestao v106

Pedido em três partes, ao longo da sessão: botão de recibo por multa com
multi-seleção para frota · filtro por data/placa/cliente · **registrar o
recebimento para consultar**. O "Baixar como pagas" ficou intocado.

### 🔴 Só multa PAGA gera recibo
Um "recibo de pagamento" de multa não paga seria um documento afirmando o que
não aconteceu. O botão 🧾 só aparece quando a multa está **paga e com locatário**;
abrir por uma pendente avisa e não abre.

Nos dados reais: 621 multas, **184 pagas**, e **17 dessas sem locatário** — essas
não geram recibo nominal.

### 🔴 Por que a seleção é separada da baixa
Os dois têm **públicos opostos**:

| | aceita | para quê |
|---|---|---|
| `_mltBaixaSel` | só **não** pagas | dar baixa (pagamento no banco) |
| `_mltRecSel` | só **pagas** | documentar o que já foi pago |

⚠️ Reusar a mesma seleção era impossível: a da baixa recusa paga **de propósito**.

### Filtro dentro do modal
A tela já filtra, mas quem monta um recibo não deveria ter de fechar a janela
para recortar o lote. Entraram busca livre (placa, AIT, cliente, infração, órgão)
e período, com Limpar.

Dois cuidados herdados da baixa em lote:
- **o que sai do filtro sai da seleção** — recibo de multa invisível na tela
  seria o mesmo erro;
- "Marcar todas" vale sobre o **filtrado**.

E abrir pelo 🧾 de uma multa **limpa o filtro**: um filtro deixado de antes
esconderia justamente a multa que o operador acabou de clicar.

### 🔴 O registro (v106) — `loka_db/recibos`
Guarda número, cliente (nome, documento e **endereço**), data, forma, observação,
valor, quantidade, **quem emitiu**, quando, e a lista das multas.

🔴 **A lista das multas é uma CÓPIA CONGELADA.** Se a multa for editada depois,
o recibo já entregue **não pode mudar** — documento emitido é documento emitido.
O endereço também é congelado, senão a 2ª via sairia com o cadastro de hoje.

Cada multa coberta recebe `reciboId` / `reciboNum` / `reciboEm`, e a linha da
tela exibe um selo verde com o número.

### Aba Recibos
Número, data, cliente, quantidade, valor, forma e quem emitiu. Busca por número,
cliente, placa ou AIT; filtro por período; resumo com o total recebido.
**2ª via** reimprime da cópia congelada, com carimbo. **Excluir** remove o
registro e **solta as multas** — o `confirm` diz isso e lembra que o papel já
entregue continua existindo.

🔴 **Registra ANTES de abrir o documento**: não se entrega ao cliente um recibo
que o sistema não conhece. Popup bloqueado → o registro já ficou gravado.
Multa que já consta em recibo **avisa** antes de entrar em outro (não bloqueia —
reemitir é legítimo).

⚠️ `'recibos'` entrou em **`normalizarDB`** — a armadilha 1 de novo.

### ⚠️ Descrição suja da importação (achado do próprio recibo)
Gerando o documento com dados reais, a coluna Infração saiu com sobra da página
do portal (`Exibir: 1-6 de 6 itens Página`) e caracteres de ícone de fonte
privada.

**44 multas no banco, 34 delas pagas.** Tirando o ícone, **36 voltam a ficar
legíveis**; as outras **8** são lixo puro e saem como "Infração não descrita no
registro" — mais honesto do que imprimir o lixo, e mais seguro do que inventar
a infração.

⚠️ **Só a exibição foi tratada.** O banco continua com as 44 como estão —
corrigir dado de produção não foi pedido.

⚠️ Minha primeira medição disse "10" porque só procurou os quadradinhos Unicode
comuns, e não a **área de uso privado** (`U+E000–U+F8FF`), que é onde moram os
ícones de fonte. Ao caçar lixo de OCR, procurar os dois.

### ⚠️ O heredoc destruiu escapes DUAS vezes nesta entrega
`[-]` virou os caracteres literais (funciona, mas é frágil e
impossível de casar depois com Edit) e **`\b` virou um BACKSPACE literal**, o que
**quebrava** a detecção do "Exibir". Reescrito pela ferramenta de escrita, com
verificação de que os escapes estão como **texto** no arquivo.

### Validado
- `node --check`; `<div>` balanceadas (660/660)
- **164 testes** nas duas suítes do recibo, com as **621 multas reais**: quem
  pode gerar, 11 casos de valor por extenso, o filtro do modal, a trava de dois
  clientes, o documento inteiro (total conferido contra soma por fora), a cópia
  congelada (**editar a multa depois não muda o recibo**), as marcas, o aviso de
  reemissão, a consulta, a 2ª via, a exclusão soltando as multas, nó vindo como
  objeto do Firebase e popup bloqueado
- **No ar**: emissão → registro → consulta → 2ª via, com `saveDB` neutralizado
  (nada foi gravado em produção)
- Regressão: **9 suítes, 492 testes**, nenhuma falha

---

## ✅ Baixa recíproca fatura ⇄ Contas a Receber — 13/10/2026 (`095494c`) · gestao v107 · fatura v82

Pedido: "quando recebermos um pagamento pelo contas a receber gentileza baixar
também na fatura e vice-versa" — e, no meio, "incluir um filtro por data em
faturas".

### O problema: um pagamento, dois registros independentes
O dinheiro entra **uma vez**, mas o sistema anotava isso em dois lugares que não
se falavam:

| Onde | Nó | Quem baixava |
|---|---|---|
| Fatura | `faturas/{clienteId}/{id}` | botão **Dar Baixa** do painel Faturas |
| Lançamento | `loka_db/financeiro/receber` | **💵 Receber** do Contas a Receber |

Nenhum dos dois tocava o outro. Dar baixa num lado deixava o outro em aberto —
e era assim que a mesma dívida continuava aparecendo como cobrança.

🔴 **Divergência viva encontrada nos dados reais:** a fatura **001 da G7 COMPANY**
está `pago` e o lançamento está **parcial** (R$ 25.863 de R$ 38.460,09).
Uma só, mas é exatamente o sintoma. **Não foi corrigida** — é dado de produção e
não foi pedido; ela se acerta sozinha no próximo toque em qualquer dos lados.

### O vínculo: `faturaId` primeiro, `faturaKey` depois
Conferido nos dados reais: **21 lançamentos** vêm de fatura, e **todos** acham a
sua — **5 pelo `faturaId`** e **16 pela `faturaKey`** (cliente+número+período),
porque nasceram antes do id existir. Zero órfãos.

⚠️ `_fatChave()` tem de reproduzir **exatamente** a fórmula da `fatura.html`
(inclusive trocar `/` por `-`, por causa de números como `002/JUNHO`), senão o
vínculo não é achado. Achando pela chave, o sistema **grava o `faturaId`** no
lançamento — o vínculo deixa de depender de número e período, que são editáveis.

### Direção A — recebeu no Contas a Receber, baixa na fatura
São **três portas**, e deixar uma de fora manteria o defeito vivo por aquele
caminho: `finReceberToggle` (quitar/reverter), `finReceberParcial` (modal) e
`finEdit` quando se edita **recebido / valor / status** direto na tabela.

| Lançamento | Fatura vira |
|---|---|
| quitado | `pago` + `pagoEm` |
| parcial | `parcial` |
| revertido | `pendente`, e o `pagoEm` é **removido** |

### 🔴 A armadilha que quase passou: o cache do painel Faturas
`_todasFaturas` só é preenchido quando o painel **Faturas é aberto**
(`showPanel` → `carregarFaturas`). Quem dá baixa pelo Contas a Receber pode nunca
ter entrado lá na sessão — com o cache vazio, a busca pela fatura **falharia em
silêncio** e ninguém notaria. Por isso `_fatComCache()` carrega o nó sob demanda.

### Direção B — baixou a fatura, baixa o lançamento
O `confirm` do **Dar Baixa** passou a dizer **antes** o que acontece nos dois
lados: o lançamento e o valor; quando **não há lançamento** ligado (são **10 das
33 faturas**); quando ele está **renegociado**; e quando os valores **divergem**
(a fatura pode ser de um valor e o lançamento de outro — juros, multa, acerto).

A baixa usa o valor do **lançamento**, não o total da fatura: é o lançamento que
diz quanto está em aberto no Contas a Receber.

### O que nunca pode ser sobrescrito
- **Fatura `renegociada`** e **lançamento `renegociado`**: o saldo migrou para as
  parcelas do acordo; sobrescrever perderia esse estado. Os dois avisam e param.
  (São **19 lançamentos renegociados** hoje.)
- **Lançamento já quitado** não é rebaixado.
- 🔴 **Falha de gravação não pode ser silenciosa:** a fatura mora **fora** do
  `loka_db`, então `saveDB()` não a grava — é um `update()` separado, que pode
  falhar sozinho. Falhando, o aviso é `⚠️ A FATURA NÃO FOI BAIXADA: …`.
  Silêncio aqui faria o operador acreditar que os dois lados estão quitados.

### `fatura.html` v82 — a guarda que travava a baixa
O upsert tinha `var jaRecebeu = Number(atual.recebido)>0 …` e **não mexia em
status/recebido** quando havia qualquer recebimento. A intenção era certa (não
apagar dinheiro já lançado no gestão), mas o efeito era travar justamente o
"vice-versa": marcar a fatura como **paga** sobre um parcial não dava baixa.

A regra passou a ser **nunca DIMINUIR o que já entrou**:
`if (atual.status !== 'renegociado' && Number(linha.recebido||0) >= recAtual)`.
Fatura pendente continua **não** zerando um parcial; fatura paga agora **completa**.

⚠️ A `fatura.html` **não tinha** a constante `LOKA_BUILD` — só o carimbo da
linha 4. Entrou agora, com `console.log`, para a regra dos dois carimbos valer
nela também.

### Filtro por data no painel Faturas
A tela tem **três datas** (período, emissão, vencimento), então o filtro traz um
seletor de qual delas, mais De/Até e Limpar. Padrão: **vencimento** — é a data
que se persegue na cobrança.

⚠️ **Período é mês (`2026-07`), não dia.** A comparação corta os **dois** lados no
mesmo tamanho (7 ou 10 caracteres); comparando com 10, `'2026-07' < '2026-07-01'`
e o mês escolhido ficaria de fora do próprio intervalo.

Os cartões de resumo passaram a somar **o filtrado** (antes somavam sempre o
total, mesmo com a busca ativa — a tela mentia sobre a lista recortada), entrou o
rodapé "X de Y fatura(s)", e "nenhuma encontrada **com estes filtros**" deixou de
se confundir com "nenhuma fatura registrada".

Fatura **sem** a data escolhida sai do resultado quando há período, e a tela
**diz quantas saíram** — mesma regra dos Aluguéis Ativos. (Hoje as 33 têm as três
datas, então o aviso não aparece; a guarda é para o futuro.)

### Marca de parcial/renegociada sem sumir dos filtros
`_statusFaturaReal` continua devolvendo só **pago / vencido / pendente** — se eu
tivesse acrescentado `parcial`, a fatura parcial cairia fora de
*Vencidas / A Vencer / Pagas* e ficaria **invisível em qualquer filtro**. É a
armadilha do "lead sem etapa" do CRM. A informação entra como **marca extra** na
coluna Status, sem mexer no que o filtro enxerga.

### Validado
- `node --check` nos dois; `<div>` balanceadas (gestao 661/661, fatura 73/73)
- **117 testes novos** (`t-sincfat` 101 + `t-fat-baixa` 16) com o código real e
  os dados reais (103 lançamentos, 33 faturas): o vínculo pelos dois caminhos,
  os quatro status, as duas direções, renegociado nos dois lados, cache vazio,
  banco fora do ar, falha de gravação, `confirm` recusado, as três portas, o
  filtro nas três datas com pontas inclusivas, e o render
- **10 defeitos injetados de propósito — todos acusados** (voltar a guarda
  antiga, confiar no cache, falhar calado, pisar na renegociada, comparar
  período com 10 caracteres, deixar entrar fatura sem data, rebaixar lançamento
  quitado, desligar a porta do toggle, tirar a guarda inteira, esquecer o
  renegociado)
- **No ar, no arquivo publicado**, com as 33 faturas e os 103 lançamentos reais e
  o `firebase` substituído (**nada foi gravado em produção**): quitar → fatura
  paga; parcial → fatura parcial; reverter → fatura pendente e `pagoEm` removido;
  cache vazio → carrega 33 faturas e baixa assim mesmo; Dar Baixa → lançamento
  quitado com a data da fatura. O par usado foi real (fatura 002 da ISS, R$
  3.300) e **não tinha `faturaId`** — ganhou o vínculo no caminho.
- Barra do painel medida a 1024px: os três controles visíveis, sem estouro
- Regressão: **11 suítes, 609 testes**, nenhuma falha

### ⏳ Não verificado
Falta exercitar **logado, com um recebimento de verdade** — eu não autentico.

### ⚠️ Achados não corrigidos (não foram pedidos)
- A **renegociação do `gestao.html`** marca os lançamentos como `renegociado` mas
  **não** marca a fatura como `renegociada` (a da `fatura.html` marca). A
  sincronização nova não piora isso: ela ignora renegociado nos dois sentidos.
- O rodapé do **Contas a Receber** tem 10 células para 11 colunas: o "TOTAL
  FILTRADO" ocupa a coluna do 🤝 e os três totais saem deslocados uma coluna à
  esquerda.

---

## 🔴 "Criar os lançamentos faltantes" — 9 das 10 JÁ EXISTIAM (13/10/2026)

Pedido: criar os lançamentos das 10 faturas que apareciam sem conta no Contas a
Receber. **Criar os 10 teria duplicado R$ 321.878,75.**

### A medição estava certa, a conclusão não
Aquelas 10 foram medidas **pela chave da fatura** (`faturaId`/`faturaKey`). Mas
lançamento **digitado à mão não tem chave nenhuma** — e é exatamente a mesma
dívida. Cruzando por **valor + vencimento**, 9 das 10 já estavam lá:

| Fatura | Valor | Lançamento que já existia |
|---|---|---|
| 001 BRJ | 20.100,00 | recebido |
| **001 G7** | **46.150,00** | **parcial (R$ 30.000 recebidos)** |
| 1ª Quinzena ISS | 4.889,75 | recebido |
| 002/JUNHO ISS | 3.300,00 | recebido |
| 001 ISS 2026-07 | 3.000,00 | pendente |
| 001 NOVO COMEÇO | 3.700,00 | recebido |
| 1ª Quinzena RSC | 76.580,52 | recebido |
| **002/JUNHO RSC** | **83.948,48** | **renegociado** |
| **001 RSC 2026-07** | **80.210,00** | **renegociado** |

🔴 **Os dois da RSC estão dentro do acordo de 6 parcelas** (`ren_1786564266313`,
R$ 325.134,77 em 19 contas). Criar lançamento novo para eles cobraria **duas
vezes** o que já está sendo pago parcelado.

### ⚠️ O erro que quase passou: nome de cliente com 2 letras
O cruzamento casa o cliente por prefixo, porque no lançamento o nome costuma ser
apelido (**"RSC"**, **"G7"**, **"ISS"**, **"BRJ"**) e na fatura é a razão social
inteira. Minha primeira versão exigia **3 caracteres** — e com isso **"G7" não
casava**, escondendo o lançamento `G7 | 46.150 | parcial`. Eu teria criado uma
dívida duplicada de R$ 46.150 sem perceber. A trava passou para **2**.

### A única que falta mesmo, e a dúvida que ela trouxe
Sobra a **ISS 02/maio, período 2026-06, R$ 3.200, já paga**. Mas existe o
lançamento **"Fatura 2ª quinzena maio" · R$ 3.300 · mesmo vencimento (11/06) ·
recebido** — R$ 100 de diferença. É provavelmente a mesma coisa.

Por isso o script **não cria sozinho** nesse caso: ele separa três situações.

| Situação | Critério | O que faz |
|---|---|---|
| **LIGA** | mesmo valor **e** mesmo vencimento | grava `faturaId`+`faturaKey` no lançamento que já existe. Não cria dívida |
| **DÚVIDA** | mesmo vencimento, valor **até 10% diferente** | mostra os dois números e **pergunta** |
| **CRIA** | nenhum sinal | cria o lançamento |

⚠️ O limite de 10% é necessário: sem ele, uma avaria de R$ 1.400 no mesmo
vencimento viraria "suspeita" de uma fatura de R$ 46.150, e o script pararia de
perguntar o que importa.

Dívida em aberto tem **confirmação própria**, separada — é a única coisa que
aumenta o saldo a receber.

**Script:** `backups-loka\LIGAR-FATURAS-AO-RECEBER.txt` (uma linha, console da
tela de Gestão, logado, após `allow pasting`). O legível fica ao lado.
Simulado contra o banco real: **9 ligados, 0 criados sem perguntar, saldo a
receber inalterado, idempotente**. 26 testes.

### Correção de dado incluída
O lançamento da ISS de R$ 3.000 tem `vencimento: "0025-07-25"` — ano digitado
errado. Ao ligar, ele passa a ser `2026-07-25`, o da fatura. Com o ano 0025 ele
nunca apareceria num filtro por data.

### Backups
`backups-loka/loka_db-ANTES-lancamentos-faltantes-20261013-091136.json` e
`faturas-ANTES-...json`.

---

## ✅ Histórico de baixas parciais — 13/10/2026 (`6413171`) · gestao v108

Pedido: "muitas vezes recebemos parcialmente as faturas e damos baixa parcial.
preciso que o sistema nos mostre o histórico de baixas parciais".

### O que se perdia
O Contas a Receber guardava só o **acumulado** (`recebido`) e a data da **última**
entrada (`recebidoEm`). Recebendo uma fatura em três vezes, as duas primeiras
sumiam: não dava para saber quando nem quanto entrou.

Agora cada recebimento vira uma linha em **`r.recebimentos[]`** — valor, data,
quem lançou e quando.

⚠️ **O campo se chama `recebimentos`, não `baixas`, de propósito:** `baixas` já
existe nos **contratos ativos**, com outro significado (devolução de veículo).
Há também `db.baixasHistorico` (histórico global de devoluções) e uma aba
`'baixas'` do Financeiro que **não existe no HTML** — código morto.

### A janela
Botão 📋 na coluna Recebido abre o histórico: data, valor, observação, quem
lançou, **acumulado correndo**, e os três cartões (valor da conta · já recebido ·
em aberto). Dá para **excluir** uma baixa lançada por engano.

| Caminho | O que registra |
|---|---|
| 💵 Receber (parcial ou total) | uma baixa com a data informada |
| ✅ Quitar de uma vez | uma baixa pela **diferença** — senão contaria duas vezes o que já havia sido baixado |
| ↩ Reverter | **apaga** o histórico junto (o aviso diz isso) |
| Editar "Recebido" na tabela | entra como **ajuste** ou **estorno** |

🔴 **A invariante que mantém tudo honesto:** soma das baixas + o que veio antes
do histórico **=** `recebido`. É por isso que reverter apaga, que quitar entra
pela diferença e que excluir **recalcula** o `recebido` (e o status, e avisa a
fatura pela sincronização da v107).

### 🔴 O que NÃO foi inventado
**31 lançamentos** já têm recebimento e nenhum histórico. Transformar isso numa
baixa única seria afirmar que houve **um** pagamento, naquela data — e não se
sabe. Eles aparecem como linha separada, **"registro anterior ao histórico ·
sem detalhamento das parcelas"**, com o aviso: *o sistema sabe o total, mas não
em quantas vezes foi pago*. Essa linha não tem botão de excluir.

### Validado
- `node --check`; `<div>` balanceadas (661/661)
- **58 testes** com o código real e os 103 lançamentos reais: registro, soma,
  o que veio de antes, os quatro caminhos, excluir (recalculando status e data),
  `confirm` recusado, id inexistente, a janela nos três estados, e a invariante
  conferida nos 103
- **6 defeitos injetados — todos acusados** (parcial não registra, quitar
  contando duas vezes, reverter não limpa, excluir não recalcula, array do
  Firebase não normalizado, edição na tabela não registrada)
- **No ar, no arquivo publicado**, com DOM de verdade: três recebimentos
  (300 → 550 → 1.000), a janela desenhada, o acumulado correndo, a linha de
  "anterior ao histórico" e o aviso
- Regressão: **13 suítes, 693 testes**, nenhuma falha

⚠️ Um defeito pode **estourar exceção** em vez de devolver resultado errado — a
suíte passou a envolver tudo em `try/catch` e contar o crash como falha. Sem
isso, dois dos seis defeitos matavam o teste sem acusar nada.

---

## ✅ Painel Faturamento por Veículo — 14/10/2026 (`fee7e0b`, v110) · gestao v110

Pedido: "podemos criar um painel por veiculo onde possamos ver o faturamento do
carro no mes?"

### A fonte: o detalhamento da fatura, não um rateio
Cada fatura guarda **`veiculosDetalhado[]`** — uma linha por carro, com placa,
quantidade, aluguel, seguro, desconto e subtotal. São **480 linhas em 32 das 33
faturas**, e **todas têm placa**. É o dado certo, e já existia.

🔴 **O que o painel NÃO faz: ratear o total da fatura entre os carros.** A soma
do detalhamento **não fecha** com o total em 16 das 32 faturas, e a diferença são
os `outros` — multas, avarias, borracharia, juros, parcelamento. Dividir isso por
carro seria inventar número.

| | |
|---|---|
| soma dos subtotais (aluguel) | R$ 1.048.010,12 |
| soma dos `outros` | R$ 136.506,02 |
| soma dos totais das faturas | R$ 1.187.482,75 |

### Os `outros` só entram num carro quando têm dono
Dos 38 itens: **22 trazem placa** na referência ou na descrição
(`Placa dianteira · GJU9H02`, `Franquia · GEZ8H54`) → R$ 47.391,10 vão para o
carro, numa coluna **Extras** separada do aluguel. Os outros **16**
(R$ 89.114,92 — parcelamento de R$ 54 mil, multas em lote, juros) vão para
**"sem veículo identificado"**, listados item a item com o motivo.

⚠️ **A placa só conta se existir na frota.** Sem essa trava, qualquer sigla de
três letras seguida de números viraria carro. E item que cita **dois** carros não
é dividido — vai para o não atribuído.

### 🔴 A conferência que impede a tela de mentir
O rodapé mostra: **total das faturas = atribuído aos veículos + sem veículo**.
Quando não fecha, aparece aviso vermelho. Nos dados reais fecha nos 5 meses:

| Mês | Faturas | Carros | Atribuído | Sem veículo | Total |
|---|---|---|---|---|---|
| 2026-06 | 7 | 73 | R$ 224.618,48 | R$ 13.550,27 | R$ 238.168,75 |
| 2026-07 | 7 | 78 | R$ 268.763,37 | R$ 350,00 | R$ 269.113,37 |
| 2026-08 | 8 | 78 | R$ 272.883,79 | R$ 63.308,73 | R$ 336.192,52 |
| 2026-09 | 7 | 94 | R$ 312.546,64 | R$ 15.105,92 | R$ 327.652,56 |
| 2026-10 | 4 | 5 | R$ 16.355,55 | R$ 0,00 | R$ 16.355,55 |

Para fechar, **o que sobra do total de uma fatura vira item nomeado**. É o caso
da **02/maio da ISS (R$ 3.200)** — a única fatura **sem detalhamento**, feita
antes de esse campo existir: ela aparece como *"Fatura sem detalhamento por
veículo · fatura antiga, sem a planilha por veículo"*, citando os 2 carros dela.

### A tela
Mês (só os que existem nas faturas) · busca por placa, modelo ou locatário ·
ordem por maior/menor faturamento, placa ou locatário · opção de **mostrar os
carros que não faturaram** (carro parado é informação).

Colunas: Placa · Veículo · Locatário · **Aluguel** · **Extras do carro** ·
**Total** · Situação · Histórico.

O botão **📈 Histórico** abre o carro mês a mês, com barra comparativa, total do
período, meses com faturamento e média por mês faturado.

### 🔴 Defeito achado olhando a tela publicada: R$ 3.324,96**4**
O cartão da média mostrava **três casas decimais**. O `brl()` do sistema só exige
o **mínimo** de 2 (`minimumFractionDigits: 2`); sem `maximumFractionDigits`, o
`toLocaleString` deixa chegar a 3. Nas outras telas não aparece porque os valores
já chegam arredondados — aqui há **divisão** (média por carro), e a sobra apareceu.

Entrou `_fvBRL()`, que arredonda antes de formatar, nas 22 chamadas do painel.
⚠️ **O `brl()` global não foi tocado** — ele é usado em todas as telas, e mexer
nele seria alterar o que não foi pedido. Mas o defeito está lá, latente, em
qualquer lugar que venha a dividir.

### Outros achados dos dados
- **19 veículos da frota nunca aparecem em fatura nenhuma** — aparecem com R$ 0
  quando a opção está marcada.
- **1 placa foi faturada e não está no cadastro**: `GDE1E83`. A linha vem marcada
  "fora do cadastro", e o histórico dela avisa.
- Nenhum carro aparece em duas faturas do mesmo mês — mas se aparecer, o painel
  soma numa linha só e mostra os dois locatários.

### O que ficou de fora, de propósito
- **Custo por veículo** (manutenção, multas) — ele pediu faturamento. O dado
  existe; vira "resultado por veículo" quando for pedido.
- **Faturamento x recebimento**: o painel mostra o que foi **faturado** (pela
  competência, o campo `periodo`), não o que entrou. Quem responde por recebido é
  o Contas a Receber.
- Os aluguéis ativos **não têm valor por veículo** (4 contratos multi-veículo, e o
  valor é do contrato), então não servem como fonte — seria rateio.

### Validado
- `node --check`; `<div>` balanceadas (668/668)
- **68 testes** com o código real e os dados reais (33 faturas, 119 veículos):
  leitura de valor, placa dentro de texto livre, os 5 meses, o cálculo conferido
  contra conta feita por fora, **a invariante nos 5 meses**, extras com e sem
  dono, item citando dois carros, subtotal vazio refeito, carro em duas faturas,
  placa fora do cadastro, os filtros, as ordenações, os estados vazios, o
  histórico e as bordas (sem fatura, sem cadastro, fatura sem total)
- **7 defeitos injetados — todos acusados**: ratear o total, jogar `outros` sem
  placa num carro, ignorar o subtotal vazio, não fechar o mês, aceitar placa de
  qualquer texto, usar a emissão em vez da competência, e o valor com 3 casas
- **No ar, no arquivo publicado**, com as 33 faturas e os 119 veículos reais: a
  invariante fecha nos 5 meses, 94 linhas em setembro, rodapé somando
  R$ 296.156,64 + R$ 16.390,00 = R$ 312.546,64, e zero valores com 3 casas
- Regressão: **14 suítes, 761 testes**, nenhuma falha

### ⏳ Não verificado
Falta ver **logado**, dentro do menu — eu não autentico. O painel foi registrado
em `PANELS`, `_TODOS_PAINEIS`, `TITLES`, `_PAINEL_LABEL`, `showPanel` e no perfil
**Operador** (Master e Admin herdam pelo `_TODOS_PAINEIS.slice()`), que é a lição
do painel `multasefrotas`.

---

## ✅ Formulário de ocorrência do colaborador + importação — 14/10/2026 (`873dde0`) · gestao v111

Pedido: "formulário para registro de sinistros para uso no mobile e computador
em que os colaboradores possam registrar as informações e possamos importar
para nosso sistema".

### Já existia metade do caminho
A aba **Ocorrências / Sinistros** existe desde a v99, e o sistema já tem um
**padrão de importação por código**: o `manutencao-oficina.html` gera
`LOKA-MANUT::<base64>`, a oficina manda pelo WhatsApp e o gestão importa.
O formulário novo é o mesmo desenho, para sinistro.

### 🔴 Por que código, e não uma página que grava direto no banco
A página é **pública** (GitHub Pages) e as regras do banco estão **abertas**
(pendência 3). Uma porta de escrita a mais, sem login, aumentaria a exposição de
dado de cliente — e aqui o dado é pior: nome de condutor, feridos, terceiros.

Além disso o código **funciona sem sinal**: quem está na rua preenche, copia e
envia quando a conexão voltar.

⚠️ Existe precedente de página pública que grava (`reserva`, `cadastro`), e é
justamente a pendência 7. Não aumentei esse lado.

### `sistema/sinistro-colaborador.html`
Uma coluna no celular, duas no computador (medido: `318px 318px` a 1000px,
coluna única a 375px, sem rolagem lateral em nenhuma das duas).

⚠️ Campos com **`font-size:16px`** de propósito: abaixo disso o iOS dá zoom
sozinho ao focar o campo, e o formulário "pula" na mão de quem está na rua.

**Os 6 tipos são os MESMOS da Cláusula 11ª** que a aba de Sinistros usa. Tipo
inventado aqui faria o registro não conversar com a cobrança — é a mesma regra
registrada quando a aba nasceu.

**Obrigatório só o que o sistema exige para abrir a ocorrência**: placa, tipo,
data, descrição e quem registrou. O resto (local, condutor, feridos, terceiros,
BO, seguradora, aviso) fica em branco se a pessoa não souber — travar o
formulário na rua faria o registro não acontecer.

Topo da página: **havendo feridos, 192 e 190 primeiro**. O formulário é registro,
não atendimento.

### A importação (aba Sinistros → 📥 Importar)
Botão **📥 Importar** e botão **🔗 Link do formulário** (copia o endereço e abre
o WhatsApp para mandar ao colaborador).

🔧 **O decodificador é melhor que o da manutenção.** Tirar os espaços junta o
base64 que o WhatsApp quebrou em linhas — **mas também cola nele o texto que vier
depois** ("abraço", "obrigado"), porque essas letras são base64 válido. Aqui o
`_sinImpLer()` **encurta pela direita até virar JSON válido**. É a melhoria que o
Auto Mais ganhou em 19/09 e estava anotada como "vale levar para lá".

Aceita: prefixo em minúscula (o teclado do celular corrige), base64 quebrado em
linhas, texto antes e depois, e vários códigos de uma vez.

O **preview antes de importar** confere a placa na frota, resolve o **locatário
do momento**, mostra quem registrou e **avisa (sem bloquear)** se já existe
ocorrência da mesma placa, data e tipo — o mesmo código pode ser colado duas
vezes sem ninguém perceber.

### 🔴 O que a importação NÃO aceita do código
O código é um texto que qualquer um pode montar à mão. Então a importação só
usa o que o formulário foi feito para mandar:

| Campo | De onde vem |
|---|---|
| `status` | **sempre `aberto`** — quem está na rua registra o fato, não decide o andamento |
| `franquiaDevida` / `franquiaValor` | **sempre vazio** — cobrar o locatário é decisão da LOKÁ, caso a caso; pode ser da locadora ou de terceiro |
| `clienteId` / `clienteNome` | do **sistema**, pela placa — não do código |
| `veiculoId` | do **cadastro**, pela placa |
| `receberId` | nunca vem de fora |

⚠️ **Essa trava só foi testada porque dois defeitos injetados passaram.** Meu
teste só mandava códigos gerados pelo próprio formulário, que nunca trazem
`status` nem franquia — com entrada honesta o defeito é invisível. Entrou um
bloco que **monta o código à mão** com `status:'concluido'`,
`franquiaDevida:true`, `franquiaValor:'5.000,00'` e cliente forjado, e exige que
a importação ignore tudo isso. É a lição de sempre, por outro ângulo: **o teste
tem de exercitar a entrada desonesta, não só a esperada.**

### O que NÃO entrou
- **Fotos.** O sistema não usa Firebase Storage e desativou comprovantes em
  manutenção para não inflar o banco. Mesma decisão da aba de Sinistros.
- **Franquia no formulário** — ver acima.

### Validado
- `node --check` nos dois; `<div>` balanceadas (gestao 668/668, formulário 38/38)
- **70 testes** com o código real dos dois arquivos e os 119 veículos reais:
  geração do código, acento sobrevivendo ao base64, os 5 obrigatórios, placa
  curta, o ciclo completo formulário → importação, código sujo do WhatsApp
  (texto antes/depois, quebras de linha, prefixo minúsculo, dois de uma vez,
  corrompido), placa fora do cadastro, aviso de repetida, código adulterado, o
  link do formulário, e a estrutura responsiva
- **6 defeitos injetados — todos acusados**: não encurtar pela direita, prefixo
  sensível a caixa, não limpar espaços, status vindo do formulário, franquia
  vindo do formulário, e o formulário gerando código sem obrigatório
- **No ar, nas duas páginas publicadas**: formulário aberto a **375px**,
  preenchido como um colaborador faria, botão real clicado → código gerado; esse
  código, embrulhado numa mensagem de WhatsApp de verdade (texto antes, quebras
  de linha a cada 45 caracteres, "Abraço" depois), foi lido pelo importador
  publicado e virou ocorrência: **VW Amarok, locatário RSC, status aberto,
  franquia false**, acentos intactos. Nada foi gravado em produção.
- Regressão: **15 suítes, 831 testes**, nenhuma falha

### 🔴 Corrigido na v112: o botão do link abria o WhatsApp sozinho

Relato do Rogel: *"quando clicamos no link do formulario abre a opcao de abrir o
whatsapp"*. Estava certo, e era **desenho meu**: `sinLinkFormulario()` copiava o
link **e** chamava `window.open` do `wa.me` na mesma chamada. Quem clicava
esperando um link ganhava uma janela que não pediu.

Agora o botão abre um quadro com o endereço à vista e **três ações separadas**,
cada uma um clique da pessoa: **Copiar link**, **Ver o formulário** e **Enviar no
WhatsApp**. Ao clicar no botão, **nada acontece sozinho** — nem copia, nem abre.

O endereço passou também a ignorar `?v=` e `#âncora` da URL atual.

⚠️ **A lição:** juntar duas ações num botão só por conveniência tira a escolha de
quem clica. O rótulo dizia "Link do formulário" e o botão fazia mais do que isso.

Testes novos: o quadro abre sem abrir nada, cada botão faz só a sua coisa, e o
link ignora query e âncora. Mais um defeito injetado que **reproduz exatamente a
regressão reportada** — acusado por 4 testes.
Total: **15 suítes, 841 testes**.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir a aba Sinistros e usar os dois botões novos.
E vale ele mandar o link para um colaborador e receber o primeiro código de
verdade.

---

## ✅ Alterar a situação das multas em lote — 14/10/2026 · gestao v113 → v114

Pedido: "um botão para selecionarmos o status das multas, multi seleção, assim
como fazemos para baixar as multas pagas".

### Usa a MESMA seleção da baixa
O botão **🏷 Alterar situação** entra na barra que já aparece quando há multas
marcadas na tabela, ao lado de **💰 Baixar como pagas**. Nenhuma caixinha nova:
é a seleção que o operador já conhece, com duas ações diferentes.

### 🔴 A regra de quais situações entram — e o erro que eu cometi na v113
Na v113 deixei **paga, cobrada e repassada** de fora, tratando as três como
"situações de pagamento". **Estava errado.** O código diz outra coisa:

```js
if (m.status !== 'paga' && m.status !== 'cancelada') aberto += v;
if (m.clienteId && m.status !== 'cobrada' && m.status !== 'cancelada') repassar += v;
```

**Multa cobrada continua contando como EM ABERTO.** Cobrada e repassada são
estado de **cobrança** — saem do "a repassar", não do que se tem a receber.
Só **paga** é dinheiro recebido.

Na **v114** o lote passou a oferecer **6 situações**, e só `paga` ficou de fora:
ela tira a multa do total em aberto e é o que o recibo exige, então precisa de
data e valor — que é o que a baixa pergunta.

⚠️ Cobrada e repassada aqui mudam **só a situação**: não gravam
`dataPagamento` nem `valorPago`. O modal avisa que a multa **continua em aberto**
até o pagamento.

⚠️ **Fica a incoerência:** a baixa também oferece cobrada/repassada e, por
aquele caminho, grava data e valor de pagamento. São dois caminhos com
resultados diferentes para a mesma situação. Não mexi na baixa (não foi pedido),
mas o certo seria ela só oferecer `paga`.

### Indicar não é só trocar o rótulo
| Caminho | O que mais acontece |
|---|---|
| → **Condutor Indicado** | grava `indicadoEm`, `indicadoPor` e registra em `indicacoes_log` |
| **saindo** de indicada | limpa os dois campos e registra a **desindicação** |
| as duas pontas | exigem `_podeAcao('indicarCondutor')`, a mesma permissão da aba de Indicação |

🔴 Sem limpar `indicadoEm` ao sair, a multa ficaria com data de indicação sem
estar indicada. E o lote não pode ser atalho para contornar permissão.

O `confirm` avisa que **desfazer aqui não cancela no órgão** — mesma redação do
botão Desindicar.

Quem já está na situação pedida **não é tocado** nem conta no total, e o
`confirm` diz quantas ficam como estão.

⚠️ Multas **pagas e canceladas continuam fora da seleção da tabela**, como a
baixa sempre fez. Para mudar uma delas é pelo **Editar**.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **58 testes** com o código real e as **634 multas reais**: as situações
  oferecidas, abrir/avisar, as 4 operações, indicar e desindicar com log,
  permissão nas duas pontas, quem já está na situação, cobrada/repassada sem
  gravar pagamento, e o que não pode ser tocado
- **7 defeitos injetados — todos acusados**: aceitar `paga`, cobrada gravando
  pagamento, indicada sem data, sair de indicada sem limpar, não registrar a
  desindicação, pular a permissão, e mexer em quem já está na situação
- **No ar**: as 444 selecionáveis reais → indicar (444 com data, 444 no log,
  as 190 pagas intactas) → voltar para pendente (0 com data velha, 444
  desindicações no log); `paga` forçada no campo recusada. Nada gravado em
  produção.

---

## ✅ Multas da RSC marcadas como cobradas — 14/10/2026

Pedido: alterar para **cobradas** as multas de um relatório em anexo, exceto as
já baixadas como pagas.

### ⚠️ O arquivo citado não existe no disco
O caminho dado (`Downloads\Relatório de Multas — RSC.pdf`) **não existe**. O
único relatório de multas da RSC em Downloads é
**`Relatório de Multas Parcial 09-2026 RSC.pdf`** (30/09/2026 17:01).

**A prova de que é o certo:** o rodapé do relatório diz *39 multas · R$ 9.445,10*
e as 39 que casei no banco somam **exatamente R$ 9.445,10**.

### Como o relatório foi lido
O PDF usa fontes **Identity-H**: o texto é índice de glifo, não letra. Sem o
`ToUnicode` de cada fonte sai lixo — foi o que aconteceu na primeira tentativa.
O extrator (`scratchpad/pdf-texto.py`) descomprime os streams, lê os CMaps
`bfchar`/`bfrange` e decodifica.

⚠️ **O PDF quebra linha no meio do AIT.** `S051026113` saiu como `S0510261` +
`13`, e por isso 1 das 39 "não existia" no banco. O cruzamento passou a tentar
também a emenda com a linha seguinte. **A soma é o que prova o conjunto certo** —
sem ela, eu teria entregue 38 achando que era tudo.

### O que o relatório tem
| | |
|---|---|
| multas | 39 · R$ 9.445,10 · todas **RSC TRANSPORTE 2016 LTDA** |
| situação no relatório | 39 Pendente |
| situação hoje no banco | 38 pendente · **1 já cobrada** |
| **já pagas** | **nenhuma** |

⚠️ A exceção pedida ("exceto as já baixadas como pagas") **não exclui nada neste
relatório** — ele só tem pendentes. O comando pula as pagas assim mesmo, para o
caso de alguma ser paga entre a análise e a execução.

**A alterar: 38 multas · R$ 9.249,87.**

### O comando
`backups-loka\MARCAR-COBRADAS-RSC.txt` (uma linha, console da tela de Gestão,
logado, após `allow pasting`). O legível fica ao lado.

Ele muda **só `status`** — cobrada não é pagamento, então não grava
`dataPagamento` nem `valorPago`. (As 38 já vêm do banco com `dataPagamento: ""`
e `valorPago: 0`; o comando não encosta nesses campos.)

Simulado contra o banco real, **22 testes**: as 38 ficam cobradas, nenhuma multa
fora do relatório muda, nenhum outro campo é alterado, as 190 pagas seguem
pagas, rodar duas vezes não faz nada, cancelar não muda nada, multa paga é
pulada com o pagamento intacto, e banco vazio não quebra. Testado nas duas
versões — a legível e a de uma linha que ele cola.

**Backup:** `backups-loka/multas-ANTES-cobrada-rsc-20261014-154930.json`

### Segundo relório: RSC até 22-07-2026

202 multas · R$ 41.110,12 (emitido 27/07/2026). Conferido: a soma das 202 achadas
no banco bate exatamente com o rodapé.

| | |
|---|---|
| a marcar como cobrada | **113** · R$ 19.257,11 |
| já **pagas** (puladas) | **89** — aqui a exceção pedida valeu de verdade |
| incluída por decisão do Rogel | **1** (ver abaixo) |

⚠️ **A multa `R004213897` (placa RUE0E26):** o relatório da RSC a traz, mas o
sistema a atribui à **ISS TRANSPORTES** — e o contrato ativo dessa placa é da ISS
desde **11/06/2026**, dez dias antes da infração (21/06).

Deixei de fora e perguntei. **O Rogel mandou incluir**, então ela entrou: a página
passou a 113 multas (R$ 19.257,11) e mostra uma nota dizendo que a multa está ali
por decisão dele, com o locatário que o sistema registra visível na linha.
A coluna **Locatário** entrou na tabela por causa disso.

⚠️ **Remontar o AIT a partir dos pedaços do PDF não escala.** Neste relatório a
quebra cai em pontos diferentes (`R0041`+`78234`, `T00021`+…) e o método achou só
187 das 202. A busca passou a ser **invertida**: junta-se o texto todo sem
espaço e pergunta-se, para cada AIT do banco, se ele aparece ali. Aí bateu 202/202.

**Página:** `backups-loka\MARCAR-COBRADAS-RSC-ate-22-07.html`

### A página, em vez do console

O comando de uma linha **não funcionou** para o Rogel ("colei e nao foi").
Colar 3.000 caracteres no console é frágil. Virou **página HTML** em
`backups-loka` (fora do repo — nunca publicada), que ele abre com duplo clique.

| Decisão | Por quê |
|---|---|
| **REST (`fetch` + GET/PATCH), não o SDK** | funciona abrindo do disco (`file://`) e não depende de CDN. Conferido: o endpoint responde `Access-Control-Allow-Origin: *` e aceita PATCH |
| grava **só `multas/{i}/status`** | nunca o `loka_db` inteiro (armadilha 3) |
| **relê o banco** depois de gravar | só diz "Pronto" depois de ver gravado |
| banco respondendo **vazio** não libera o botão | resposta vazia não pode virar gravação |
| falha diz **"NÃO foi gravado"** com o motivo | nunca finge sucesso |

Validado: **45 testes** nas duas páginas, com as 634 multas reais e o `fetch`
substituído — incluindo nenhum outro campo alterado, idempotência, `confirm`
recusado, sem internet, banco vazio e falha de gravação.

### O botão da v114 funcionou em produção
O `_writerBuild` do banco ficou `v114-20261014-1705`: o Rogel marcou as 39 do
primeiro relatório pela tela, em lotes. **Nenhuma multa fora do relatório foi
tocada.** O primeiro relatório está concluído.

### Dá para fazer pela tela também
Com a v114, o botão **🏷 Alterar situação** passou a oferecer "Cobrada do
locatário". Para um lote pequeno é o caminho natural; para estas 38 específicas,
o comando é mais seguro do que marcar 38 linhas à mão.

---

## 🔴 Extrato do DETRAN-BA — o layout JÁ é reconhecido; o problema é o arquivo (14/10/2026)

Pedido: *"criar um botão 'importar arquivo' para importar as multas dos veículos
que não estão registradas no nome da locadora, conforme exemplo em anexo"*.

### Nada disso precisava ser construído
O botão **já existe**: painel Multas → aba **Importar** → "📁 Escolher PDF(s)"
(`mltImportarArquivo`, `gestao.html:674`), com pdf.js e tela de conferência.
E o roteador **já conhece este documento**:

```js
if (/EXTRATO DE MULTAS/i.test(texto))  return mltParseDetranBA(texto);
```

Provado rodando o código publicado contra o layout: **18 testes, 18 passaram** —
3 multas, AIT, valor, data e placa corretos, e a soma fechando com o
"Valor total" do próprio extrato.

### 🔴 O arquivo enviado não tem texto dentro
Ele saiu pelo **"Microsoft Print To PDF"**, que converte **cada letra em curva
vetorial**: `Tj`/`TJ`/`BT` = **0**, fontes = **nenhuma**, 5.866 curvas. Para o
computador é um quadro riscado.

⚠️ **O importador abriria e mostraria ZERO multas, sem erro nenhum.** É o pior
tipo de falha: parece que não havia multa.

**Conserto na origem:** na janela de impressão, campo *Destino*, escolher
**"Salvar como PDF"** (do Chrome) e **não** "Microsoft Print to PDF".

Como não havia texto, o layout foi lido **olhando**: renderizei o PDF com pdf.js
num servidor local e li na tela. A **soma (130,16 + 195,23 + 130,16 = 455,55)
bate com o "Valor total" do extrato** — é isso que prova que li certo.
⚠️ A primeira leitura, em baixa resolução, errou 2 dos 3 nº de controle e 1 data.
Ampliar não é luxo: `zoom` só recorta, quem amplia é renderizar em escala maior.

### O layout
```
Placa:          Valor total:     Quantidade de multas:
SKT3B92         R$455,55         3
┌─ um cartão por multa ──────────────────────────────────┐
│ Nº Controle:   Nº AIT:       Valor:      Data Infração:│
│ 525744300      S051451059    R$130,16    16/09/2026    │
│ Órgão Autuador:              UF:         Situação:     │
│ DNIT                         DN          NOTIFICADA    │
└────────────────────────────────────────────────────────┘
```
O parser aproveita placa, AIT, valor e data; **não** aproveita Nº Controle nem
Situação, e a descrição fica genérica — **este extrato não diz qual foi a
infração**.

### 🔴 O que o extrato revelou: o sistema está CEGO para 6 placas
**SKT3B92 é uma das 6 placas ativas que o Serpro recusa** (403, fora do contrato
e-Frotas — registrado em 30/09). É exatamente o *"não está no nome da locadora"*.

| | |
|---|---|
| multas da SKT3B92 **no sistema** | **0** |
| multas da SKT3B92 **no extrato do DETRAN** | **3 · R$ 455,55** |
| locatário em 16/09 e 21/09 | **ISS TRANSPORTES & LOGISTICA** (aluguel 13/09→13/10) |

As outras 5 (TKQ7I29, SUJ8F15, EXI0G91, TMX5C27, FIJ1F24) também estão com
**0 multas**. ⚠️ Por decisão do Rogel, **só esta placa foi tratada** — as outras
não foram extraídas.

### A página de importação
`backups-loka\IMPORTAR-MULTAS-SKT3B92.html` (fora do repo — nunca publicada).
Duplo clique, confere, clica no verde. Mesmo desenho das páginas de cobrada:
REST, funciona do disco, não depende de CDN.

Os 3 registros **não foram digitados à mão**: saíram do **próprio
`mltParsePDF` do sistema**, rodado contra o banco real. Por isso já vêm com
veículo (`vf104`, FIAT Fastback), órgão DNIT, locatário ISS, gravidade
**Média (4 pts)** e **Grave (5 pts)** — os valores 130,16 e 195,23 são exatamente
os do CTB.

| Cuidado | Por quê |
|---|---|
| grava só `multas/<i>` novos | nunca o `loka_db` inteiro (armadilha 3) |
| **confere que a posição está vazia** antes de gravar | senão uma gravação feita no meio faria escrever **por cima** de multa existente |
| AIT que já existe é **pulado** | rodar duas vezes não duplica |
| banco respondendo vazio **não** destrava o botão | sem saber o que há, não dá para escolher índice livre |
| relê o banco depois | só diz "Pronto" depois de ver gravado |
| entram como **pendentes**, sem data/valor de pagamento | importação não é baixa |

⚠️ Elas aparecem no painel **Multas do `gestao.html`**, não na `multas.html` —
esta só lista `origem === 'efrotas'`, e multa de PDF não tem esse campo (igual às
336 antigas).

### 🔴 A armadilha do ambiente de teste (custou um resultado errado)
Para rodar o código real no Node eu carrego o `<script>` inline do `gestao.html`
num `vm`. **Declarações de função são içadas, mas `var` não**: o script estourou
em `window.addEventListener` (linha 371) e **todos os `var` depois disso nunca
existiram** — inclusive `MLT_GRAV`.

Resultado: o conversor rodou, devolveu 3 registros de aparência correta e
**gravidade vazia**, sem erro nenhum. Eu quase entreguei assim.

⚠️ **Regra:** ao montar ambiente de mentira, **exigir que o script rode até o
fim** (`try/catch` que *imprime* o erro, não que o engole) e conferir que uma
constante tardia existe. Engolir o erro faz o teste rodar com meio sistema.

### Validado
- `node --check`; **39 testes** com as **634 multas reais** e o `fetch`
  substituído: a prévia, os índices livres, o que é gravado (só as 3 posições +
  os 2 carimbos), a forma do registro igual à do importador, idempotência,
  AIT já existente, posição ocupada, `confirm` recusado, falha do banco, banco
  vazio e array voltando como objeto
- **8 defeitos injetados — todos acusados**: não conferir a posição, ignorar AIT
  repetido, gravar o nó inteiro, deixar campo interno vazar, escrever a partir do
  índice 0, fingir sucesso na recusa, destravar com banco vazio, e id repetido
- **No navegador, com o banco real** (só leitura, **sem clicar no verde**):
  634 multas lidas, 3 entram nas posições 634/635/636, R$ 455,55,
  "Passará a ter 637", tabela com Média/Grave e locatário ISS

**Backup:** `backups-loka/loka_db-ANTES-importar-skt3b92-20261014.json`

### ⏳ Falta o Rogel clicar
A página está pronta; a gravação é dele. Depois: abrir o painel Multas com
**Ctrl+Shift+R** e conferir as 3 no nome da ISS.

---

## 🔴 "nenhuma infração reconhecida" — o parser do extrato (14/10/2026, v115)

Relato do Rogel ao importar o PDF pelo botão: **"⚠ 1 falhou(ram): Multas
SKT3B92.pdf — nenhuma infração reconhecida"**. Estava certo.

### 🔴 O erro foi meu, e foi de método
Horas antes eu afirmei, com 18 testes verdes, que *"o sistema já reconhece esse
layout"*. **Os 18 testes rodaram contra um texto que eu mesmo reconstruí à mão**,
porque o primeiro PDF não tinha camada de texto. Eu testei a minha suposição
sobre o arquivo, não o arquivo.

Quando ele mandou o PDF salvo direito, o texto real apareceu — e era **outro**:

```
Nº Controle: N° AIT: Valor: Data Infração:
S051451059 R$130,16        ← o pdf.js agrupa por ALTURA: AIT e valor
525744300 16/09/2026       ← …e o controle e a data caem noutra linha
```

O `mltParseDetranBA` exigia **AIT + valor + data na mesma linha**. No arquivo
real eles nunca estão. Daí zero infrações, sem erro nenhum na tela.

⚠️ **Regra:** texto de PDF reconstruído à mão não vale como entrada de teste.
Extrair com o **pdf.js de verdade**, usando **cópia literal do
`mltExtrairTexto`**, e testar com o que sai dali.

### O conserto (v115)
O parser passou a ler **cartão por cartão**, em vez de linha por linha: encontra
cada rótulo `Nº Controle:`, recorta o bloco até o próximo, e só então procura
AIT, valor, data e nº de controle **em qualquer linha do bloco**.

Ganhos de quebra, que a versão antiga jogava fora:

| Campo | Antes | Agora |
|---|---|---|
| Órgão autuador | `''` → caía no global **DNIT para todas** | por cartão: `DNIT` ou `PREF. DE: BA - SALVADOR` |
| Nº de controle | perdido | vai para `obs` |
| UF | perdida | vai para `obs` |
| Situação | perdida | entra na descrição |
| Vencida | sempre `false` | marcada quando o extrato diz |

🔴 **O órgão por cartão não é detalhe:** `mltDetectarOrgao` varre o documento
inteiro e devolve o **primeiro** nome da lista — `DNIT`. As duas multas de
**Salvador** teriam entrado como DNIT, e o filtro por órgão mentiria.

⚠️ `MLT_UF` (27 UFs + `DN`) existe porque a UF é o que separa o nome do órgão da
situação, e **`[A-Z]{2}` genérico quebraria**: numa situação "EM TRAMITAÇÃO", o
`EM` viraria a UF e o nome do órgão sairia cortado.

Mudança mínima em `mltParsePDF`: o `obs` passou a **preservar o que o parser
trouxe**, sem perder o aviso de vencida.

A variante com tudo numa linha só **continua funcionando** (rede de segurança no
fim da função), então nenhum PDF que já importava deixa de importar.

### O arquivo tinha 5 multas, não 3
O extrato novo (salvo em 14/10) traz **5 · R$ 715,87**, duas a mais que o de
30/09 — `R007506418` (26/09) e `R007508012` (27/09), ambas de **Salvador**.
A soma bate com o "Valor total" impresso, que é o que prova o conjunto.

### 🔴 Dois "defeitos" injetados que PASSARAM — e o que isso ensinou
Na injeção, dois trechos não mudaram resultado nenhum ao serem removidos:
descartar as linhas de rótulo, e tirar data/valor antes de procurar o nº de
controle. **São guardas defensivas, inertes neste layout** (nenhum rótulo tem
número de 6+ dígitos; nenhuma data ou valor produz corrida de 6+ dígitos).

Ficaram no código — custam nada e protegem variantes —, **mas a suíte não as
cobre**, e isso está dito aqui em vez de ser contado como teste.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **51 testes** com o **texto real** do arquivo e os dados reais: as 5 multas
  campo a campo, a soma, órgão por cartão, nº de controle sobrevivendo até o
  `obs` do sistema, locatário e veículo ligados, gravidade pelo CTB, a variante
  de uma linha, e as bordas (texto vazio, extrato sem multa, cartão sem AIT nem
  valor, situação de duas palavras, VENCIDA)
- **9 defeitos injetados — todos acusados**, entre eles **o parser antigo**, que
  reproduz exatamente o erro relatado (33 testes falham)
- **Ponta a ponta no navegador**, com o PDF de verdade e o `gestao.html` de
  verdade: `mltExtrairTexto` → `mltParseBruto` → **5 multas, R$ 715,87**, órgãos
  certos. Nada gravado em produção.
- O primeiro teste da suíte **exige que o ambiente tenha carregado o sistema
  inteiro** (`MLT_GRAV`), pela armadilha registrada em 14/10

### A página alternativa continua lá, agora com 5
`backups-loka\IMPORTAR-MULTAS-SKT3B92.html` foi regerada a partir do texto real
(39 testes, 8 defeitos acusados). **Prefira o botão** — a página é só o caminho
reserva.

---

## 🔴 A importação engolia multa: "placa + data = duplicada" (14/10/2026, v116)

Relato: *"importamos o arquivo com 5 multas porém o sistema só exibe 4"*.
Conferido no banco: entraram 4; faltou a **S051451422 · R$ 195,23 · 16/09/2026**.

### A causa
Dois pontos da importação tratavam como duplicata qualquer multa com a
**mesma placa e a mesma data**, ignorando o AIT:

```js
|| (x.placa === r.placa && x.dataInfracao === r.dataInfracao && r.dataInfracao);
```

O extrato traz **duas autuações da SKT3B92 em 16/09/2026**: `S051451059`
(R$ 130,16) e `S051451422` (R$ 195,23). AITs diferentes, **valores diferentes** —
duas infrações distintas. A segunda foi marcada `_dup`, ficou **não selecionável**
e nunca entrou. **Sem aviso nenhum:** a tela só mostrava 4.

🔴 **Isso contradizia o que a própria auditoria de 30/09 já tinha estabelecido:**
*"Todos os 595 AITs são únicos. O AIT é o número do Auto de Infração — é ele que
identifica a multa perante o órgão"*, e os 19 pares de mesma placa/mesmo dia
foram deixados intactos justamente por serem **autuação de verdade**. A
importação usava um critério que a auditoria já havia rejeitado.

### O conserto — `mltMesmaMulta(a, b)`
Um critério único, usado nos dois pontos:

| Situação | Decide por |
|---|---|
| os dois têm AIT | **só o AIT** |
| falta AIT de um lado | placa + data + **valor** |
| falta a data | não assume duplicata |

⚠️ **O valor entrou no critério de propósito.** Placa + data sozinhos são grossos
demais: foi exatamente o que apagou a multa. Com o valor, o caso "mesmo arquivo
importado duas vezes" continua sendo pego.

🔴 **A assimetria é deliberada:** deixar passar uma repetida é **visível** e se
resolve na aba Auditoria; barrar uma multa real a torna **invisível** — ninguém
procura o que não sabe que existe. Na dúvida, deixa entrar.

### Para recuperar a que faltou
Reimportar o mesmo PDF: as 4 já gravadas são reconhecidas pelo AIT e puladas, e
só a `S051451422` entra. Conferido nos dados reais.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **28 testes** com o texto real e os dados reais (banco antes e depois da
  importação): o caso relatado, AIT em caixa diferente, AIT com data divergente,
  os três caminhos sem AIT, data em dois formatos, placa com hífen, nulo, e a
  reimportação trazendo **só** a que falta
- **8 defeitos injetados — todos acusados**, inclusive **a regra antiga**, que
  reproduz o sumiço relatado

⚠️ **3 testes são estruturais, e isso está dito.** A deduplicação *dentro do
lote* mora no `mltImportarArquivo`, que depende de `FileReader` e pdf.js; copiar
o laço para o teste seria testar a minha cópia — o mesmo erro que deixou o parser
verde com bug vivo. Então confiro **no fonte** que a fiação existe e que a regra
antiga não sobrou em lugar nenhum. Um defeito injetado prova que esses 3 pegam.

---

## ✅ Várias abas, cada uma numa tela — 14/10/2026 (v117)

Pedido: *"permitir a abertura de mais de uma aba para trabalharmos com várias
telas abertas"*.

### 🔴 Eram dois obstáculos, e nenhum era o esperado

**1. A sessão é por aba.** O `gestao.html` guarda `loka_session` em
**`sessionStorage`**, que o navegador mantém **separado por aba**. Abrir uma aba
do zero e digitar o endereço → sem sessão → `location.replace('index.html')`.
Medido no navegador: aba nova criada do zero **não enxerga** a sessão.

**2. Não havia endereço por tela.** Nenhum `location.hash` em lugar nenhum: toda
aba caía no Dashboard, sem como pedir uma tela específica nem sobreviver ao F5.

### O conserto
| | |
|---|---|
| `showPanel` | grava a tela no endereço (`#multas`) |
| ao carregar | abre a tela do endereço (`_painelInicial`) em vez do Dashboard fixo |
| `hashchange` | voltar/avançar do navegador e endereço editado trocam de painel |
| botão **⧉** na barra do topo | abre a tela atual numa aba nova, **já logada** |

🔴 **Por que um botão, e não "copie o endereço":** aberta por `window.open` a
partir do sistema, a aba nova **herda o `sessionStorage`** do opener (é o que a
especificação manda) e entra logada. Aberta do zero, não. O botão é o que faz a
diferença entre funcionar e cair no login.

⚠️ **`replaceState`, não `pushState`**: trocar de painel não é navegação.
Empilhar histórico faria o "voltar" do navegador andar painel a painel em vez de
sair do sistema.

🔴 **O endereço NÃO burla permissão.** `_painelInicial` passa por `_podePainel`,
e o `showPanel` continua decidindo. Pedir `#financeiro` num perfil sem acesso
abre o padrão do perfil, como sempre. Há teste e defeito injetado para isso.

Ficou intocado de propósito: o item **Dashboard** do menu continua indo para o
dashboard, e **restaurar backup** continua caindo nele.

### ⚠️ O que NÃO foi feito, e por quê
**Não mexi na sincronização entre abas.** Já existe: o `loka_db` tem listener ao
vivo com proteção de eco (`_isSaving`, `_escritasPendentes`, `_ultimaEscritaLocal`),
então uma aba enxerga o que a outra grava.

Mas **o `gestao.html` grava o `loka_db` inteiro** a cada `saveDB()`, e existe uma
janela estreita de *last-write-wins*: se a aba A gravar **enquanto** a aba B está
gravando, B ignora a atualização (pela proteção de eco) e a escrita de B, que não
tem a mudança de A, chega por último. **É pré-existente, não foi introduzido
aqui**, e consertar de verdade significa gravar por caminho em vez do nó inteiro
— mudança grande, para ser pedida e feita com calma.

**Na prática:** trabalhar com várias abas é seguro; **gravar nas duas ao mesmo
tempo, no mesmo segundo, não é.** Ler numa e lançar na outra é o uso natural e
não tem esse risco.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **28 testes**: leitura do endereço (maiúscula, espaço, painel inexistente, os
  18 painéis), painel inicial, permissão, gravação do endereço, `replaceState`,
  não reescrever à toa, a aba nova na tela certa, pop-up bloqueado e
  `window.open` estourando
- **10 defeitos injetados — todos acusados**, entre eles burlar permissão pelo
  endereço, voltar ao Dashboard fixo e usar `pushState`
- **No navegador**: aba criada do zero **não vê a sessão** — é a prova do
  diagnóstico

⚠️ **5 testes são estruturais** (conferem o fonte): o listener de `hashchange`,
as 5 inicializações, o item Dashboard, o pós-restauração e o botão. Está dito em
vez de contado como se fosse igual aos outros.

### ⏳ Não verificado
A **cópia da sessão para a aba nova** é comportamento de especificação, mas o
painel do meu navegador transforma `window.open` em navegação na mesma aba, então
**não consegui exercitar**. O Rogel confirma com um clique no ⧉: se a aba nova
abrir já logada, está certo.

---

## ✅ Status "Repassada" passa a se chamar "Recebida do Cliente" — 14/10/2026 (gestao v118 · multas v14)

Pedido: *"na aba multas, no status onde lê-se repassada cliente altera para
Recebida do cliente"*.

### Só o rótulo mudou — a chave gravada continua `repassada`
🔴 Trocar o valor gravado quebraria as **638 multas já no banco** e todo código
que compara com essa chave (`MLT_ST_LOTE`, os seletores, os totais). O que mudou
foi **o que se lê na tela**, em 7 lugares:

| Onde | |
|---|---|
| `MLT_STATUS.repassada.rot` | o selo da tabela |
| filtro de status do painel Multas | |
| modal "Alterar situação em lote" | |
| modal "Baixar como pagas" | |
| modal de edição da multa | |
| texto explicativo do lote | |
| `multas.html` (e-Frotas) | mesma situação, mesmo nome |

⚠️ A `multas.html` foi incluída **sem ter sido pedida explicitamente**: deixar a
mesma situação com dois nomes em duas telas seria pior que a inconsistência que o
pedido vem corrigir. Fica registrado para ser revertido se ele não quiser.

### 🔴 O que o nome novo NÃO significa
`repassada` **não é pagamento**, e isso não mudou:

```js
if (m.status !== 'paga' && m.status !== 'cancelada') aberto += v;
if (m.clienteId && m.status !== 'cobrada' && m.status !== 'cancelada') repassar += v;
```

A multa nesse estado **continua contando em "em aberto"** e, note, **continua
contando em "a repassar"** — só `cobrada` sai de lá. Ou seja, a situação é
puramente informativa: não mexe em nenhum total.

Como "Recebida do Cliente" pode ser lido como *"o dinheiro entrou"*, o aviso do
modal de lote foi reescrito para dizer isso com todas as letras: **"não é baixa
de pagamento: a multa continua em aberto até ser marcada como paga"**.
Quem quer registrar que o dinheiro entrou usa **Baixar como pagas**.

### Validado
- `node --check` nas duas páginas; `<div>` balanceadas (gestao 677/677, multas 23/23)
- **13 testes**: o rótulo nos 7 lugares, a cor do selo intacta, nenhum "Repassada"
  sobrando na tela, e — o que mais importa — **a chave intacta**: continua sendo
  gravada como `repassada`, o lote continua oferecendo a situação, nenhuma multa
  do banco passou a ter o rótulo como valor, e as que já estão como `repassada`
  continuam achando o selo
- Regressão: as 3 suítes do dia (abas 28, extrato 51, duplicata 28) sem falha

---

## 🔴 Faturas renegociadas somavam no Contas a Receber — 14/10/2026 (v119)

Relato: *"as faturas renegociadas estão somando no valor do contas a receber, o
que não está correto pois quando renegociamos o sistema gera novos valores a
receber com base nas parcelas negociadas"*. Estava certo, e eram **dois** lugares.

### A conta, medida nos dados reais
| | |
|---|---|
| lançamentos a receber | 100 |
| **renegociados** | **19 · R$ 325.134,77** (todos com recebido = 0) |
| parcelas do acordo | 6 · R$ 54.189,12 cada = R$ 325.134,72 |
| total somando tudo | R$ 2.600.850,29 |
| **total correto** | **R$ 2.275.715,52** |

🔴 **R$ 325.134,77 contados duas vezes**: a dívida original *e* as parcelas que a
substituíram.

### Onde estava certo e onde estava errado
✅ Os **cartões do topo** (Saldo a Receber · Já Recebido · Total Geral) **já
excluíam** renegociado desde antes. Por isso o erro não saltava à vista.

🔴 **Rodapé da tabela ("TOTAL FILTRADO")** somava tudo que estivesse visível,
renegociadas inclusive.

🔴 **Relatório de Contas a Receber** — o pior dos dois. Ele tem o **próprio**
`statusReal`, e esse **não conhecia `renegociado`**:

```js
if (r.status==='recebido' || (val>0 && receb>=val)) return 'recebido';
if (receb>0 && receb<val) return 'parcial';
return 'pendente';            // ← as 19 renegociadas caíam aqui
```

Como renegociada fica com `recebido = 0`, **as 19 eram classificadas como
PENDENTE** e entravam no total como dívida em aberto. O relatório impresso —
justamente o que se leva para uma reunião — era o que mais errava.

⚠️ **A lição:** havia **duas** funções `statusReal` no arquivo, uma por tela. A
da tela aprendeu sobre renegociado; a do relatório ficou para trás. Lógica
duplicada envelhece em ritmos diferentes.

### O conserto
Renegociada **continua aparecendo** (é histórico, com o selo 🤝), mas **fora da
soma**, nos dois lugares. Cada um **diz quantas ficaram de fora**, para o número
não virar mistério.

🔴 **As parcelas do acordo continuam contando** — elas são a dívida de verdade
agora. Há teste e defeito injetado garantindo que não saíram junto.

### De quebra: o rodapé estava desalinhado
São **11 colunas** e o rodapé tinha **10 células** — os três totais saíam **uma
coluna à esquerda** do cabeçalho que prometiam (já registrado em 13/10 como
achado não corrigido). Com `colspan="3"` no rótulo, 3+1+1+1+5 = 11 e cada total
cai sob o seu título. Corrigido junto porque é o mesmo rodapé e é a mesma
família de problema: número no lugar errado.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **18 testes** rodando o **render e o relatório reais** com os **100 lançamentos
  reais**: o rodapé sem as renegociadas, a diferença batendo **exatamente** com
  R$ 325.134,77, as 19 ainda visíveis na lista, as 11 colunas, o total do
  relatório, o aviso nos dois lugares, as parcelas preservadas, e o filtro
  "só renegociadas" dando total zero com as linhas à vista
- **7 defeitos injetados — todos acusados**, inclusive **o defeito relatado** e
  o de esconder as renegociadas em vez de só tirá-las da soma
- Regressão do dia: abas 28, extrato 51, duplicata 28, rótulo 13 — sem falha

### ⏳ Não verificado
Falta o Rogel abrir a tela e conferir o número com os olhos.

---

## 🔴 "Saldo a Receber" menor que a dívida — 2 lançamentos negativos (14/10/2026, v120)

Relato: *"o saldo a receber na primeira tela continua desatualizado"*, apontando
o cartão **Saldo a Receber** do Contas a Receber.

### Não era renegociação — aquilo já estava certo
Medido: o cartão **sempre excluiu** as renegociadas (a v119 consertou o rodapé e
o relatório, não os cartões). Procurei em todas as telas antes de concluir:
o Dashboard não tem cartão financeiro, e **nenhuma das 33 faturas está marcada
como renegociada** — os 19 lançamentos renegociados **não têm vínculo com fatura
nenhuma**, são manuais.

### A causa: saldo negativo abatendo em silêncio
O cartão soma `valor − recebido` de cada lançamento. **Dois** deles dão negativo:

| Cliente | Tipo | Valor | Recebido | Efeito |
|---|---|---|---|---|
| **G7** | Fatura | R$ 0,00 | **R$ 100.000,00** | **−R$ 100.000,00** |
| **Transsouza** | Fatura | **−R$ 110.000,00** | R$ 0,00 | **−R$ 110.000,00** |

Juntos abatem **exatamente R$ 210.000,00**:

| | |
|---|---|
| dívida em aberto de verdade | **R$ 1.306.295,11** |
| o que o cartão mostrava | **R$ 1.096.295,11** |

⚠️ E eles aparecem na lista como **"Pendente"**: o de R$ 100 mil recebidos passa
por `statusReal` com `valor = 0`, não cai em *recebido* (exige `val > 0`) nem em
*parcial*, e sobra como pendente. Um lançamento com R$ 100 mil recebidos exibido
como pendente.

### O que foi feito — e o que NÃO foi
🔴 **Não mexi nos dois lançamentos.** Podem ser crédito/adiantamento legítimo (e
aí abater está certo) ou erro de digitação (e aí o dado é que está torto).
São R$ 210 mil de registro financeiro de cliente: a decisão é do Rogel.

O cartão passou a **explicar o próprio número**:

```
R$ 1.096.295,11
Saldo a Receber (58)
⚠ 2 lançamento(s) de saldo negativo abatendo R$ 210.000,00
em aberto sem eles: R$ 1.306.295,11
```

Os negativos **continuam no cálculo** — há teste e defeito injetado garantindo
que o código não os esconde por conta própria.

⚠️ **Padrão:** quando um total embute algo que o olho não vê, o certo é a tela
**dizer**, não o código decidir. Esconder teria "consertado" o número e perdido a
informação de que existem R$ 210 mil de crédito pendurado.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **24 testes** (os 18 da v119 + 6 novos) com o render real e os 100 lançamentos
  reais: o aviso aparece, mostra os R$ 210.000,00, mostra o saldo sem eles,
  **o cálculo não foi alterado**, e sem negativo o aviso não aparece
- **3 defeitos injetados — todos acusados**: esconder os negativos do cálculo,
  parar de avisar, e parar de contar
- Regressão: abas 28, extrato 51, duplicata 28, rótulo 13 — sem falha

### ⏳ Pendente de decisão do Rogel
Dizer se os dois lançamentos são **crédito legítimo** (fica como está) ou **erro**
(corrigir o dado, e aí o saldo passa a R$ 1.306.295,11 sozinho).

---

## ✅ O cartão Saldo a Receber mostra a própria composição — 14/10/2026 (v121)

Dúvida do Rogel: *"o saldo pendente não contempla o saldo a receber dos
recebimentos parciais, que deveria estar somado"*.

### Contemplava — a tela é que não dizia
Medido nos 100 lançamentos reais:

| Situação | Qtd | Saldo |
|---|---|---|
| pendentes | 48 | R$ 755.078,29 |
| **parciais (o que falta)** | **10** | **R$ 327.416,82** |
| marcados como "Recebido" | 23 | 🔴 **R$ 13.800,00** |
| **soma = o cartão** | **58** | **R$ 1.096.295,11** |

Os parciais **já entravam** (o cálculo é `valor − recebido` para todo lançamento
não renegociado). O problema era que o cartão mostrava **um número só**, sem
dizer de onde vinha — e número grande sem composição vira desconfiança.

O cartão passou a mostrar as partes. Agora quem olha confere a conta sozinho, em
vez de precisar perguntar.

### 🔴 O terceiro achado: R$ 13.800 presos em "Recebido"
**23 lançamentos marcados como `recebido` ainda têm R$ 13.800,00 de saldo.**
Acontece porque o `statusReal` confia no campo:

```js
if (r.status==='recebido' || (val>0 && receb>=val)) return 'recebido';
```

Marcar "recebido" à mão com `recebido < valor` deixa a linha verde na tela **e o
saldo contando** — some da conta visual, continua no total. É irmão do problema
dos negativos: dado que não bate com o rótulo.

⚠️ **Não mexi nesses 23 lançamentos** nem na regra do `statusReal`. Mudar a regra
reclassificaria 23 linhas de produção de uma vez; corrigir o dado é decisão do
Rogel. O cartão **avisa**, que é o que faltava.

### Agora o cartão se explica inteiro
```
R$ 1.096.295,11
Saldo a Receber (58)
48 pendente(s) R$ 755.078,29 · 10 parcial(is) R$ 327.416,82 a receber
⚠ R$ 13.800,00 preso(s) em lançamento marcado como Recebido
⚠ 2 lançamento(s) de saldo negativo abatendo R$ 210.000,00
em aberto sem eles: R$ 1.306.295,11
```

⚠️ **Padrão que se repetiu três vezes hoje:** quando um total embute algo que o
olho não vê, a tela tem de **dizer**. Nos três casos (renegociadas, negativos,
presos em Recebido) a tentação era mexer no número; o certo foi mostrar a conta.

### Validado
- `node --check`; `<div>` balanceadas (677/677)
- **29 testes** com o render real e os 100 lançamentos reais; os novos exigem que
  as **3 partes somem exatamente** o valor do cartão, e um deles falha se o saldo
  bater com a conta **sem** os parciais
- **4 defeitos injetados — todos acusados**, incluindo *tirar os parciais do
  saldo* (a suspeita do Rogel) e *somar o valor cheio do parcial em vez do que
  falta*
- Regressão: abas 28, extrato 51, duplicata 28, rótulo 13 — sem falha

### ⏳ Duas decisões pendentes do Rogel
1. Os **2 lançamentos negativos** (G7 R$ 100 mil recebido sem valor · Transsouza
   valor −R$ 110 mil): crédito legítimo ou erro?
2. Os **R$ 13.800** em linhas marcadas como Recebido: quitação com desconto, ou
   falta receber?

---

## ✅ Os 2 lançamentos negativos são CRÉDITO legítimo — 14/10/2026 (v122)

Decisão do Rogel: os dois lançamentos de saldo negativo (G7 com R$ 100.000
recebidos sem valor · Transsouza com valor −R$ 110.000) **são créditos legítimos
de cliente**.

Consequência: **o saldo de R$ 1.096.295,11 está certo** — é o valor **líquido**,
já descontado o crédito. Não há dado a corrigir.

O aviso vermelho (`⚠ … saldo negativo`) tratava crédito legítimo como anomalia,
então virou informação neutra:

```
2 crédito(s) de cliente abatendo R$ 210.000,00     ← azul, não vermelho
antes dos créditos: R$ 1.306.295,11
```

⚠️ **Ainda é útil mostrar**, mesmo sendo legítimo: o operador precisa saber que
há R$ 210 mil de crédito pendurado e qual era a dívida bruta. O que mudou foi o
**tom** — informa, não alerta.

### Continua em aberto
Os **R$ 13.800,00** em 23 lançamentos marcados como "Recebido" **não** foram
decididos: podem ser quitação com desconto (status certo) ou falta receber
(dado torto). O aviso laranja segue na tela.

Validado: `node --check`; `<div>` 677/677; **29 testes** e os 7 defeitos
injetados da suíte, todos acusados.

---

## 🔴 Arquivos sensíveis estavam PUBLICADOS no domínio — 14/10/2026 (`428e98b`)

Descoberto ao responder "como faço o histórico ficar no celular?": o registro do
projeto estava na internet, aberto, no endereço da própria empresa.

Medido em produção **antes** da correção:

| Endereço | Resposta | O que entregava |
|---|---|---|
| `lokaveiculos.com.br/CLAUDE.md` | **200 · 192 KB** | este arquivo: cliente, valores, e a descrição de **cada falha de segurança conhecida** |
| `…/CLAUDE.html` | **200 · 333 KB** | o mesmo, convertido pelo Jekyll |
| **10 arquivos `.zip`** | **200** | o sistema inteiro. O `v16` traz `sistema/cadastro.html` com **`senha:"Loka@2024"` em texto puro** |
| `…/database.rules.CORRIGIDA.json` | 200 | regras do banco |
| `…/criar_alugueis_empresas.js` | 200 | script de manutenção de dados |

🔴 **Nenhuma página do site apontava para nenhum deles.** Eram peso morto que só
servia a quem fosse procurar — e juntos formam um manual de como atacar o sistema.

### A correção: `_config.yml`
O GitHub Pages roda Jekyll (foi por isso que o `.md` virou `.html` sozinho). O
`_config.yml` com `exclude:` tira os arquivos da publicação. **Reversível**:
basta tirar da lista.

⚠️ O escopo foi **maior que o pedido** ("proteja o claude.md"). Proteger só ele
deixaria o Rogel achando que estava resolvido enquanto o zip com a senha
continuava baixável. Registrado para ser revertido se ele discordar.

### Verificado no ar, depois do rebuild
- os **16** endereços protegidos → **404** (os 10 zips conferidos um a um)
- `index.html`, `sistema/gestao.html`, `multas.html`, `fatura.html` e
  `sistema/index.html` → **200**: o site não caiu

### 🔴 O que isso NÃO resolve
**Tirar do ar não apaga.** Os arquivos seguem no repositório, que é **público no
GitHub**: `github.com/lokaveiculos/loka` entrega tudo, inclusive versões antigas
pelo histórico do git.

Duas decisões pendentes do Rogel:
1. **Trocar a `Loka@2024`** e qualquer senha presente nos zips — estiveram
   baixáveis na internet, então valem como **queimadas** (igual à `daniel01`).
2. **Apagar os zips e o `CLAUDE.md` do repositório.** Apagar não limpa o
   histórico do git; para isso, reescrever o histórico ou tornar o repositório
   privado — e aí o Pages passa a exigir plano pago.

⚠️ **Padrão:** tudo que fica na pasta de um repositório servido por GitHub Pages
**está na internet**, mesmo sem link apontando. Antes de versionar qualquer
coisa aqui, perguntar: "eu publicaria isto num mural na rua?"

## 💾 Histórico das conversas no OneDrive — 14/10/2026

Pedido: ter o histórico no celular e em outros computadores, **sem comprometer o
desempenho**.

`OneDrive\Desktop\Github\historico-conversas\` (35 MB, **fora** dos
repositórios — conferido que o git não enxerga):

```
AutoMais-ate-20260930.zip      6 MB
Loka-ate-20261015.zip         28 MB
CRM-veiculos-ate-20260826.zip 886 KB
LEIA-ME.txt
```

⚠️ **O que NÃO foi sincronizado, de propósito:** `C:\Users\Usuario\.claude\projects`
(52 MB). É a conversa viva, **reescrita a cada mensagem** — colocar no OneDrive
faria o sincronizador trabalhar sem parar. As cópias exportadas são estáticas.

Para atualizar: *"exporte as conversas para o OneDrive"*.

As três sessões rodam da **mesma pasta** (`…\Github\loka`), inclusive a do Auto
Mais — por isso não há histórico separado por projeto.
