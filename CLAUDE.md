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
| `gestao.html` | **v94-20260924-1115** |
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
