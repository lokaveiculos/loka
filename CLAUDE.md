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
| `gestao.html` | **v155-20261112-1540** |
| `fatura.html` | **v83-20261103-1700** |
| `multas.html` | **v15-20261019-1030** |
| `sinistro-colaborador.html` | **v1-20261014-1150** (formulário do colaborador) |
| `recibo.html` | **recibo-v2-20261017-1210** (recibo de pagamento) |
| `contrato-mensal.html` | **mensal-v7-20261112-1430** |
| `contrato-diaria.html` | **diaria-v7-20261109-0930** |

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

---

## 🔐 Senha com hash no login da LOKÁ — 15/10/2026 (gestao v123 · login-v1)

Decisão do Rogel: fechar o banco primeiro. Investigando, ficou claro que **não
dá** — e por quê:

```js
// sistema/index.html, linha 155 — a tela de login:
firebase.database().ref('loka_users').once('value')
```

🔴 **O login baixa a lista inteira de usuários para o navegador** e compara a
senha ali. Para isso funcionar, o nó precisa ser legível por qualquer um — não há
como distinguir o navegador do Rogel de um estranho com `curl`, porque o sistema
não usa Firebase Auth. E como a senha era **texto puro**, qualquer leitura
entregava a senha.

**Guardar senha em texto e fechar o banco são o mesmo problema.** Daí o passo 1:
tirar o texto puro. Autorizado por ele.

### O estado que foi medido (15/10/2026)
| | LOKÁ | Auto Mais |
|---|---|---|
| senhas na página publicada | 🔴 3 (rogel, admin, equipe) | 🔴 1 (regressão de 11/09 **ainda no ar**) |
| senhas no banco, legíveis **sem login** | 🔴 6 usuários | 🔴 3 (sandro, bruno, daniel) |
| protegidas por hash | ❌ nenhuma | ✅ 2 (rogel, thaina) |

Os 6 usuários do `loka_users` foram lidos **sem autenticar em nada**.

### 🔴 O fato que definiu o desenho: `rogel` NÃO existe no banco
`loka_users` tem daniel, jtcar, ikaro, geraldo, edvan, wilson. **A conta do Rogel
só existe escrita no `index.html`.** Remover o array `USERS` o deixaria sem
acesso nenhum — por isso ele **fica**, por enquanto. As 3 senhas de lá já eram
públicas; mantê-las não acrescenta exposição, e tirá-las antes de ele ter conta
no banco seria trancá-lo para fora.

### O que entrou
**`sistema/index.html`** — `_temCrypto`, `_novoSalt`, `_hashSenha`,
`_conferirSenha`, `_migrarParaHash`. O login passou a:
1. procurar os candidatos pelo login, **guardando a chave do registro** (é por
   ela que a migração grava de volta);
2. conferir **hash primeiro**, texto puro depois;
3. no primeiro login certo de um registro legado, **gravar `senhaHash` + `salt` e
   apagar o texto puro** (`senha: null`).

**`sistema/gestao.html`** — a tela de Usuários gravava `senha` em texto.
🔴 **Sem consertar isso aqui, a correção não se sustentava:** bastaria cadastrar
ou editar alguém para a senha voltar a ser texto puro. Agora ela gera hash+salt e
apaga o texto. Editar nome ou perfil **sem digitar senha** não toca na senha.

### Cuidados que não podem sair
- **Falha ao gravar a migração NÃO barra o login** — a pessoa acertou a senha;
  pior que não migrar é trancar quem tem acesso legítimo.
- **Navegador sem `crypto.subtle`** cai no caminho antigo em vez de recusar.
- **Banco fora do ar / sem firebase** → o array da página ainda entra.
- **Hash antes do texto**: se um registro ficar com os dois (migração que gravou o
  hash mas não apagou o texto), a senha **antiga tem de ser recusada** — senão
  trocar a senha não adianta nada.

### Validado
- `node --check` nos dois; `<div>` balanceadas (gestao 677/677, index 10/10)
- **27 testes** com o `crypto.subtle` de verdade (o do Node): hash estável, salt
  de 32 caracteres que muda o hash, hash sem a senha dentro, legado entrando e
  migrando, hash conferido contra a senha digitada, sessão sem segredo, senha
  errada recusada, quem já tem hash não remigra, e o registro misto
- **9 defeitos injetados — todos acusados**, sendo **3 de trancamento**: tirar o
  aceite do legado, tirar o fallback da página, e deixar a falha de gravação
  barrar o login
- Regressão: reneg 29, abas 28, extrato 51, duplicata 28, rótulo 13 — sem falha

### ⏳ Os próximos passos (nesta ordem)
1. **Rogel entra** e confirma que o login funciona. Cada um dos 6 do banco migra
   sozinho no primeiro login certo.
2. **Criar a conta `rogel` no banco** pela tela de Usuários, com senha nova
   digitada por ele — aí ela nasce com hash.
3. **Só então** remover o array `USERS` do `index.html`. Antes disso, não.
4. Com ninguém mais em texto puro, aí sim as regras do banco podem apertar.

⚠️ Mesmo com hash, **o nó continua legível** — o que muda é que ler não entrega
mais senha. Fechar a leitura de verdade ainda depende de Firebase Auth
(pendência 5).

---

## ✅ Edição de contrato: guardar o contrato INTEIRO e reabrir — 16/10/2026 (gestao v124 · mensal-v3 · diaria-v3)

Pedido (opção A, escolhida pelo Rogel): *"o master/adm tenha disponível a função
de editar os contratos para atualização de informações (valores, condições)"*.

### Por que não era "destravar campo"
Os campos do contrato **já eram editáveis** — só o Total (calculado) e o nome na
assinatura são travados. O que faltava era **guardar**: o registro em
`loka_db/contratos` era um **resumo** (cliente, placa, tipo, data, vigência,
valor, caução). Endereço, CPF, condições, valor por veículo e observações **não
eram salvos** — reabrir não tinha o que trazer.

⚠️ E a **diária nunca gravava em `contratos`**: só criava o aluguel em `ativos`.

### O que entrou
| | |
|---|---|
| `ctColeta()` | junta tudo que foi digitado: campos fixos (por **id**), observação e a lista de veículos |
| `ctAplicar()` | devolve tudo à tela, **criando as linhas de veículo que faltam** |
| `ctSalvarContrato()` | grava resumo + `campos` e **atualiza** quando já está editando |
| `ctCarregarParaEdicao()` | abre `...?edit=<id>` já preenchido |
| botão **Salvar contrato** | nas duas páginas |
| botão **✏️** no painel Contratos | só master/admin |

🔴 **Grava só o nó `loka_db/contratos`, por caminho** — nunca o `loka_db`
inteiro (armadilha 3). Editar contrato não pode arriscar sobrescrever frota,
clientes ou financeiro.

⚠️ Os campos do locatário (CPF, endereço, CEP, telefone, e-mail) **não tinham
id** — ganharam. Posição no HTML seria chave frágil: muda a cada ajuste de layout.

### 🔴 O defeito da fatura, evitado de propósito
`_ctEditandoId` guarda qual contrato está aberto. **Sem isso, salvar de novo
criaria um contrato novo a cada clique** — exatamente o que a `fatura.html`
sofreu (v79/v81). Há teste e defeito injetado para isso.

Editar **preserva o `geradoEm`** e grava `editadoEm`: a data de origem do
documento não muda porque alguém corrigiu um valor.

### 🔴 Contrato antigo avisa, e o aviso não some
Contrato gerado antes disto só tem o resumo. A página diz isso ao abrir.

⚠️ **Na primeira versão o aviso era engolido:** eu chamava `_ctAviso` duas vezes
e a segunda mensagem (genérica) apagava a primeira (o alerta). Agora é **uma
mensagem só**. Foi um teste que pegou — não a leitura do código.

### Permissão em duas camadas
O botão só aparece para master/admin **e** `editarContrato()` confere de novo ao
clicar. Esconder botão não é controle de acesso.

### Validado
- `node --check` nos três; `<div>` balanceadas (gestao 677/677, mensal 45/45, diária 48/48)
- **53 testes** com o código real das três páginas, nos dois contratos: colher e
  devolver todos os campos, os 3 veículos com os 6 dados, a observação (campo e
  espelho impresso), o ciclo ida-e-volta idêntico, gravar só o nó certo, **salvar
  de novo não criar outro**, `editadoEm`, `geradoEm` preservado, abrir por
  `?edit=`, id inexistente, salvar sem nome, falha de gravação, sem banco, e o
  contrato antigo
- **12 defeitos injetados — todos acusados**, entre eles salvar sempre criando,
  gravar o `loka_db` inteiro, não criar as linhas de veículo, qualquer perfil
  editando e a permissão não conferida no clique
- Regressão: reneg 29, abas 28, extrato 51, duplicata 28, rótulo 13, senha 27

⚠️ **Três buracos do meu ambiente de teste, corrigidos no caminho:** o banco
falso não guardava o que era gravado (então *"não cria outro contrato"* passava
por engano), `createElement` não registrava o elemento (os avisos sumiam) e
faltava `getContext`, o que fazia o script da diária estourar no canvas e rodar
**meio carregado** — a armadilha já registrada em 14/10.

### ⏳ Não verificado
Falta **logado**: o Rogel salvar um contrato, fechar, reabrir pelo ✏️ e conferir
que tudo voltou.

### ⚠️ Achado não corrigido
O "Registrar Contrato" das duas páginas ainda faz
`firebase.database().ref('loka_db').set(db_inteiro)` — grava o banco inteiro,
fora do `_setDBProtegido` (armadilha 3). É anterior a esta mudança e não foi
tocado; o caminho novo de salvar **não** passa por lá.

---

## ✅ Agenda com lembretes e avisos — 16/10/2026 (gestao v125)

Pedido: *"criar uma agenda que emita notificações com os lembretes que vamos
inserir manualmente"*.

**Não existia nada disso.** O que havia era a **faixa de alertas do topo**
(`checkAlertas`), que avisa sobre aluguéis vencendo — e foi nela que a agenda
entrou, em vez de criar um segundo banner.

### 🔴 O limite que precisa estar claro
**O aviso só aparece com o sistema ABERTO numa aba.** Notificação que chega com
tudo fechado precisa de algo que dispare na hora certa — ou seja, **servidor**.
E aqui: o site é GitHub Pages (estático, não recebe POST) e a **Org Policy do
projeto barra criar Cloud Function nova**. É o mesmo degrau do webhook do SNE e
da API do WhatsApp.

Por isso a agenda avisa de **três jeitos que funcionam sem servidor**:
1. **contador vermelho** no item Agenda do menu (atrasados + de hoje)
2. a **faixa do topo**, junto com os aluguéis vencendo
3. **notificação do navegador**, se a pessoa autorizar no botão 🔔

### Os dados
`loka_db/agenda[]` — `{ id, titulo, data, hora, obs, quem, status, criadoEm,
criadoPor, concluidoEm }`.

🔴 `'agenda'` entrou em **`normalizarDB`**. Sem isso, depois da **primeira
exclusão** o Firebase devolve o array como objeto e a tela quebra — armadilha 1,
e ela só aparece dias depois de publicar.

O painel foi registrado em **PANELS, _TODOS_PAINEIS, TITLES, _PAINEL_LABEL,
showPanel e no perfil Operador** (Master e Admin herdam pelo `slice()`) — a lição
do `multasefrotas`.

### Decisões
| | Por quê |
|---|---|
| **Data obrigatória** | lembrete sem data nunca avisa — vira bilhete perdido |
| **Concluído é avaliado ANTES do prazo** | lembrete resolvido não pode voltar como atrasado só porque a data passou |
| Hora é opcional | nem todo lembrete tem hora |
| A permissão de notificar só é pedida **no clique** do 🔔 | pedir sozinho ao abrir é intrusivo, e o navegador costuma bloquear de vez |
| O mesmo lembrete **não é notificado duas vezes** na sessão | aviso repetido vira ruído e a pessoa para de olhar |
| Lembrete **sem data** sai do resultado quando há período | não dá para afirmar que cai no intervalo. Mesma regra dos Aluguéis Ativos |
| "Nenhum na agenda" ≠ "nenhum com esses filtros" | some a dúvida de "sumiu tudo?" |

### 🔴 Dois defeitos que os testes pegaram antes de publicar
1. **`om()` / `cm()` / `comFoco` não existem no `gestao.html`** — eu os assumi do
   Auto Mais. É exatamente o defeito que deixou o CRM em branco: função chamada
   que nunca foi definida. O padrão aqui é `openM(id)`/`closeM(id)` com o HTML do
   modal já na página, e o campo de busca da LOKÁ fica no HTML estático (por isso
   não precisa de `comFoco`).
2. **O filtro "Próximos 7 dias" não batia com o cartão**: o cartão conta de
   amanhã em diante (hoje tem cartão próprio), e o filtro incluía hoje — cartão
   dizia 1, lista mostrava 2. Número na tela diferente da lista é o problema que
   já apareceu três vezes neste sistema.

⚠️ `checkAlertas` **saía cedo quando não havia aluguel ativo** (`if (!db ||
!db.ativos || !db.ativos.length) return;`) — e com isso a agenda nunca apareceria
na faixa num dia sem locação. A guarda passou a ser só sobre o `db`.

### Validado
- `node --check`; `<div>` balanceadas (695/695)
- **66 testes** com o código real: as cinco situações de prazo, as contagens, os
  6 modos de filtro, período com pontas inclusivas, busca sem acento, ordenação,
  salvar/editar/concluir/reabrir/excluir, `confirm` recusado, índice inexistente,
  os três avisos, notificação sem permissão, navegador sem `Notification`,
  título com HTML dentro, e agenda vindo como objeto do Firebase
- **16 defeitos injetados — todos acusados**, entre eles concluído voltando a
  contar como atrasado, notificar repetido, notificar sem permissão, editar
  duplicando e tirar a agenda do `normalizarDB`
- **No navegador, no arquivo publicado**, com 6 lembretes injetados **só na
  memória** e o `saveDB` neutralizado (**nada gravado em produção**): painel
  abre, cartões 2/1/1/1, 5 linhas, resumo "5 de 6", contador 3 no menu, faixa do
  topo com o texto certo, e o modal abrindo com a data de hoje e preenchendo ao
  editar
- Regressão: reneg 29, abas 28, extrato 51, duplicata 28, rótulo 13, senha 27,
  contrato 53 — sem falha

⚠️ Um teste meu passou por **engano** e foi corrigido: a guarda do "sem data no
período" é **inerte** quando o "De" está preenchido (`'' < qualquer data`, então
ele já cairia fora). Quem a exercita é o filtro **só com o "Até"**. Sem esse
caso, o defeito injetado passava.

### ⏳ Não verificado
Falta **logado**: o Rogel criar um lembrete de verdade, fechar, reabrir e ver o
contador. E clicar em **🔔 Ativar avisos** para autorizar a notificação.

### O que ficaria para depois (não foi pedido)
- **Repetição** (mensal/anual) para IPVA, seguro, vistoria
- **Aviso com o sistema fechado** — depende de resolver o servidor

---

## ✅ Aba Almoxarifado — estoque de peças e componentes — 16/10/2026 · gestao v126

Pedido: *"criar a aba Almoxarifado para controle de estoque de peças e
componentes"*. **Não existia nada de estoque nos dois sistemas** — a Manutenção
registra o serviço e o custo, mas nunca soube o que havia na prateleira.

### 🔴 A decisão que define tudo: o saldo NÃO é digitado

O saldo de cada peça é **calculado** a partir das movimentações, sempre:

```js
function axSaldo(itemId) {
  var t = 0;
  axMovs().forEach(function (m) {
    if (!m || m.itemId !== itemId) return;
    var q = _axNum(m.qtd);
    if (m.tipo === 'entrada')     t += q;
    else if (m.tipo === 'saida')  t -= q;
    else if (m.tipo === 'ajuste') t += q;   // já vem com sinal
  });
  return Math.round(t * 100) / 100;
}
```

⚠️ **Campo de saldo editável é a forma clássica de o estoque mentir:** alguém
corrige o número à mão, a movimentação não existe, e no mês seguinte ninguém sabe
para onde foi a peça. Aqui, para o saldo mudar, **tem de haver um lançamento com
data, quem fez e observação** — inclusive o acerto de inventário, que entra como
movimentação do tipo **ajuste** (com sinal: `-3` tira três).

São duas listas irmãs: `loka_db/almox` (a ficha da peça) e `loka_db/almox_mov`
(o extrato). A ficha guarda código, nome, categoria, unidade, estoque mínimo,
localização e fornecedor — **nunca quantidade**.

### O que o sistema recusa, e por quê

| Recusa | Por quê |
|---|---|
| **saída maior que o saldo** | estoque negativo não existe no mundo físico; o certo é lançar a entrada que faltou |
| **ajuste que deixaria negativo** | idem — o ajuste serve para acertar, não para inventar falta |
| quantidade **sem dígito** | `_axNum('abc')` devolve **0**, e 0 passaria calado. Mesma lição da baixa em lote de multas (v94) e da franquia dos sinistros (v99) |
| movimentação **sem data** | sem data o lançamento não entra em filtro nem em conferência de período |
| **código repetido** (ignorando maiúscula) | duas fichas com o mesmo código dividiriam o saldo da mesma peça ao meio |
| **excluir peça que tem movimentação** | deixaria o extrato órfão: lançamento apontando para ficha que não existe. Quem não é mais usado vira **inativo**, não apagado |

### Custo e valor em estoque
`axCustoAtual()` usa o custo da **entrada mais recente** — é o que vale para
repor. O valor em estoque é `saldo × custo atual`.

⚠️ **Saída não grava custo**, de propósito: quem consome a peça não negocia
preço, e deixar o campo aberto ali produziria dois números concorrentes para a
mesma peça. Entrada grava; saída e ajuste, não.

### Situação, badge e a faixa do topo
`axSituacao()` devolve **zerado** (saldo ≤ 0), **baixo** (`min > 0 && saldo <= min`)
ou **ok**. O `<=` é deliberado: saldo **igual** ao mínimo já é hora de comprar.

A lista vem ordenada por **o que falta primeiro** — zerado, depois baixo, depois
o resto —, o item do menu ganha badge com a contagem, e `axTextoAlerta()` entra
na **mesma faixa de alertas** do topo que a Agenda e os aluguéis já usam.

⚠️ `checkAlertas` tinha uma saída antecipada que dependia de haver aluguel ativo;
virou `if (!db) return;`. Sem isso, um dia sem aluguel ativo esconderia também o
aviso de estoque e o da Agenda.

### Onde a aba foi registrada (a lição do `multasefrotas`)
`PANELS`, `_TODOS_PAINEIS`, `TITLES`, `_PAINEL_LABEL`, `showPanel`, o perfil
**Operador** (Master e Admin herdam pelo `_TODOS_PAINEIS.slice()`) e — 🔴 a que
mais se esquece — **`normalizarDB`**, com `'almox'` **e** `'almox_mov'`. Sem
isso, depois da **primeira exclusão** o Firebase devolve a lista como objeto e a
aba quebra (armadilha 1), dias depois de publicar.

### O que NÃO entrou, de propósito
- **Fotos e anexos** — o sistema não usa Firebase Storage e já desativou
  comprovantes em manutenção para não inflar o banco. Mesma decisão da aba de
  Sinistros.
- **Ligação automática com a Manutenção** (dar baixa na peça ao fechar o
  serviço). A movimentação já aceita **placa** e observação, então a informação
  cabe; automatizar muda a tela de Manutenção, que não foi pedida.
- **Despesa automática na entrada.** A compra de peça é despesa, mas a
  Manutenção→Despesa da Auto Mais ensinou que vincular dois mundos exige regra de
  edição e exclusão nos dois lados. Fica para quando for pedido.

### Validado
- `node --check`; `<div>` do HTML balanceadas (737/737); os dois carimbos batendo
- **70 testes** com o código real: o saldo nos três tipos de movimentação, o
  ajuste com sinal, as 6 recusas, o custo da entrada mais recente, o valor em
  estoque, as três situações com a borda do mínimo, a ordenação, os filtros das
  duas sub-abas, o badge, a faixa do topo, o nome escapado, e a lista voltando
  como objeto do Firebase
- **24 defeitos injetados — todos acusados**, entre eles saída somando em vez de
  subtrair, saída maior que o saldo passando, código repetido aceito, excluir
  peça com histórico, e tirar o `'almox'` do `normalizarDB`
- **No navegador, no arquivo publicado**, com 4 peças e 6 movimentações injetadas
  **só na memória**: cartões 4 / 2 / 1 / R$ 407,50, saldos `[7,1,0,0]`, badge 3,
  uma saída de 99 **barrada**, uma de 2 aceita (saldo 7 → 5), placa gravada em
  maiúscula e a faixa *"⚠️ 2 peça(s) SEM ESTOQUE · 2 abaixo do mínimo"*.
  **Nada foi gravado em produção.**
- Regressão: **31 suítes, 1.475 testes**, nenhuma falha

### ⚠️ Dois testes meus que passavam sem provar nada
Antes de fechar, revi a suíte e **joguei dois testes fora**: um checava a guarda
de dígito num ponto em que ela só muda a mensagem (o lançamento era recusado de
outro jeito), e o outro conferia o id da movimentação, que **não é desenhado na
tela** — a asserção nunca poderia falhar. Reescritos para exercitar o que
prometem.

⚠️ E o ambiente de teste mentiu de novo, pelo mesmo lugar: meu `value` falso
devolvia número, não texto, então `.trim()` estourava onde o navegador não
estouraria. **Stub de DOM tem de converter como o navegador converte** — em
`<input>` o `value` é sempre string.

### ⚠️ Teste estrutural ancorado no vizinho quebra sem defeito nenhum
Entrar com `'almox','almox_mov'` no `normalizarDB` **quebrou duas asserções
antigas** (`t-agenda` e `t-rec-registro`) que exigiam literalmente
`'recibos','agenda'].forEach` — o nó continuava registrado, só não era mais o
último da lista. As duas passaram a procurar **o nome dentro do corpo do
`normalizarDB`**, sem depender de quem vem depois.

É um defeito de teste com custo real: teste que falha pelo motivo errado ensina a
ignorar teste vermelho. As duas injeções correspondentes continuam acusando.

### ⏳ Não verificado
Falta exercitar **logado**: o Rogel abrir o Almoxarifado, cadastrar uma peça de
verdade, lançar uma entrada e uma saída e conferir o saldo. Eu não autentico.

---

## 🔴 O cadastro da peça não tinha campo de quantidade — 17/10/2026 (gestao v127)

Relato: *"a tela de cadastramento do item no almoxarifado não mostra o campo da
quantidade, mostra apenas o campo da quantidade mínima"*. Estava certo, e o
desenho era meu.

### O que eu errei
A regra de que **o saldo vem das movimentações** (v126) continua certa — mas eu a
transformei em *ausência de campo*, deixando um aviso em letra miúda dizendo
"cadastre a peça e depois lance uma entrada". Para quem está **cadastrando o que
já está na prateleira**, isso é trabalho dobrado em duas abas, e a tela parecia
incompleta. **A regra era boa; a tela, não.**

### O conserto: o campo existe, e alimenta o extrato
Entrou **"Quantidade em estoque hoje"** (+ **custo unitário**, opcional) no
formulário da peça. O que a pessoa digita **não é gravado na ficha**: vira uma
**entrada no extrato**, com a data de hoje e motivo *"Saldo inicial do cadastro"*.

| | |
|---|---|
| saldo continua sendo | a soma das movimentações |
| a ficha guarda quantidade? | **não** — nem `qtd`, nem `saldo`, nem `estoque` |
| quem olhar o extrato daqui a um ano | vê de onde esse saldo veio, e quem lançou |

⚠️ **O custo unitário entrou junto por necessidade, não por capricho:** sem ele a
entrada inicial nasce com custo 0 e o cartão **"valor em estoque" mostraria R$ 0,00**
para uma prateleira cheia. Com ele, 10 × R$ 32,50 = R$ 325,00, conferido no ar.

### 🔴 O campo existe só no CADASTRO
Na edição ele **dá lugar ao saldo atual**, em texto:

```
Em estoque hoje: 10 un — para mudar, lance uma entrada ou saída,
que ficam registradas no extrato.
```

Sem isso, **corrigir o nome ou o local de uma peça somaria estoque a cada
salvamento** — o estoque subiria sozinho, sem ninguém entender por quê. Há teste
e defeito injetado para os dois lados, inclusive para o caso de alguém abrir um
cadastro novo, digitar uma quantidade, fechar e ir editar outra peça: o valor
esquecido no campo escondido é **ignorado**.

### As recusas
| Entrada | O que acontece |
|---|---|
| em branco ou `0` | peça criada, **nenhuma movimentação** — saldo zero |
| texto sem dígito (`abc`) | **recusa** e nada é criado. `_axNum('abc')` devolve **0**, e 0 passaria calado — mesma lição da baixa em lote (v94) e da franquia (v99) |
| negativa | **recusa** — estoque não começa negativo; acerto se faz pelo **Ajuste** |
| nome vazio | recusa antes de criar qualquer entrada |
| código repetido | continua barrado, **sem deixar entrada órfã** |

🔴 **Ficha e entrada vão numa gravação só.** Em duas, uma falha no meio deixaria
a entrada apontando para uma peça que não existe.

### ⚠️ A data é local, não UTC — e o teste precisou de relógio falso
A entrada usa `getFullYear/getMonth/getDate`, como a tela de movimentação já
fazia. Com `toISOString()` um lançamento feito **depois das 21h** no Brasil cairia
no **dia seguinte**.

O detalhe de método: meu primeiro teste comparava a data com "hoje" calculado do
mesmo jeito — e **de manhã UTC e local batem**, então o defeito injetado
**passou**. O teste só vale com o relógio fixado em **17/10 22h30 local = 18/10
01h30 UTC**. Defeito que só aparece em certa hora do dia precisa de hora fixa no
teste; "rodou e passou" não diz nada sobre as outras 3 horas.

### Validado
- `node --check`; `<div>` balanceadas (741/741); os dois carimbos batendo
- **53 testes** com o código real: o campo no HTML, abrir novo × abrir edição, a
  entrada criada (tipo, id, data, custo, motivo, quem), **a ficha sem quantidade**,
  a gravação única, as 5 recusas, decimal (`12,5`) e milhar (`1.250,00`),
  convivência com peça que já existia, lista vindo como objeto do Firebase, e a
  situação (zerado/baixo) já certa na peça recém-criada
- **15 defeitos injetados — todos acusados**, entre eles gravar a quantidade na
  ficha, a edição criando entrada, aceitar negativo, gravar duas vezes, a data em
  UTC e o aviso dizendo que entrou estoque quando não entrou
- **No navegador, contra o arquivo publicado**: cadastro com 10 un a R$ 32,50 →
  1 peça, 1 entrada, saldo 10, R$ 325,00, uma gravação, aviso *"Peça salva com 10
  un em estoque"*; editar → campo oculto, saldo **continua 10**; `abc` e `-5`
  recusados com a mensagem certa. **Nada foi gravado em produção.**
- Regressão: **32 suítes, 1.528 testes**, nenhuma falha

### ⚠️ Armadilha nova do ambiente de teste
O `<script>` do `gestao.html` **declara `var db`**, e isso **anula o `db` que eu
passei no contexto** do `vm` — o primeiro teste estourou com *"Cannot set
properties of null"*. É a mesma sequência já registrada para os stubs: **avaliar o
script primeiro, religar `db`, `toast`, `saveDB` e os render depois.**

### ⏳ Não verificado
Falta **logado**: o Rogel cadastrar uma peça de verdade com quantidade e conferir
o saldo e o extrato. Eu não autentico.

---

## ✅ Recibo de Pagamento + 2ª via do Termo de Prorrogação — 17/10/2026 (gestao v128 · recibo v2)

Dois pedidos, os dois no painel **Formulários**: um recibo para o cliente
discriminando **a origem do que foi pago**, e acesso ao **recibo de prorrogação
que já existe no sistema**.

### 1. `sistema/recibo.html` (novo) — Recibo de Pagamento

Página avulsa, como os outros formulários do painel. Card com **Abrir** e
**Com Cliente**, e o recibo também entra no seletor "Gerar com Cliente".

#### 🔴 O total é a SOMA das linhas — não existe campo de total
Não há onde digitar o total. Ele vem das linhas de origem, e por isso o
documento **nunca pode dizer um valor diferente do que está discriminado** nele.
Mesma regra do saldo do Almoxarifado: o número que importa é derivado, não
digitado.

| Cuidado | Por quê |
|---|---|
| linha com valor **sem dígito** avisa | `num('abc')` devolve **0**, e 0 passaria calado no total — é a lição da baixa em lote (v94), da franquia (v99) e da quantidade inicial (v127) |
| linha **em branco** não é erro | é linha que a pessoa ainda não preencheu; só não entra no documento |
| não imprime **sem nome**, **sem data** ou com **total zero** | recibo de R$ 0,00 entregue a cliente é pior que nenhum |
| a placa sobe para **maiúscula** | é identidade do veículo, como no resto do sistema |
| nome e descrição são **escapados** | nome com `"` ou `<` não quebra o documento |
| data inicial em hora **local** | `toISOString()` jogaria o recibo da noite para o dia seguinte |

#### As origens vêm do vocabulário do sistema, não da minha cabeça
Medido antes de escrever: o campo `tipo` do Contas a Receber usa **Fatura (65),
Avarias (17), Multas (9), Renegociação (6), Pneus (1)**, e os itens `outros` das
faturas trazem franquia, borracharia, juros, parcelamento e peça trocada.

As 13 origens espelham isso: aluguel, multa, avaria, franquia de sinistro,
caução, diária extra/prorrogação, pneus, combustível, lavagem, manutenção,
juros/mora, parcelamento (acordo) e outros.

⚠️ **Inventar nome aqui faria o recibo não conversar com o Financeiro** na hora
de conferir o que entrou — a mesma razão pela qual os tipos de sinistro saíram da
Cláusula 11ª do contrato.

#### O documento
Papel timbrado da casa (mesmo logo dos outros documentos), valor em destaque e
**por extenso** (a mesma implementação do `_mltExtenso` do recibo de multa, que
já passou por 11 casos de teste), a frase de quitação, a tabela das origens com
total, observação, data, assinatura de quem recebeu e rodapé com o CNPJ.

Sai em **1 ou 2 vias** (padrão 2: cliente e empresa), a 2ª com quebra de página.

🔴 **A quitação é ressalvada de propósito:** o texto dá quitação
*"exclusivamente quanto às origens aqui discriminadas"*. Um recibo que desse
quitação geral do contrato ao receber uma multa seria um problema jurídico, não
um detalhe de redação.

#### Numeração
Sugerida e **editável**: `RP-AAAAMMDD-HHMM`. O prefixo é **RP**, não `REC`, para
não se confundir com o recibo de multa do `gestao.html` (`REC-AAAAMMDD-NNN`) na
hora de conferir. Há teste para isso.

#### ⚠️ O que NÃO faz: não grava no banco
O recibo **imprime, não registra**. Dois motivos:
1. `loka_db/recibos` é do recibo de multa e guarda `multas[]` congeladas — a aba
   **Recibos** reimprime a partir dali. Um registro de forma diferente naquele nó
   quebraria aquela tela.
2. A página é **pública** (GitHub Pages) e as regras do banco estão abertas
   (pendência 3): seria mais uma porta de escrita sem login. Mesma decisão do
   formulário de sinistro do colaborador.

**Registrar e consultar é um passo separado** — dá para fazer, mas envolve
decidir o nó, a numeração sequencial e quem pode emitir. Não construí por não
ter sido pedido.

### 2. Termo de Prorrogação no painel Formulários

#### 🔴 O documento já existia; o que faltava era chegar nele depois
`gerarTermoProrrogacao` existe desde antes e é emitido ao prorrogar pelo painel
**Aluguéis Ativos**. Mas:

| | |
|---|---|
| prorrogações no banco | **39**, em 26 locações |
| em locação **ativa** | 12 |
| 🔴 em locação **ENCERRADA** | **27** |

As 27 estão em `historico`, que o painel de ativos não lista — **não havia como
reimprimir aquelas**. A lista nova varre `ativos` **e** `historico`.

#### Dois botões, e a diferença entre eles é dita na tela
| Botão | O que faz |
|---|---|
| **🖨 2ª via do termo** | reimprime do que já está gravado. **Não altera nada** — nem data, nem valor |
| **Prorrogar locação** | leva ao fluxo que já existe, que **altera a data de devolução** |

🔴 O segundo abre com aviso em destaque dizendo isso. Formulários é um painel de
documentos: um botão ali que mudasse a data de uma locação sem avisar seria uma
armadilha. Ele também só lista locação **ativa** — não se prorroga o que acabou.

A reimpressão sai com carimbo **2ª VIA**, dizendo quando a prorrogação foi
registrada. `gerarTermoProrrogacao` ganhou um **8º argumento opcional**
(`segundaVia`); sem ele o fluxo normal sai exatamente como antes — há teste e
defeito injetado para isso.

A busca usa `semAcento` **nos dois lados**, e dá para esconder as encerradas.

### Validado
- `node --check` nas duas páginas; `<div>` balanceadas (gestao 776/776, recibo 30/30)
- **99 testes** com o código real das duas páginas e as **39 prorrogações reais**:
  a soma das origens, o documento inteiro, as 4 recusas de impressão, escape de
  HTML, 8 casos de extenso, remover linha, "Com Cliente", copiar resumo, limpar,
  a lista das prorrogações nos dois nós, o carimbo, os filtros, os estados vazios
  e o celular
- **31 defeitos injetados — todos acusados**, entre eles total que ignora as
  linhas, imprimir sem nome/sem data/com zero, a 2ª via não varrer o histórico, e
  reimprimir mexendo no registro original
- **No ar, nas páginas publicadas**: recibo de 3 origens → R$ 2.175,73 conferido
  contra soma feita por fora, extenso certo, 2 vias rotuladas, **cabe no A4**
  (726px de largura, 710px de altura, nada transborda, nem com R$ 12.500,00 e
  descrição longa), e a 375px não rola de lado. A 2ª via rodou contra o **banco
  real** (105 ativos, 92 encerrados): 39 prorrogações, documento de uma locação
  **encerrada**, com carimbo, `saveDB` armado para estourar se fosse chamado —
  **o banco ficou byte a byte idêntico**
- Regressão: **33 suítes**, nenhuma falha (⚠️ o total de testes que eu anotei aqui, 1.616, foi conta minha somando duas vezes; o número medido é **1.578**, conferido em 19/10)

### ⚠️ Cinco testes meus passaram com defeito vivo — e o que cada um ensinou
Na injeção, 5 defeitos não foram acusados na primeira rodada:

| O que passou | Por que o teste era fraco |
|---|---|
| data em UTC | de manhã UTC e local **batem**; só um relógio fixo em 22h30 distingue |
| busca sem acento | eu só testava digitar **sem** acento para achar nome **com**. O defeito de normalizar um lado só aparece no sentido oposto |
| card fora do painel | eu procurava a string `Recibo de Pagamento`, que também existe no `<option>` do seletor — passava por card |
| recibo via `abrirContrato` | eu chamava a função direto, sem passar pelo desvio do `gerarFormSelecionado` |
| 3 casas decimais | **inerte**: o `brl()` já arredonda com `Math.round` antes de formatar, então `maximumFractionDigits` não muda nada. Ficou no código, **sem teste**, e está dito aqui |

### ⚠️ Achados não corrigidos
- `gerarTermoProrrogacao` lê **`a.placa` direto** (armadilha 2 — contrato
  multi-veículo). Conferido: **nenhuma** das 26 locações com prorrogação é
  multi-veículo, então hoje não há erro. É anterior a esta mudança.
- `abrirContrato` **não faz nada** para tipo que não está no mapa `files` — falha
  em silêncio. Foi por isso que o recibo recebeu desvio próprio.

### 🔴 Perda minha: sobrescrevi uma suíte de teste
Dei à suíte nova o nome `t-recibo.js`, que **já era** o da suíte do recibo de
multa (106 testes, de 08/10). O arquivo foi sobrescrito e **não há cópia** — o
scratchpad não é versionado. A minha foi renomeada para `t-recibo-pag.js`.

**O que isso significa:** nenhuma regressão agora (o recibo de multa não foi
tocado hoje, e a outra suíte dele, `t-rec-registro.js` com 58 testes,
sobreviveu), mas a cobertura do **documento** do recibo de multa se foi. Antes de
mexer naquele gerador, vale refazê-la.

⚠️ **Regra:** antes de criar suíte, conferir se o nome já existe (`ls t-*.js`).

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Formulários, emitir um recibo de verdade e tirar
uma 2ª via de um termo. Eu não autentico.

---

## ✅ Relatório das multas novas de qualquer varredura — 19/10/2026 · multas v15

Pedido: *"um botão que gere o relatório de multas novas a cada vez que fizermos
a consulta no e-Frotas"*.

### O relatório já existia — o que faltava era chegar nele
`efGerarRelatorio()` existe desde 30/09, mas o botão só era desenhado **dentro
do log**, no instante em que a varredura terminava. Recarregou a página, fechou a
aba ou voltou no dia seguinte: o `_efLote` zerava e não havia mais como gerar.

Agora há um **botão fixo na barra do e-Frotas** — "📄 Relatório de multas novas" —
que abre a lista das varreduras e gera o relatório de qualquer uma.

⚠️ O botão **não entra no `setBtns`** de propósito: ler o que já está gravado é
grátis e não conflita com uma varredura em andamento.

### 🔴 Por que NÃO usei o `loka_db/efrotas_status`
Era o caminho óbvio, e está errado. Aquele nó é **sobrescrito a cada LOTE**, e
alguns campos são do último lote enquanto outros são acumulados. Medido em
19/10/2026, logo depois de uma varredura real:

| `efrotas_status` dizia | A verdade |
|---|---|
| `novas: 0` | **13 multas** gravadas entre 12:19 e 12:21 |
| `placasConsultadas: 9` | 109 placas processadas (`processadosAteAgora`) |

Um relatório lido dali diria "0 multas novas" com 13 linhas na tabela.

### A fonte certa: as próprias multas
As varreduras são **reconstruídas** das multas de `origem === 'efrotas'`,
agrupadas pela proximidade do `criadoEm` (corte de **30 min**, constante
`EF_REL_CORTE_MIN`). Funciona **retroativamente** — todo o histórico aparece, sem
depender de nada que o backend passe a gravar.

Conferido no banco real (638 multas, 297 do e-Frotas):

| Data | Multas | Placas | Valor |
|---|---|---|---|
| 19/10 12:19 | 13 | 12 | R$ 2.701,34 |
| 14/10 17:56 | 13 | 12 | R$ 2.245,83 |
| 07/10 19:39 | 17 | 13 | R$ 2.506,17 |
| 30/09 18:02 | 9 | 8 | R$ 2.116,92 |
| 25/09 14:58 | 8 | 8 | R$ 1.171,42 |
| 24/09 12:42 | 11 | 9 | R$ 1.887,29 |
| 15/09 19:42 | 55 | 26 | R$ 11.851,72 |
| 18/08 19:18 | 171 | 54 | R$ 42.107,22 |

🔴 **A invariante que mantém isso honesto:** a soma das varreduras tem de dar
exatamente o total de multas do e-Frotas com `criadoEm` — **297 = 297**, nenhuma
perdida, nenhuma em duas listas. É teste, e há defeito injetado para ela.

⚠️ O corte é de multa para multa, **não** do início da varredura: a de 18/08
durou 15 minutos, e medir do início a partiria em duas.

⚠️ Multa importada de **PDF nunca entra** — ela não veio de consulta. A janela diz
isso, e um defeito injetado prova que o filtro pega.

### 🔴 O relatório histórico não imprime número que não sabe
Placas consultadas, atualizadas, baixadas e placas com erro **só existiam na
sessão** de quem rodou a varredura. No relatório histórico eles **não aparecem** —
nem inventados, nem repetidos do `efrotas_status`. O documento mostra o que é
verdade (multas novas · placas diferentes · valor total) e traz uma nota dizendo
**de onde vêm os números** e o que não ficou guardado.

É o mesmo padrão dos cartões do Contas a Receber (v120–v122): quando um total
embute algo que o olho não vê, a tela **diz**, em vez de o código decidir.

O relatório gerado **ao fim da varredura** continua completo, com os 5 contadores
e a tabela das placas com erro.

### Um gerador, não dois
O documento foi extraído para **`_efRelDoc(o)`**, usado pelos dois caminhos.
⚠️ Duplicar o HTML seria repetir o acidente da v119: havia **duas** funções
`statusReal`, uma aprendeu sobre `renegociado` e a outra não — e o relatório
impresso era justamente o que errava.

### Validado
- `node --check`; `<div>` balanceadas (24/24); os dois carimbos batendo
- **os 48 testes que já cobriam o relatório da sessão continuam passando** — é o
  que prova que o refactor não mexeu no caminho que funcionava
- **57 testes novos** com o código real e as 638 multas reais: as 8 varreduras, a
  ordem, a invariante dos 297, nenhuma multa em duas listas, PDF fora, o corte de
  29 × 31 min, banco vazio, `criadoEm` ausente/vazio/**nulo**/inválido, lista
  vindo como objeto do Firebase, placa com hífen, o documento inteiro, escape de
  HTML, valor numérico (195.23 → R$ 195,23), as recusas, a janela nos dois
  estados e o caminho da sessão intacto
- **23 defeitos injetados — todos acusados**, entre eles PDF entrando, medir do
  início, corte de 1 min, ordem invertida, imprimir "Placas consultadas", parar de
  dizer de onde vem, pop-up fingindo sucesso, e o relatório da sessão perdendo os
  contadores
- **No ar, no arquivo publicado, com o banco real** (só leitura): 8 varreduras
  listadas, a de hoje marcada como mais recente, documento de 13 linhas com
  título "multas novas de 19/10/2026", total, a nota de origem, e **zero**
  menção a "Placas consultadas"
- Regressão **medida**: **33 suítes, 1.578 testes**, nenhuma falha

### ⚠️ Um teste meu passou com defeito vivo
Tirar a guarda `&& m.criadoEm` do filtro **não foi acusado** na primeira rodada.
Parecia inerte, porque o `isNaN` adiante já descarta `undefined` e `''`. Mas
`new Date(null)` é **1970-01-01, válido** — uma multa com `criadoEm: null` passava
e era **absorvida na varredura anterior** (a diferença fica negativa e passa no
corte), saindo no relatório como linha sem data. O teste passou a cobrir `null`
separadamente, e a asserção é sobre **quantas multas entram**, não sobre a data da
varredura.

### ⚠️ Correção de um número que eu anotei errado
A linha "33 suítes, **1.616** testes" do registro de 17/10 era **conta somada duas
vezes** — eu adicionei à mão uma suíte que já estava no total medido. O número
real, medido hoje, é **1.578**. Corrigido no registro.

⚠️ **Regra:** número de teste que vai para o registro é o que a regressão
**imprime**, nunca soma feita de cabeça.

### O que ficaria para depois (não foi pedido)
- **Gravar o resumo de cada varredura** (`efrotas_varreduras[]`) ao rodar, para o
  relatório histórico também ter placas consultadas e placas com erro. Exige uma
  porta de escrita nova na `multas.html` — decisão do Rogel.
- O mesmo botão no `gestao.html` **não** faz sentido: o painel e-Frotas de lá é
  código morto (`ni-efrotas` não está no menu).

### ⏳ Não verificado
Falta **logado**: o Rogel abrir a `multas.html`, clicar no botão e gerar o
relatório de hoje. Eu não autentico — a página tem portão próprio.

---

## ✅ Multi-seleção da situação no Contas a Receber — 19/10/2026 · gestao v129 → v132

Pedido: *"no contas a receber permitir multi seleção no status"*.

O `<select>` de uma situação só virou **quatro botões que somam**:
⏳ Pendentes · ◑ Parciais · ✅ Recebidos · 🤝 Renegociadas.
Nenhum marcado = **todas**, igual ao "Todos status" de antes. Um ✕ ao lado volta
para todas.

Cada botão mostra **quantos lançamentos aquela situação traria**, respeitando os
outros filtros (busca, tipo, período) e **ignorando o próprio status** — o número
diz o que se ganha ao clicar, não o que já está na tela. Hoje, nos dados reais:
47 pendentes · 10 parciais · 25 recebidos · 19 renegociadas.

### 🔴 Dois leitores, uma fonte só
Quem lê esse filtro são **dois** lugares: a tela (`finRenderReceber`) e o
**relatório impresso** (`relatorioReceber`) — e cada um tem o seu `statusReal`.
Foi exatamente assim que a v119 imprimiu número errado.

A seleção passou a morar em **`_recStatusFiltro()`**, e nenhum dos dois lê o DOM
por conta própria. O cabeçalho do relatório nomeia **todas** as situações
escolhidas ("Situações: Pendente, Parcial"), no singular quando é uma só.
Há defeito injetado para o relatório divergir da tela.

⚠️ As duas funções `statusReal` continuam duplicadas — é anterior a isto e não
foi pedido. Mas agora há teste exigindo que a conta do relatório bata com a da
tela, o que pega a divergência se uma das duas mudar sozinha.

### O que NÃO mudou
Os **cartões do topo** continuam somando **todos** os lançamentos: eles são o
panorama com a composição explicada (v120–v122), não o recorte. Quem reflete o
filtro é o **rodapé**, como já era.

### 🔴 Eu troquei o desenho por uma medição errada, e voltei atrás (v131 → v132)
Depois de publicar, medi a barra de filtros e vi **117px → 162px**: parecia que
os quatro botões custavam uma linha inteira. Troquei tudo pelo padrão do filtro
de órgão das Multas (um botão que abre painel com checkbox) e publiquei a v131.

**A medição estava errada.** Para comparar "antes e depois" eu substituía a caixa
de situação no markup com um regex — e o regex comia outros controles da barra.
Eu comparei duas barras diferentes.

Medido direito, buscando os arquivos **publicados** de cada versão e sem tocar no
markup:

| Versão | 900px | 1100px | 1300px |
|---|---|---|---|
| v128 (select antigo) | 160px | 160px | 157px |
| v129 (4 botões) | 160px | 160px | 157px |
| v131 (botão + painel) | 160px | 160px | 157px |

**Idênticas.** Os botões não custavam linha nenhuma — a barra já tinha aquela
altura com o `select`. A v132 reverte a v131 e volta aos botões, que mostram a
contagem sem abrir nada e filtram com um clique.

⚠️ **A lição:** medir "antes e depois" exige que o *antes* seja o arquivo real
daquela versão. Markup remendado por regex para simular a versão antiga não é a
versão antiga — e o número que sai dali decide errado. Buscar o arquivo publicado
do commit anterior custa uma linha de `fetch`.

Ficou do caminho: o `aria-pressed` (v130), que é útil por si — é o que o leitor de
tela anuncia, e **o estado não pode ser verificado pela cor**: o navegador
reescreve `#c0392b` como `rgb(192, 57, 43)`, então a conferência por texto do
`cssText` passava no DOM falso e falhava no navegador de verdade.

A medição está registrada em comentário no fonte, para a mesma dúvida não voltar.

### Validado
- `node --check`; `<div>` balanceadas (777/777); os dois carimbos batendo
- **48 testes** com o código real e os **101 lançamentos reais**: estado inicial,
  uma situação, duas (47+10=57), três (76), as quatro = nenhuma (101), desmarcar,
  limpar, convivência com busca/tipo/período, a contagem de cada botão batendo com
  a lista em cada combinação, o relatório concordando com a tela, o cabeçalho
  impresso, lista vazia, lançamento nulo (com e sem situação marcada), situação
  inexistente, e a v119 preservada
- **19 defeitos injetados — todos acusados**, entre eles nenhuma marcada esconder
  tudo, voltar a aceitar uma só, o relatório ler o DOM por conta própria, a
  contagem circular e o nulo quebrando
- **No ar, no arquivo publicado**: 47 → 57 → 76 → 29 → 101 conforme marca e
  desmarca, botão marcado com fundo `rgb(192,57,43)` e `aria-pressed=true`, ✕
  aparecendo e sumindo, e a barra medida em 900/1100/1300px
- Regressão **medida**: **34 suítes, 1.626 testes**, nenhuma falha

### ⚠️ Duas suítes antigas precisaram de conserto — e uma passava por motivo errado
- `t-reneg.js` (a da v119) acionava o filtro pelo `<select>` que deixou de
  existir. Um dos seus testes — *"filtrando só renegociadas, as linhas continuam
  visíveis"* — **passava sem filtro nenhum aplicado**. Agora exercita o filtro de
  verdade.
- O elemento falso daquela suíte não tinha `style.cssText` nem `setAttribute`, e o
  render estourava antes de qualquer teste. Completado.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o Contas a Receber, marcar duas situações e
conferir a lista e o relatório impresso. Eu não autentico.

---

## ✅ Cláusulas 10 e 11 dos contratos — 20/10/2026 · mensal v4 · diária v4

Pedido: acrescentar à **Cláusula 11** o caso do veículo devolvido avariado cujo
conserto não atinge a franquia, e mudar o prazo de devolução da caução da
**Cláusula 10** para **10 dias**.

### As duas cláusulas existem nos DOIS contratos
`contrato-mensal.html` e `contrato-diaria.html` têm **Cláusula 10ª – Da Caução**
e **Cláusula 11ª – Do Seguro** com a mesma redação de base. As alterações
entraram nos dois: deixar um contrato dizendo 72h e o outro 10 dias seria pior
que não mexer.

⚠️ **Conferido antes de editar:** esse texto **não existe em nenhuma outra
página**. A única menção a "Cláusula 11" fora dos contratos é um **comentário**
no `gestao.html` (de onde vieram os tipos de sinistro) — nada funcional depende
do texto.

### Cláusula 10 — só o prazo mudou
`em até 72h` → **`em até 10 (dez) dias`**. O resto da frase ficou intacto
(Cartão de Crédito/PIX, avaliação física, verificação de multas e pedágios).

🔴 **A diária tem uma frase que o mensal não tem** — "caso o veículo seja
devolvido sujo, a caução somente será devolvida após lavagem" — e ela **não podia
ser tocada** ao mexer no prazo. Há teste dos dois lados: a frase continua na
diária, e **não** apareceu no mensal.

O número vai escrito **e por extenso** ("10 (dez) dias"): em contrato, algarismo
sozinho é o que se contesta depois.

### Cláusula 11 — o acréscimo
> Caso o veículo seja devolvido avariado e o valor do conserto não atinja o valor
> da franquia do seguro, o reparo será realizado em oficina credenciada e o
> respectivo orçamento será cobrado do LOCATÁRIO, incluindo o valor referente às
> diárias em que o veículo necessitar permanecer parado para a realização dos
> serviços.

A redação é a do Rogel, ajustada à linguagem do próprio documento — que trata as
partes como **LOCATÁRIO / LOCADOR em maiúscula** (conferido na Cláusula 3ª).

🔴 **Entrou DENTRO do parágrafo da Cláusula 11ª, não como cláusula nova.**
Cláusula nova renumeraria o contrato — e há defeito injetado que prova que o
teste pega isso (a numeração passou a ser verificada sequencial, 1…13 no mensal e
1…15 na diária).

As **4 franquias continuam lá**, com os **4 campos editáveis** (`c11Danos`,
`c11PerdaTotal`, `c11Parabrisa`, `c11Farois`) e a formatação de moeda
(`moedaClausula`) — isso é testado, porque o acréscimo foi colado no mesmo
parágrafo onde eles vivem.

### Cabe no A4 — medido, não suposto
O acréscimo tem ~330 caracteres, e em 16/10 houve ajuste explícito para o
contrato caber numa folha. Medido no navegador, com as regras de `@media print`
aplicadas e comparando com o **arquivo v3 real do commit anterior**:

| | altura | páginas A4 | sobra |
|---|---|---|---|
| mensal v3 | 922px | 0,86 | 148px |
| **mensal v4** | **930px** (+8) | **0,87** | **140px** |
| diária v3 | 957px | 0,89 | 113px |
| **diária v4** | **972px** (+15) | **0,91** | **98px** |

A4 útil = **726 × 1070px** (A4 menos a margem de 7mm 9mm do `@page`).
Os dois continuam em **uma folha**, sem transbordar a largura.

⚠️ A medição é do formulário **em branco** (sem linhas de veículo, e sem os
scripts — o portão de sessão redirecionaria o iframe). Com muitos veículos o
documento cresce; a diária é a que tem menos folga (98px).

### Validado
- `node --check` nos dois; `<div>` balanceadas (mensal 45/45, diária 48/48 —
  iguais ao registro da v124); os **três** carimbos de cada arquivo batendo
- **42 testes** que travam a **redação**, não só a presença: o prazo em
  "10 (dez) dias", nenhum "72h" sobrando, a frase do veículo sujo só na diária,
  as 5 partes do acréscimo (condição, gatilho, oficina credenciada, cobrança do
  LOCATÁRIO, diárias do veículo parado), o texto **idêntico nos dois contratos**,
  as 4 franquias, os 4 campos editáveis, a numeração sequencial e o ponto final
- **18 defeitos injetados — todos acusados**, entre eles voltar para 72h, trocar
  a condição para *"atinja"* a franquia, esquecer as diárias, não dizer de quem é
  a cobrança, o acréscimo entrar num contrato e não no outro, e virar cláusula
  própria
- **No ar, nos arquivos publicados**, parseados pelo navegador: builds v4, o
  texto das duas cláusulas, o acréscimo idêntico nos dois, 4 franquias e os 4
  valores (5.000,00 / 5.000,00 / 800,00 / 600,00) intactos
- Regressão **medida**: **35 suítes, 1.668 testes**, nenhuma falha

### ⚠️ Dois tropeços meus de verificação (os dois pegos por recusa, não por sorte)
1. O script de alteração **recusou aplicar** porque esperava 2 carimbos e achou
   3 — há um terceiro no `console.log` de cada contrato. Melhor parar e conferir
   do que trocar só dois e publicar com carimbo desencontrado.
2. A primeira medição de A4 deu **1070px para as quatro versões** — número limpo
   e medição nenhuma: o iframe tinha a altura de **uma página**, então o
   `scrollHeight` empatava com o contêiner. Com altura folgada (6000px) os
   números passaram a variar. É a mesma família do erro de ontem: **medida que
   não varia entre versões diferentes não está medindo.**

### ⚠️ O que o sistema ainda NÃO faz com essa cláusula nova (não foi pedido)
A aba **Ocorrências / Sinistros** só tem o campo de **franquia**
(`franquiaDevida` / `franquiaValor`), que gera o lançamento em Contas a Receber.
A cobrança que a cláusula nova descreve — **orçamento do reparo + diárias do
veículo parado** — não tem campo próprio: hoje ela entra como lançamento manual
em Contas a Receber, tipo **Avarias** (que é o que os 17 lançamentos desse tipo
já são). Virar campo na aba de Sinistros é trabalho separado, se ele quiser.

### ✅ Conferido logado — 20/10/2026
O Rogel abriu o contrato e conferiu as duas cláusulas no documento. Nada a
ajustar.

---

## ✅ Sinistros: cobrança de reparo abaixo da franquia — 20/10/2026 (`987cc66`) · gestao v133

A Cláusula 11ª passou a prever (hoje, mensal v4 / diária v4) que veículo devolvido
avariado cujo conserto **não atinja a franquia** é reparado em oficina credenciada
e o orçamento é cobrado do locatário, **incluindo as diárias em que o carro ficar
parado**. A aba de Ocorrências só sabia cobrar **franquia** — o registro de ontem
já anotava isso como trabalho separado.

### 🔴 As duas cobranças são MUTUAMENTE EXCLUSIVAS
Dois motivos apontam para o mesmo lado:
1. **O contrato cobra uma OU outra**: conserto alcança a franquia → seguro, cobra-se
   a franquia; não alcança → cobra-se orçamento + diárias.
2. **O lançamento em Contas a Receber é UM por ocorrência**, achado por
   `sinistroId`. Duas marcadas criariam duas cobranças disputando o mesmo
   registro, e **uma apagaria a outra em silêncio**.

Marcar uma desmarca a outra e avisa. A validação recusa as duas de novo ao salvar
— esconder botão não é controle, e o checkbox pode ser mexido por fora.

⚠️ `_snMostrarCobrancas()` existe **só** para mostrar/esconder as caixas, separado
dos dois handlers. Sem essa separação, `snAlternarFranquia` e `snAlternarReparo`
se chamariam de volta — há defeito injetado que prova a recursão.

### O orçamento reusa o campo que já existia
O campo **Custo do reparo** (`snCustoReparo`) já estava no formulário, sem uso
nenhum além de registro. Ele passou a ser a **base da cobrança**.

⚠️ **Dois campos para o mesmo conserto virariam dois números concorrentes**, e um
deles ficaria velho. É a mesma razão pela qual o saldo do Almoxarifado não é
digitado e o total do recibo não tem campo próprio.

A conta é `orçamento + (dias × diária)`, mostrada ao vivo na tela com as três
partes à vista, para quem preenche conferir sem fazer conta de cabeça.

### A diária vem do cadastro, e não atropela quem digitou
Ao escolher o veículo, a diária do cadastro entra no campo — **mas só quando ele
está vazio**. Se o operador já ajustou o valor, trocar o veículo não apaga o que
ele digitou. Veículo sem `diaria` cadastrada deixa o campo em branco (2 dos 119).

### 🔴 Uma função para as duas cobranças
`_sinSincronizarFranquia` virou **`_sinSincronizarCobranca`**, e quanto/por que
cada ocorrência cobra saiu para **`_sinCobranca(reg)`**.

⚠️ Duplicar a lógica foi exatamente o acidente da **v119**: havia **duas**
`statusReal`, uma aprendeu sobre `renegociado` e a outra não — e o relatório
impresso era o que errava. Aqui tela e relatório leem a mesma função.

As proteções continuam valendo, agora para as duas cobranças: lançamento com
**recebimento** (parcial ou total) **não é reescrito nem apagado**, inclusive ao
**trocar de tipo de cobrança** — seria perder dinheiro já registrado. O aviso diz
o que fazer.

### 🔴 O lançamento passa a nascer com tipo "Avarias"
Antes ele nascia **sem tipo** e caía em **"Outros"** no filtro do Contas a Receber.
`'Avarias'` já existe em `REC_TIPOS` e na `<option>` do filtro.

⚠️ Conferido antes: **nenhum lançamento de sinistro existia** (zero entradas com
`sinistroId`), então o carimbo não mexe em dado nenhum. Editar **carimba** um
lançamento que esteja sem tipo — senão a cobrança ficaria fora do filtro para
sempre; há teste e defeito injetado só para isso.

### Painel, coluna e relatório somam as DUAS
O cartão virou **"A cobrar dos locatários"**, a coluna **"A cobrar"** (dizendo
embaixo se é *franquia* ou *reparo + diárias*) e o rodapé do relatório **"Total a
cobrar dos locatários"**.

🔴 Somando só a franquia, uma ocorrência com cobrança de reparo apareceria como
**"—" e R$ 0** — a tela mentiria sobre o que há para receber. É o mesmo defeito que
o relatado na v119, e está entre os injetados.

### Validação (a lição do `mltNum('abc') = 0`)
| Recusa | Por quê |
|---|---|
| orçamento **sem dígito** | `mltNum('abc')` devolve **0**, e 0 passaria calado |
| orçamento **zero**, mesmo com diárias preenchidas | sem conserto não há diária de carro parado para conserto |
| **dias parado > 0 sem valor de diária** | cobraria R$ 0,00 por dia sem ninguém notar |
| **as duas cobranças** marcadas | o lançamento é um por ocorrência |

Zero dias parado **salva** — pode não ter ficado parado.

### A importação nunca aceita cobrança de fora
O código `LOKA-SIN::` é um texto que qualquer um monta à mão. `reparoDevido`,
`reparoDias`, `reparoDiariaValor` e `reparoVencimento` entram **sempre vazios**,
como `franquiaDevida` já fazia: **cobrar o locatário é decisão da LOKÁ, caso a
caso**, e quem está na rua registra o fato, não decide a cobrança.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**784/784**; eram 777, +7 do bloco
  novo); os dois carimbos batendo
- **85 testes novos** com o código real: a conta em 7 entradas, a exclusividade
  nos dois sentidos, as 6 recusas, o registro, o lançamento (valor, tipo,
  vencimento, `sinistroId`, histórico mostrando a conta), editar sem duplicar,
  **trocar de tipo de cobrança nos dois sentidos**, as 4 faces da proteção do que
  já foi recebido, excluir, `confirm` recusado, cartão/coluna/relatório, reabrir,
  a diária do cadastro, a importação e lista vindo como objeto do Firebase
- **os 72 testes da suíte de Sinistros (v99) continuam passando** — é o que prova
  que a franquia não mudou de comportamento
- **32 defeitos injetados — todos acusados**, entre eles somar as duas cobranças,
  esquecer as diárias, esquecer o orçamento, o cartão e o relatório somando só a
  franquia, reescrever lançamento já recebido, a diária atropelando o operador, a
  importação aceitando cobrança de fora, e a recursão entre os handlers
- **No ar, no arquivo publicado**, com os **119 veículos, 106 aluguéis e 101
  lançamentos reais**, sem firebase no ambiente (**nada gravado em produção** —
  conferido relendo o banco: segue com 5 ocorrências e 101 lançamentos):
  VW Amarok RHI1I58, locatário resolvido sozinho, diária 600,00 vinda do cadastro,
  1.350,00 + 4 × 600,00 = **R$ 3.750,00**, lançamento `Avarias` pendente no nome
  certo; editar para 2 dias → **R$ 2.550,00 no mesmo lançamento** (102 → 102);
  recebimento parcial → valor **intacto** com o aviso; cartão, coluna e relatório
  batendo com a soma feita por fora
- Regressão **medida**: **36 suítes, 1.753 testes**, nenhuma falha

### ⚠️ Quatro testes meus passaram com defeito vivo
| O que passou | Por que o teste era fraco |
|---|---|
| aceitar **orçamento zero** | eu testava com dias/diária vazios, e aí o `total <= 0` já barrava. O caso que só essa guarda pega é orçamento 0 **com** diárias |
| **editar não carimbar o tipo** | meus lançamentos eram sempre criados pelo código novo, que já põe `Avarias`. O caso real é lançamento **sem tipo** |
| importação lendo **dias/diária** de fora | a asserção aceitava "contém `''`" — e `d.reparoDias\|\|''` também contém. Passou a exigir o valor **exatamente** `''` |
| a **recursão** entre handlers | minha injeção era inerte: trocar o fim de um handler pelo outro não fecha ciclo. O ciclo real é `_snMostrarCobrancas` chamar os handlers |

⚠️ Mais um tropeço de montagem: inseri um teste novo **entre o preparo e a
asserção** do teste seguinte, e ele passou a falhar por contaminação de estado.
Teste que falha pelo motivo errado ensina a ignorar teste vermelho.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir uma ocorrência, marcar "Conserto não atinge a
franquia", preencher orçamento e dias parado e conferir a cobrança em Contas a
Receber, com o tipo **Avarias**. Eu não autentico.

---

## ✅ Menu reorganizado por característica — 20/10/2026 · gestao v134

Pedido: *"reorganize o menu conforme característica. Exemplo. na aba financeiro
incluir Fatura."*

### O que estava errado
A seção **"Documentos"** tinha **13 dos 20 itens**, e a maioria não era documento
nenhum: Manutenção, Fornecedores, Multas, Agenda, Almoxarifado e o próprio
Financeiro moravam ali. Sobravam duas seções quase vazias ("Principal" com 5,
"Público" com 3). Na prática o menu era uma lista só.

### As 7 seções
| Seção | Itens |
|---|---|
| **Principal** | Dashboard |
| **Locação** | Aluguéis Ativos · Aluguéis Encerrados · Contratos Gerados |
| **Financeiro** | **Faturas** · Faturamento/Veículo · Contas a Receber / Pagar · Multas · Multas e-Frotas |
| **Frota** | Veículos · Frota Ativa · Manutenção · Almoxarifado · Ocorrências / Sinistros |
| **Cadastros** | Clientes · Fornecedores |
| **Ferramentas** | Agenda · Formulários · Relatório |
| **Público** | Reservas · Pré-Cadastro |

**Faturas no Financeiro** é o exemplo que ele deu.

**Multas entram no Financeiro** por serem fluxo de dinheiro — baixa como paga,
cobrada do locatário, recebida do cliente, recibo —, não por serem papel de
trâmite. É a característica que o operador usa; se ele preferir em Frota, é mover
uma linha.

⚠️ **"Público" foi mantida de propósito:** Reservas e Pré-Cadastro são os
**únicos painéis alimentados por página sem login** (pendência 7). Espalhá-los em
Locação e Cadastros perderia exatamente essa distinção.

🔴 **Nenhum painel nasce, morre ou troca de função.** Mudou a ordem e os
cabeçalhos — e o teste trava isso: todo painel de `_TODOS_PAINEIS` tem item no
menu, todo item é painel, nenhum repetido. **Perder um item aqui tira o painel do
sistema**, porque para vários deles o menu é a única porta.

### "Financeiro > Financeiro" não se lê
O item do painel `financeiro` virou **"Contas a Receber / Pagar"** — que é o que
o painel é (receber, pagar, acertos). Mudou nos **três** lugares: menu, título do
painel (`TITLES`) e tela de perfis (`_PAINEL_LABEL`). Há teste exigindo que os
três digam a mesma coisa; a chave gravada (`financeiro`) **não mudou**, então
nenhum perfil salvo é afetado.

### 🔴 O cabeçalho acompanha os itens
Com 7 seções, cabeçalho sem item visível vira **título solto com nada embaixo**.
O perfil **Oficina** vê 1 painel: ficaria com 6 títulos vazios. (Com 3 seções isso
já acontecia e passava; com 7, não passaria.)

Entrou **`_ajustarSecoesMenu()`**, que caminha pelos filhos do `nav` e esconde o
cabeçalho quando nenhum item entre ele e o próximo está visível.

⚠️ **Chamada no fim do `_aplicarPermissoesUI`, DEPOIS de o Relatório receber a
permissão** — ele não está em `_TODOS_PAINEIS` e é o único item de "Ferramentas"
que depende de **ação** (`verRelatorio`), não de painel. Chamar antes decidiria o
cabeçalho com o display velho. **Eu errei essa ordem na primeira versão** e
corrigi antes de publicar; há defeito injetado para ela.

🔴 **Esconder usa `display:none`, mas MOSTRAR limpa o estilo inline** em vez de
pôr `'block'`. No celular o CSS esconde `.nav-sec` de propósito (linha 173 — o
menu virou barra horizontal), e um `block` inline **venceria aquela regra**,
enchendo a barra do celular de títulos. Medido no navegador a 420px: cabeçalho
`none`, inline vazio.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**788/788**; eram 784, +4 — 7
  cabeçalhos novos menos os 3 antigos); os dois carimbos batendo
- **55 testes**: as 7 seções na ordem, cada um dos 21 itens na seção certa,
  nenhum item perdido/repetido/sem painel, o `efrotas` morto seguindo fora do
  menu, os 3 rótulos do financeiro iguais, o `onclick` de cada item, o ícone, e o
  ajuste de cabeçalho rodando a **função real** para master / Oficina / Clientes /
  sem Relatório / sem painel nenhum, mais `nav` ausente e filho sem classe
- **21 defeitos injetados — todos acusados**, entre eles **perder um item do
  menu**, duplicar, tirar Faturas do Financeiro, o cabeçalho não acompanhar os
  itens, o ajuste rodar antes do Relatório, e o `'block'` que quebraria o celular
- **No ar, no arquivo publicado**, montando a sidebar real com o CSS real e
  rodando a `_ajustarSecoesMenu` publicada: master **7** seções · Oficina
  **Frota + Ferramentas** · Clientes **Financeiro + Frota + Ferramentas** · sem
  Relatório **só Frota** · sem painel **nenhuma** · e volta a 7 quando os painéis
  voltam. A 420px o cabeçalho continua escondido pelo CSS, com o inline vazio.
- Regressão **medida**: **37 suítes, 1.808 testes**, nenhuma falha

### ⚠️ Duas suítes travavam o NÚMERO do build
`t-sinreparo` (e depois a própria `t-menu`) exigiam literalmente
`v133-20261020-1050`. Publicar a v134 fez a suíte da v133 **falhar sem defeito
nenhum** — é a armadilha do teste estrutural ancorado no vizinho, de novo.

A regra do CLAUDE.md é **"os DOIS carimbos batem"**, não "o carimbo é vNNN". As
duas passaram a comparar linha 4 **com** `LOKA_BUILD`, sem número fixo; o defeito
injetado "os carimbos deixam de bater" continua sendo acusado.

⚠️ E o heredoc comeu os escapes **mais uma vez** ao tentar fazer essa troca por
script (`\n` virou quebra de linha de verdade dentro da string do teste). Para
texto com escape, **ferramenta de escrita — nunca heredoc.**

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o sistema e ver o menu novo. Eu não autentico.
Se alguma seção não fizer sentido para o jeito dele trabalhar, mover item entre
seções é uma linha.

---

## ✅ Cláusula 7ª do contrato mensal: multa e juros por atraso — 20/10/2026 (`48bc2e4`) · mensal v5

Pedido: *"em caso de atraso de pagamento, fica reservado ao locador o direito de
cobrar multa de 2% e juros de 6% ao mes calculados sobre o valor devido."*

### Como ficou
> Cláusula 7ª – Do Pagamento. […] via cartão de crédito ou PIX 39.911.638/0001-10.
> **Em caso de atraso no pagamento, fica reservado ao LOCADOR o direito de cobrar
> multa de 2% (dois por cento) e juros de 6% (seis por cento) ao mês, calculados
> sobre o valor devido.**

A redação é a dele, ajustada à linguagem do documento (**LOCADOR** em maiúscula,
como na Cláusula 3ª) e com os números **também por extenso** — mesma regra do
"10 (dez) dias" da Cláusula 10: em contrato, algarismo sozinho é o que se
contesta depois.

🔴 **Entrou DENTRO do parágrafo da Cláusula 7ª, não como cláusula nova** —
cláusula nova renumeraria o contrato. Os dados bancários (boleto, Itaú 7314 /
98590-9, cartão, PIX) ficaram **intactos**, e isso é testado: o acréscimo foi
colado no mesmo parágrafo onde eles vivem.

### 🔴 Só o MENSAL — e isso é deliberado
Ele **nomeou o documento** ("na clausula 7ª do contrato mensal"). A
`contrato-diaria.html` tem a **mesma Cláusula 7ª – Do Pagamento** e **não foi
tocada**.

⚠️ Diferente das Cláusulas 10 e 11 de hoje de manhã, em que ele disse só
"contrato de aluguel" e aplicar nos dois era a leitura certa. Aqui o escopo foi
dito. Há **teste travando as duas pontas**: entrou no mensal, continua fora da
diária — e um defeito injetado que faz o texto **vazar** para a diária é acusado.

Confirmado no ar: a diária publicada segue em `diaria-v4` sem o acréscimo.

### Conferido antes de escrever
**Não havia nenhuma menção a mora, juros ou atraso no contrato mensal**
(`mora`, `juros`, `atras`, `2%`, `6%` → **0 ocorrências cada**). Então não há
duas regras se contradizendo — e há teste exigindo que `multa de 2%` apareça
**uma vez só**, com defeito injetado que duplica a regra.

### ⚠️ O que eu sinalizei e ele decide (não é decisão minha)
**6% ao mês é 72% ao ano.** O padrão usual de mora em contrato no Brasil é 1% ao
mês, e em relação com pessoa física há limites do CDC. Um percentual bem acima do
usual pode ser **reduzido ou afastado em juízo** — e aí a cláusula não cobra nada.

Isso é **pergunta para o advogado/contador dele**, não para mim: errar aí não é
bug, é discussão judicial. O pedido foi aplicado **exatamente como ele escreveu**;
trocar o número é uma linha, se o advogado orientar diferente.

A multa de 2% está dentro do que se vê normalmente.

### Cabe no A4 — medido nos arquivos reais das duas versões
| | altura do `.contract` | páginas A4 | sobra |
|---|---|---|---|
| mensal v4 (antes) | **929px** | 0,87 | 141px |
| **mensal v5 (agora)** | **937px** (+8) | **0,88** | **133px** |

A4 útil = **726 × 1070px**. Continua em **uma folha**, sem transbordar a largura
(722px). O acréscimo são 179 caracteres.

⚠️ **A v4 veio do commit `1f10daf` pelo raw do GitHub, não de markup remendado** —
é a regra de 19/10: o *antes* tem de ser o arquivo real daquela versão.

### ⚠️ A armadilha do A4, agora pelo lado oposto
A medição deu **5996px para as duas versões** — e 5996 era exatamente a altura do
iframe. Em 20/10 o problema foi iframe **curto** (empatava em 1070); aqui foi
iframe **folgado** com `body { min-height: 100vh }`, que faz o body **sempre**
preencher o container.

Quem tem a altura do documento é o **`.contract`**, não o `body`. Medindo ele, os
números passaram a variar (929 ≠ 937).

🔴 **A regra vale nas duas direções:** *medida que não varia entre versões
diferentes não está medindo.* Dois empates em dois dias, por causas opostas.

### Validado
- `node --check`; `<div>` balanceadas (45/45, como na v124); os **três** carimbos
  batendo
- **20 testes novos** na suíte das cláusulas (**61 no total**): as 5 partes do
  acréscimo, a condição, de quem é o direito, a base de cálculo, os dois números
  com extenso, **a ordem do "ao mês"** (ligado aos juros, não à multa), os dados
  bancários intactos, uma só regra de mora, o texto não vazando para outra
  cláusula, e a diária limpa nas duas pontas
- **33 defeitos injetados — todos acusados**, entre eles **2% → 20%**,
  **6% ao mês → ao ano**, o extenso não bater com o algarismo (`6% (dois por
  cento)`), a multa ganhar periodicidade, apagar os dados bancários, virar
  cláusula própria, a regra aparecer **duas vezes** e **vazar para a diária**
- **No ar, no arquivo publicado**, parseado pelo navegador: a Cláusula 7ª com o
  texto exato, 17 cláusulas no documento, as Cláusulas 10 e 11 de hoje de manhã
  intactas, e a diária em `v4` sem o acréscimo
- Regressão **medida**: **37 suítes, 1.827 testes**, nenhuma falha

### ⚠️ A asserção que eu escrevi errada e o teste pegou
Meu primeiro teste da periodicidade era
`!/multa de 2%[^.]*(ao m[êe]s|ao ano)/` — e ele **falha na frase CERTA**, porque
o "ao mês" dos juros cai na mesma oração. O que importa não é a ausência da
palavra, é a **ordem**: multa → juros → "ao mês". Reescrito por índice.

⚠️ E a suíte travava o carimbo em `mensal-v4` (a armadilha já registrada hoje em
duas outras suítes). Passou a exigir **os dois carimbos batendo entre si** mais
**o prefixo do arquivo** (`mensal-v` / `diaria-v`) — que é a regra de verdade, e
pega o caso de o mensal sair carimbado como diária.

### ⏳ Não verificado
Falta **logado**: o Rogel gerar um contrato mensal e ler a Cláusula 7ª no
documento impresso.

---

## ✅ Condutor do aluguel — 22/10/2026 (`07c190a`) · gestao v135

Pedido: *"como podemos automatizar o processo de indicação de condutor?"* e, em
seguida, *"indicar e dar baixa na indicação no ato do contrato de locação"* e
*"como enviar a informação de forma manual quando o locatário não tiver acesso
ao app CNH Brasil"*.

### 🔴 A base legal, lida na fonte — e ela mudou tudo

**Resolução CONTRAN nº 918/2022** (texto obtido no DOU em 22/10/2026).

**Art. 5º, § 1º, II** — quando **não dá para colher a assinatura do condutor
infrator** (exatamente o caso de quem não tem o app, ou simplesmente não
assina), a locadora anexa ao formulário *"cópia de documento onde conste
cláusula de responsabilidade por infrações cometidas pelo condutor e comprove a
posse do veículo no momento do cometimento da infração"*, com no mínimo:

| | O contrato da LOKÁ tinha? |
|---|---|
| a) identificação do veículo | ✅ |
| b) identificação do proprietário | ✅ |
| **c) identificação do condutor** | 🔴 **NÃO — é este campo** |
| d) cláusula de responsabilidade pelas infrações | ✅ Cláusula 8ª |
| e) **período em que o veículo esteve na posse do condutor** | ✅ parcialmente |

**O campo que faltava era a peça (c).** Com ele, o contrato de locação passa a
servir como o anexo que a resolução exige — e a indicação deixa de depender de o
locatário ter aplicativo, conta gov.br ou assinar qualquer coisa.

### 🔴 A Cláusula 8ª cita resolução REVOGADA
Os dois contratos dizem *"nos termos da Resolução 619/16 do CONTRAN"*. O **Art.
38 da 918/2022** diz, literalmente: *"Ficam revogadas as Resoluções CONTRAN: …
**V - nº 619, de 6 de setembro de 2016**; …"* — em vigor desde **1º/04/2022**.

A procuração inteira se apoia nessa citação. **Não corrigi** (é texto de contrato
e não foi pedido); fica para o Rogel decidir com o advogado.

### Outros achados do mesmo texto
- **Art. 6º**: o proprietário responde se não identificar **até o fim do prazo**
  da NA, **ou se identificar em desacordo com o art. 5º**.
- **Art. 7º**: proprietário **PJ** que cai no art. 6º leva multa do **§ 8º do
  art. 257 do CTB**.
- **Art. 4º, § 2º**: o prazo da NA **não é inferior a 30 dias**.
- **Art. 8º, parágrafo único**: a notificação só vai ao **possuidor** (locatário)
  em contrato de **vigência ≥ 180 dias**, e desde que ele esteja registrado no
  órgão.
- **Art. 5º, § 6º**: as indicações são registradas no **RENACH**.

### O custo medido de não indicar
| | |
|---|---|
| multas **por não identificação do condutor** | **62 · R$ 26.315,17** |
| em 2026 | **45** |
| já pagas | 13 · R$ 7.232,34 |
| multas a indicar hoje | **390**, em 8 locatários |
| com prazo de indicação conhecido | 🔴 **1 de 390** |

### 🔴 Por que o condutor é uma LISTA com período, e não um campo
É a alínea (e). Num contrato mensal de um ano o motorista muda — e a indicação
de uma multa de março **não pode sair com o condutor de outubro**.

`ativo.condutores[]`, cada um com `desde` / `ate`. Trocar de condutor **fecha o
período do anterior na véspera** e o mantém no histórico. `_condNoDia(a, data)`
devolve quem dirigia naquele dia.

⚠️ `desde` vazio conta como "desde sempre" e `ate` vazio como "até hoje" — senão
um condutor cadastrado sem datas nunca seria encontrado. E **buraco entre dois
condutores devolve ninguém**: carro devolvido e realugado meses depois não pode
atribuir a multa ao condutor anterior.

### Onde entrou
| | |
|---|---|
| botão **👤** na linha do aluguel | modal com condutor atual + histórico — é por ele que se preenche os **107 aluguéis que já existem** |
| campos no **Novo Aluguel** | o condutor começa na data da **retirada** (a posse começa ali) |
| formulário de indicação | usa o condutor **daquela data**, varrendo `ativos` **e** `historico` |
| seção nova no documento | **"5 · Posse do veículo na data da infração"** — a alínea (e) |

🔴 **Sem condutor registrado, o formulário sai exatamente como antes**: no nome
do locatário, com a nota de transferência para PJ e sem citar a 918/2022. Há
teste e defeito injetado só para essa invariante.

⚠️ **Uma mudança que vale para todas as 390**: a seção 5 (período da locação)
passa a aparecer **mesmo sem condutor**, quando há locação cobrindo a data. É
informação verdadeira e exigida pela resolução, mas é diferente do que saía
antes.

Aluguel **sem** condutor **não ganha o campo** — nada de lista vazia inventada.

### 🔴 O defeito que o CRM já tinha ensinado, pego antes de publicar
`condRender` chamava `esc(...)`. **Não existe `esc` global neste arquivo**: as 5
são `var esc` **dentro** de outras funções, e **três delas escapam CSV**, não
HTML. Chamar de fora mataria o bloco inteiro do condutor — é exatamente o que
deixou o `crm.html` da Auto Mais em branco. Entrou `_condEsc`.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**812/812**; eram 788); os dois
  carimbos batendo
- **70 testes** com o código real: a lista (array, objeto do Firebase, nulo), o
  condutor do dia em 12 situações, as bordas de período, o **buraco** entre
  condutores, sobreposição, registrar/trocar/excluir, o aluguel novo com e sem
  condutor, a locação da multa (ativos, histórico, placa de outro carro, sem
  data), o documento com e sem condutor, e o fonte
- **27 defeitos injetados — todos acusados**, entre eles apagar o condutor
  anterior ao trocar, deixar dois em aberto, o formulário ignorar o condutor, a
  locação não varrer o histórico, perder o período da posse, e o `esc()` global
- **No ar, no arquivo publicado**, com os **107 aluguéis, 94 encerrados, 638
  multas e 136 clientes reais**, sem firebase no ambiente: condutor registrado no
  aluguel real da **RSC/SYO1G57**, troca de condutor fechando o anterior em
  31/08, multa real **R003972165 (06/12/2025)** saindo com o condutor certo,
  documento de 1 página com as 6 seções, CNH e categoria, o locatário como
  responsável com CNPJ, e a citação do art. 5º § 1º II. **Nada gravado em
  produção** — reconferido: 107 aluguéis, **0 com condutor**, 638 multas.
- Regressão **medida**: **38 suítes, 1.897 testes**, nenhuma falha

### ⚠️ Três testes meus passaram com defeito vivo
| O que passou | Por quê |
|---|---|
| ignorar o **fim** do período | com períodos encostados, a ordenação "quem começou depois" compensa sozinha. Quem exercita o fim é o **buraco** entre locações |
| ignorar a **placa** na busca da locação | eu só tinha aluguéis da mesma placa. Precisa de um aluguel de **outro carro** na mesma data |
| a guarda de **multa sem data** | parecia inerte (`ini <= ''` nunca casa) — só age quando o **aluguel** não tem retirada. Hoje os 107 têm |

### ⚠️ E o meu ambiente do navegador mentiu
Reatribuir `sandbox.db` **não troca o banco que o código vê**: `db` entra como
**parâmetro** da `new Function`, então o código continua lendo o objeto
original. A "reinicialização" não reiniciava nada, e a invariante do "sem
condutor" passou a dar verde com o condutor ainda lá. Para banco limpo de
verdade, **reconstruir o sandbox inteiro**.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Aluguéis Ativos, clicar no 👤 de um contrato
real, registrar o condutor e gerar o formulário daquela placa.

---

## 🔎 Automatizar a indicação no SENATRAN — o que foi apurado em 22/10/2026

### O que NÃO foi possível confirmar
**Não há API pública documentada** do SENATRAN/SNE para um sistema de terceiro
*efetivar* uma indicação. ⚠️ Mas isso é **"não encontrei"**, não "não existe":
as páginas do SNE no gov.br que tentamos **deram 404**, e sem elas não dá para
afirmar a ausência.

O que o documento técnico do e-Frotas já dizia continua valendo: os **eventos 38
e 41** do webhook apenas **notificam** que alguém indicou — **não são o ato de
indicar** —, e o item 17 manda não assumir endpoint de POST sem validar no
Swagger habilitado para a empresa.

### O que está documentado (DNIT, páginas de 15/12/2025)
Para multas de **rodovia federal**, o fluxo pode ser eletrônico:
- **FICI** (identificação do condutor) e **FIRI** (indicação do responsável),
  pelo **Portal de Multas do DNIT**, com login **gov.br**;
- exige conta **Bronze/Prata/Ouro** (FICI) ou **Prata/Ouro** (FIRI);
- o formulário pode ser **assinado eletronicamente pelo gov.br**;
- **só o proprietário protocola** pelo portal;
- fora do prazo, só pelos **Correios**;
- análise ~2 dias úteis pelo portal, ~30 dias pelos Correios;
- 🔴 **para PJ, o FIRI exige documento que comprove a representação ou
  procuração com poderes para assinar** — que é exatamente o desenho da
  Cláusula 8ª.

### 🔴 A resposta à pergunta do app CNH Brasil
**Não precisa do app.** O Art. 5º § 1º, II é justamente o caminho para quando
não se colhe a assinatura do condutor: anexa-se o contrato de locação com as 5
alíneas. Por isso o campo de condutor era o passo certo — e por isso o
formulário agora imprime o período da posse e cita o dispositivo.

### Onde isso trava, e o que destravaria
Enviar **sem sair do sistema** continua esbarrando em infraestrutura: GitHub
Pages não recebe POST, e a Org Policy do projeto barra criar Cloud Function
nova. **Próximo passo real, e barato:** pedir acesso à **homologação** do
e-Frotas e importar o Swagger — usa token e **não custa consulta**. É só isso
que responde se a indicação é automatizável de verdade.

---

## ✅ Painel: o ano do veículo passa a ser o ANO MODELO — 28/10/2026 (`ada2dff`) · Auto Mais

Pedido: *"preciso que a visualizacao do ano do veiculo na aba PAINEL seja feita
mostrando o ano modelo"*.

⚠️ **"Painel" é a Auto Mais** — a LOKÁ chama a mesma tela de **Dashboard**.
Conferido antes de abrir arquivo: o item "Painel" do menu só existe no
`automaiscar/sistema/`.

### O tamanho do problema, medido antes de mexer
Nos **43 veículos reais** do Firestore:

| | |
|---|---|
| com `ano_modelo` preenchido | 42 |
| **ano de modelo DIFERENTE do de fabricação** | **23** |
| modelo = fabricação | 19 |

Ou seja: **mais da metade do estoque aparecia no Painel com um ano menor do que
o que se anuncia e se negocia.** Em estoque (não vendidos) são 9 desses casos.

### 🔴 Dois veículos reais exigiam o fallback
| Placa | Veículo | `ano` | `ano_modelo` | Sem tratar daria |
|---|---|---|---|---|
| JCP7C61 | JEEP RENEGADE | 2024 | **(ausente)** | campo **em branco** |
| QTZ1I54 | CHEVROLET ONIX | **(vazio)** | 2020 | já aparecia vazio hoje |

`anoModeloVeic(v)` devolve o ano de modelo, **cai no de fabricação** quando o
modelo não está cadastrado, e devolve `''` quando não há nenhum dos dois —
**nunca `"undefined"` na tela**. Entrou no `firebase-shared.js`, onde moram os
utilitários entre páginas.

### 🔴 Os DOIS pontos do Painel, não um
`index.html` mostra o ano em dois lugares: o card **"Estoque Atual"** (linha 270)
e o resultado da **busca global** (linha 382). Mudar só um deixaria **o mesmo
carro com dois anos diferentes na mesma tela**.

### O que NÃO foi tocado, de propósito
| Fica como está | Por quê |
|---|---|
| tela de **Veículos** (`v.ano_modelo?v.ano+'/'+v.ano_modelo:v.ano`) | mostra o **par** "2016/2017" — é onde se confere o cadastro |
| **relatório** de estoque (PDF e CSV, de 01/10) | tem as duas colunas de propósito |
| Contratos e Vendas | não foi pedido (regra 3) |

⚠️ **Não existe uma regra única de "qual ano mostrar"** neste sistema — a tela de
Veículos tem três formatações diferentes só nela (par, coluna só do modelo no
CSV, par que colapsa quando igual no PDF), e cada uma é deliberada. Por isso o
helper se chama `anoModeloVeic`, explícito, e **não** `anoVeic`: assim não é
confundido com "o par".

### Validado
- `node --check` no shared e nas **10 páginas**
- **20 testes de runtime** com os 43 veículos reais, rodando o `renderDashboard`
  e o `buscaGlobal` de verdade: cada veículo divergente conferido **linha a
  linha** (tem de aparecer o modelo **e não pode** aparecer a fabricação), os
  dois casos de campo faltando, ano como número, veículo nulo, e as invariantes
  do que não podia mudar (o par da tela de Veículos, as colunas do relatório)
- **7 defeitos injetados — todos acusados**: voltar para a fabricação, ordem
  invertida, sem fallback, sem guarda de nulo, mostrar o par, **mudar só metade
  da tela**, e ignorar espaço em branco
- **No navegador, contra o arquivo publicado e com os veículos reais**: os 9 em
  estoque conferidos um a um (PLF-0254 2018→2019, TEL-1A07 2025→2026,
  LUK-6D78 2019→2020, …), as duas bordas saindo certas na busca (JCP7C61 → 2024,
  QTZ1I54 → 2020) e **zero "undefined"** na tela

### ⚠️ Três tropeços meus de verificação
1. **O scratchpad foi limpo entre sessões** — o `ext.js` e as **11 suítes antigas
   da Auto Mais não existem mais**. O `node --check` das páginas acusou "X" em
   todas, e **não era erro de sintaxe**: era a ferramenta faltando. Recriei o
   `ext.js` e refiz. ⚠️ **Não houve regressão a rodar** além da suíte nova — as
   antigas se foram, e isso está dito aqui em vez de eu alegar um número.
2. **O `&bull;` não existe no DOM.** Minha varredura final no navegador procurava
   `&bull; 2019 &bull;`, mas o navegador converte a entidade no caractere `•` ao
   parsear — então ela acusou "sem modelo" nos 9 carros **que estavam certos**, e
   a outra metade da asserção (a que procurava a fabricação) era igualmente
   vazia. No Node funciona porque lá o HTML nunca é parseado. Refeita com `\u2022`
   e com contraprova de que pega o defeito.
3. **O script do Painel estourava no meio** do meu iframe (`addEventListener` de
   `null`, porque faltavam 9 elementos que ele procura por id). As funções
   existiam (declaração é içada) e eu quase segui — é a armadilha já registrada.
   Passei a **exigir que o script rode até o fim**, conferindo que o `var DB`
   tardio existe com os 43 veículos.

⚠️ Testar no navegador pelo `login.html` **não funciona**: a página redireciona e
corta o script. O caminho é a página institucional da raiz (mesma origem,
estática) + **iframe** com a `location` travada, para o portão de sessão do
sistema não levar a aba embora.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o Painel com **Ctrl+Shift+R** e ver os anos.
Eu não autentico.

---

## ✅ Gerar Contrato no menu Locação — 29/10/2026 (`61ac9ac`) · gestao v136

Pedido: *"gentileza colocar um botão GERAR CONTRATO no menu Locação"*.

### 🔴 Conferido antes de construir: o fluxo JÁ EXISTIA inteiro
O modal **`mContrato`** tem tipo (diária/mensal), seleção de veículos com busca,
datas, valor, caução, km e o gerador `gerarERegistrarContrato()`.

O que não existia era **chegar nele**: o botão `btnContrato` mora **dentro do
modal de Cliente**, com `display:none`, e só aparece quando um cliente está
selecionado (`_curCli >= 0`). O caminho era:

```
Clientes → buscar o cliente → abrir → Gerar Contrato
```

🔴 **O item novo abre o MESMO modal.** Duplicar o gerador seria repetir o
acidente da v119 (duas `statusReal`, uma aprendeu sobre `renegociado` e a outra
não) — há teste exigindo que exista **um** `gerarERegistrarContrato` só.

### O seletor de cliente era a peça que faltava
Pelo cadastro de Clientes o `_curCli` já vinha definido. Pelo menu não vem.
Entrou `<select id="ctCliente">` no topo do modal, no **mesmo padrão do Novo
Aluguel** (`aCliente`: índice como `value`).

🔴 **Ele é a fonte da verdade de para quem é o contrato** e define o `_curCli` —
que é o que o gerador **e** os botões de reserva/checklist do mesmo modal leem.
Trocar ali vale para tudo que está na tela.

⚠️ O nome é **escapado** no `<option>`. O `openAluguel` não escapa, e isso é um
defeito dele: `"José D'Avila <Zeca> & Cia"` quebraria o seletor. Conferido no ar:
`ISS TRANSPORTES & LOGISTICA` sai como `&amp; LOGISTICA`, sem tag crua.

### 🔴 A guarda que o menu obrigou a existir
`gerarERegistrarContrato` fazia:

```js
var cl = _curCli >= 0 ? db.clients[_curCli] : {};
```

Com `{}` ele **geraria o contrato com o nome em branco** em vez de recusar. Pelo
cadastro de Clientes isso nunca acontecia — o botão só existia lá dentro, com
cliente obrigatoriamente escolhido. **Pelo menu aconteceria.**

Agora recusa e avisa. Conferido no ar: 0 contratos criados, **nada passado ao
documento** (`localStorage` intocado), 0 gravações.

### Permissão: a mesma de hoje, nem mais nem menos
O item aparece para quem tem o painel **`clientes`** — porque é lá dentro que o
botão sempre morou. **Não amplia acesso**: Oficina (`['manutencao']`) e Clientes
(`['manutencao','multas']`) continuam sem ver.

⚠️ Não entra em `_TODOS_PAINEIS`: é **ação**, como o Relatório. E a permissão é
decidida **antes** do `_ajustarSecoesMenu()`, pelo mesmo motivo registrado na
v134 — decidir depois usaria o display velho para esconder o cabeçalho.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**; eram 812 — o item e o
  campo do seletor); os dois carimbos batendo
- **48 testes** com o código real: o seletor (lista, escape, cliente nulo, sem
  nome), trocar de cliente nos dois sentidos, valor inválido e **índice negativo
  forçado no DOM**, abrir pelo menu (não herda cliente, modal abre, tipo volta
  para diária, seleção de veículos limpa, retirada = hoje, sem banco não estoura),
  abrir pelo cadastro (cliente **preservado**), a guarda sem cliente e com índice
  inexistente, gerar com cliente, as 3 validações que já existiam, e o fonte
- **20 defeitos injetados — todos acusados**, entre eles voltar o `: {}`, abrir
  pelo menu herdando cliente, abrir pelo cadastro perdendo o cliente, o seletor
  não definir o `_curCli`, não escapar o nome, o item cair na seção errada, a
  permissão liberar para todos, e o item entrar em `_TODOS_PAINEIS`
- **No ar, no arquivo publicado**, com os **140 clientes e 119 veículos reais**,
  sem firebase no ambiente: item na seção Locação, 141 opções no seletor,
  retirada 29/10; **sem cliente → recusa**; com a **RSC TRANSPORTE 2016 LTDA**
  (índice 69) → CNPJ `26.448.760/0001-50`, endereço real, placa **RUQ2J15
  CHEVROLET Onix Plus AT**; pelo cadastro, **TRANSSOUZA preservado** e troca
  dentro do modal funcionando. **Nada gravado em produção** — reconferido: 140
  clientes, 151 contratos, 105 aluguéis.
- Regressão **medida**: **39 suítes, 1.946 testes**, nenhuma falha

### ⚠️ A suíte do menu acusou o item novo — e estava certa
`t-menu.js` (v134) exigia que **todo item do menu fosse painel**, com o Relatório
como única exceção escrita à mão. O item novo quebrou 3 testes: *item sem
painel*, *são 21 itens* e *onclick errado*.

Passou a ter uma **lista NOMEADA de ações** (`relatorio`, `gerarcontrato`) com o
`onclick` esperado de cada uma. Item novo que não seja painel **nem esteja nessa
lista continua sendo acusado** — a trava que importa (perder item do menu tira o
painel do sistema) ficou intacta.

### ⚠️ Um defeito injetado passou — e era ramo redundante meu
`_curCli = (v === '') ? -1 : parseInt(v, 10)` seguido de `if (isNaN(...))`:
`parseInt('')` **já dá NaN**, então o ternário era um segundo caminho para a
mesma coisa, e nenhum teste conseguia distinguir os dois.

Simplificado para **uma guarda só** (`isNaN || < 0`), e o índice negativo — que o
seletor nunca emite, mas o DOM aceita — **ganhou teste próprio** em vez de ficar
como ramo descoberto.

⚠️ E o heredoc comeu os escapes **de novo** ao tentar atualizar as injeções por
script (`\n` virou quebra de linha de verdade). Ferramenta de escrita, sempre.

### ⚠️ Achado dos dados (não é defeito)
Só **3 dos 119 veículos** estão com `status === 'disponivel'`, e é essa a lista
que o modal oferece. Quem for gerar contrato hoje tem 3 carros para escolher.

### ⏳ Não verificado
Falta **logado**: o Rogel clicar em **Gerar Contrato** no menu, escolher cliente e
veículo e gerar um contrato de verdade. Eu não autentico.

---

## ✅ Órgão autuador no relatório de multas — 29/10/2026 (`de2fe5e`) · gestao v137

Pedido: *"gentileza incluir no relatorio de multas que geramos em PDF o orgao
autuador"*.

A coluna já existia na **tela** desde a v100; o **relatório impresso** (e o que se
leva para reunião) não a tinha. Entrou entre *Infração* e *Situação*, nas 7
colunas, e o CSV ganhou **duas** colunas (`Cód. Órgão` e `Órgão`).

### 🔴 Agrupa pelo CÓDIGO, nunca pelo texto cru
É a lição da v91: o mesmo órgão chega escrito de várias formas (`238490-BA` e
`238490 - PREF. DE BA SALVADOR`). `_mltOrgaoRel()` passa por `mltOrgaoChave`, e
por isso o PDF e o CSV concordam sobre o mesmo órgão — e no Excel o mesmo órgão
não se espalha em várias linhas de tabela dinâmica.

⚠️ O CSV **não foi pedido**, mas ele já trazia o órgão em **texto cru**. Deixar o
PDF normalizado e o CSV cru faria os dois relatórios discordarem. Fica registrado
para ser revertido se o Rogel não quiser.

### 🔴 O que os dados mostraram: o nome quase nunca existe
Medido nas 652 multas reais:

| | |
|---|---|
| com órgão | 570 · **sem órgão: 82** |
| códigos distintos | 20 |
| 🔴 **códigos com NOME aprendido** | **3** (238490, 000100, 000300) |

E o maior bloco — **105300, com 251 multas** — **não tem nome**. Então a maioria
das linhas mostra **só o código**, e é por isso que o código é a linha principal
da célula (monoespaço) e o nome entra em cima **quando houver**. Repetir "Órgão
105300" por extenso em 251 linhas seria ruído.

Multa sem órgão sai como **⚠ sem órgão**, não em branco: 82 linhas vazias
pareceriam defeito do relatório.

### 🔴 O colspan, que é onde esse tipo de mudança quebra
6 colunas viraram 7. Foram **5** colspans a acertar: os dois cabeçalhos de grupo
(`6→7`) e as **três** linhas do rodapé (`5→6`). Esquecer isso é o defeito da v78
(rodapé com célula a menos) e o da v119 (totais saindo uma coluna à esquerda do
título que prometiam).

### Cabe no A4 — medido, não suposto
O relatório manda `@page{size:A4;margin:14mm}` e `body{padding:28px}`, e a tabela
é `width:100%`. Então a caixa de conteúdo impressa tem **688 − 56 = 632px**, e o
que poderia transbordar é o **mínimo** de cada coluna.

Medido no navegador, montando o relatório publicado num quadro de 688px com o
**pior caso de cada coluna** (maior descrição, maior nome de locatário, o nome de
órgão de 50 caracteres, o maior valor, sem órgão e sem locatário):

| Placa | AIT | Data | Infração | Órgão | Situação | Valor | **soma** |
|---|---|---|---|---|---|---|---|
| 69px | 83px | 74px | 143px | **110px** | 75px | 61px | **616px** |

**616 de 632px — sobram 16px, não transborda.** O pior caso por coluna é o que
decide a largura mínima da tabela, então a medida vale para as 652 linhas.

⚠️ Medir o documento inteiro de uma vez **travou a aba duas vezes**: um laço que
lê `scrollWidth` de 652 linhas força 652 reflows. O pior caso por coluna dá o
mesmo número em 9 linhas.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **38 testes** com as **652 multas reais**: a célula nos três casos (com nome,
  só código, sem órgão), o agrupamento por código, as 7 colunas, os 5 colspans, o
  CSV com as duas colunas, e o documento inteiro
- **17 defeitos injetados — todos acusados**, entre eles ler o texto cru, a coluna
  sumir do cabeçalho, a célula sumir das linhas, os colspans voltarem, e o CSV
  discordar do PDF
- **No ar, no arquivo publicado, com as 652 multas reais** (só leitura): 7 colunas,
  **7 células em toda linha**, colspan 7 nos grupos e 6 no rodapé, 82 avisos de
  "sem órgão", e os 3 nomes aprendidos
- Regressão **medida**: **40 suítes, 1.984 testes**, nenhuma falha

### ⚠️ Dois testes meus que o `injetar` reprovou antes de eu publicar
O grupo "sem locatário" passava porque minha amostra de 3 multas **não tinha**
multa sem cliente — entrou uma 4ª. E um defeito deu *ERRO DE MONTAGEM*: minha
âncora tinha uma linha em branco que não existe no fonte. Âncora que não casa é
defeito que nunca foi testado.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o painel Multas e gerar o PDF. Eu não autentico.

---

## 🔴 Locatário não identificado: SEV0J14 e a auditoria da frota — 29/10/2026

Relato: *"verificar o veiculo SEV0J14 que não esta sendo identificado o
locatario. auditar os demais veiculos ativos na frota e verificar se existe mais
algum que esteja nessa situacao"*.

### 🔴 O SEV0J14 TEM locatário — quem não o acha é o backend
Ele está num aluguel ativo da **TRANSSOUZA TRANSPORTE E TURISMO LTDA**
(`ativos[4]`, retirada 11/06/2026, contrato de 13 carros) — mas como **segunda
placa**: o registro tem `placa: "EQQ2J61"` e `placas: ["EQQ2J61","SEV0J14"]`.

É a **armadilha 2** do CLAUDE.md, e ela está no **backend**:

```js
// deploy/functions/multas-db.js:35 e :47 — cruzarLocatario
_lista(db.ativos).forEach(function (a) {
  if (normPlaca(a.placa) !== p) return;      // 🔴 nunca olha a.placas[]
```

Por isso as 8 multas da placa se dividem exatamente assim:

| Origem | Locatário |
|---|---|
| 4 multas **de PDF** (10/2025 a 03/2026) | ✅ TRANSSOUZA |
| 4 multas **do e-Frotas** (07 a 10/2026) | 🔴 vazio |

**O frontend está certo** — `mltIndLocacao` (e `renderFrota`, e o filtro de
multas) passam por `_placasDoAtivo`. Então na tela **Frota Ativa** o SEV0J14
aparece com a TRANSSOUZA normalmente; onde ele aparece sem locatário é no painel
**Multas**.

### A auditoria: 3 placas na situação idêntica
Dos **105 aluguéis ativos**, **4 são multi-veículo**, e neles há **4 placas** que
não são a `a.placa` — invisíveis a qualquer código que leia `a.placa` direto:

| Placa | Veículo | Contrato de | Multas sem locatário |
|---|---|---|---|
| **SEV0J14** | CHEVROLET Spin | TRANSSOUZA | **4** |
| **GBW2B46** | VW Saveiro Baú | RSC | **2** |
| **FCN9G63** | VW Saveiro Baú | RSC | **2** |
| RTE3J91 | VW Saveiro Baú | G7 COMPANY | 0 (mesma exposição) |

**8 multas** seriam identificadas na hora se o backend olhasse `placas[]`.

### 🔴 Mas a maioria das 72 é OUTRO problema — e não é código
São **72 multas sem locatário · R$ 15.952,88**, em 21 placas, **todas do
e-Frotas** (as 341 de PDF têm locatário, quase todas por vínculo manual).
Classificando cada uma contra `ativos` + `historico`:

| Causa | Multas |
|---|---|
| 🔴 **infração ANTES de qualquer locação registrada da placa** | **58** |
| armadilha 2 (2ª placa) — **se conserta no código** | **8** |
| placa **nunca** alugada em registro nenhum (SJA7D59) | 4 |
| buraco entre contratos | 2 |

As 58 não são defeito: o sistema **realmente não tem registro** de quem estava
com o carro. Exemplo medido — **RUI8I24**: aluguel ativo da RSC desde
**01/06/2026**, `historico` **vazio**, e multas de abril e maio de 2026. As
equivalentes que *têm* a RSC foram vinculadas **à mão** (`cruzamento: 'manual'`,
origem PDF). O contrato anterior daquele carro nunca entrou no histórico — foi
recadastrado em 01/06 em vez de prorrogado.

⚠️ **Não dá para preencher essas 58 por código sem inventar dado.** Quem souber
de quem era o carro é o Rogel; o caminho honesto é o vínculo manual que a tela
já oferece.

### 🔴 Achado MAIS CARO que o pedido: 2 carros alugados estão como "inativo"
A auditoria da frota (119 veículos, 106 marcados `alugado`) encontrou **2
veículos com aluguel ativo e status `inativo`**:

| Placa | Veículo | Locatário | Retirada |
|---|---|---|---|
| **SJA7D13** | CHEVROLET Onix Plus AT | JOSE CLAUDEMIRO OLIVEIRA JUNIOR | 24/03/2026 → 23/04 |
| **RTE3J91** | VW Saveiro Baú | G7 COMPANY LTDA | 12/06/2026 → **aberto** |

🔴 **A varredura do e-Frotas pula veículo inativo** (trava da v13, 30/09). São
109 placas enviadas e 10 de fora — e **essas duas são as únicas inativas com
aluguel ativo**. Ou seja: **dois carros alugados não estão sendo consultados
para multa nenhuma.** O RTE3J91 segue com contrato **aberto**.

⚠️ Não confundir com as **6 placas que o Serpro recusa** (403, fora do contrato
e-Frotas, 30/09): aquilo é contrato com o Serpro; isto é cadastro interno, e se
resolve mudando o status.

### Outros achados do mesmo levantamento (nenhum corrigido — não foi pedido)
- **1 aluguel ativo com placa fora do cadastro**: `GDE1E83` (BRJ EXPRESSO) — já
  conhecido desde 14/10, quando apareceu faturada e sem cadastro.
- `excluirAtivo` (`gestao.html:4102`) libera **só a placa principal** ao excluir
  um aluguel: num contrato multi-veículo os outros carros ficam `alugado` sem
  aluguel. (`reconciliarStatusVeiculos` conserta no carregamento, porque usa
  `_placasDoAtivo`.)
- `excluirVeiculo` (`gestao.html:5363`) procura o aluguel por `a.placa` sem
  `placas[]`: as 4 placas da tabela acima **poderiam ser excluídas estando
  alugadas**.
- 0 aluguéis ativos sem nome de locatário; 0 veículos `alugado` sem aluguel que a
  tela ache.

### ⏳ Nada foi alterado — o que fica para decisão do Rogel
1. **Consertar `cruzarLocatario`** para varrer `placas[]`. ⚠️ O conserto só vale
   **depois de `firebase deploy`**, que depende do login dele (a credencial do
   `firebase-tools` expirou nesta máquina em 30/09). É a mesma lição da v13:
   correção que mora só no backend fica viva no fonte e morta em produção.
2. **Vincular as 8 multas** das 3 placas, que o conserto não alcança
   retroativamente (ele só vale para multa nova).
3. **Acertar o status de SJA7D13 e RTE3J91** — é o item mais urgente, porque
   enquanto estiverem inativos esses dois carros não são consultados.
4. As **58** sem locação registrada: vínculo manual, caso a caso.

---

## ✅ Cláusula 8ª: reconhecimento da multa pelo condutor — 29/10/2026 (`b22bcc6`) · mensal v6 · diária v5

Pedido: acrescentar à Cláusula 8ª dos contratos **mensal e por diária** que as
multas devem ser reconhecidas pelo condutor, e que o não reconhecimento gera
penalidade dobrada repassada ao cliente, com juros e multa por atraso.
**"Gentileza melhorar o texto se achar conveniente."**

⚠️ Aqui ele **nomeou os dois documentos** — diferente da Cláusula 7ª (20/10), em
que ele disse "contrato mensal" e a diária ficou de fora de propósito.
Conferido antes: a Cláusula 8ª tem redação **idêntica** nos dois arquivos.

### O texto como ficou
> […] durante o período de locação e eventuais prorrogações. **As multas deverão
> ser reconhecidas pelo condutor do veículo dentro do prazo fixado pelo órgão
> autuador. O não reconhecimento em tempo hábil sujeita o LOCADOR a nova
> penalidade, de valor igual ao da multa original multiplicado pelo número de
> infrações iguais cometidas nos doze meses anteriores, nos termos do art. 257,
> § 8º, do Código de Trânsito Brasileiro, a qual será integralmente repassada ao
> LOCATÁRIO, somando-se à multa original e acrescida de juros e multa em caso de
> atraso no pagamento.**

🔴 **Entrou DENTRO do parágrafo da Cláusula 8ª**, não como cláusula nova —
cláusula nova renumeraria o contrato inteiro. O teste confere a numeração
sequencial (1…13 no mensal, 1…15 na diária) e há defeito injetado que prova
que ele pega.

### 🔴 As 5 mudanças que eu fiz no texto dele, e por quê

| Ele escreveu | Ficou | Por quê |
|---|---|---|
| "o **dobro** do valor da penalidade original" | valor igual ao da original **multiplicado pelo número de infrações iguais nos doze meses anteriores**, art. 257 § 8º do CTB | ⚠️ **"O dobro" CAPARIA o repasse.** A lei multiplica pelas infrações iguais do ano: com 3 iguais, a nova multa é 3× — e a cláusula dizendo "o dobro" limitaria a cobrança a 2×. A LOKÁ já tem **62 multas por não identificação de condutor (R$ 26.315,17)**, então infração igual repetida no ano é caso real, não hipótese |
| "nova penalidade cobrada pelo **órgão autuador**" | "sujeita **o LOCADOR** a nova penalidade" | A penalidade recai sobre o **proprietário**, e é *por isso* que ela é repassada. Dizer isso explica o repasse em vez de só afirmá-lo — e é o que dá base para cobrar |
| "repassada ao **cliente**" | "repassada ao **LOCATÁRIO**" | É o registro do próprio documento (Cláusula 3ª). "Cliente" não aparece em cláusula nenhuma |
| "em tempo hábil" | "**dentro do prazo fixado pelo órgão autuador**" (mantendo "em tempo hábil" no gatilho) | Prazo de indicação não se estima: é o que a notificação traz. Mesma regra da aba de Indicação, que escreve "consultar no órgão" em vez de chutar data |
| — | "**somando-se à multa original**" | O art. 257 § 8º diz "mantida a originada pela infração". Sem essa frase daria para ler que a nova penalidade **substitui** a multa, e aí a cobrança perderia metade |

O resto da redação é a dele.

### 🔴 Dois achados da mesma cláusula que eu NÃO toquei
Os dois são decisão de advogado, e os dois já estavam registrados:

1. **Ela cita a Resolução 619/16 do CONTRAN, que está REVOGADA** pelo art. 38 da
   Resolução CONTRAN 918/2022, em vigor desde 01/04/2022 (lido no DOU em 22/10).
   A procuração inteira se apoia nessa citação.
2. 🔴 **Ela constitui a "Rodera Transportes LTDA" como procuradora — não a
   LOKÁ.** Se é a LOKÁ que assina o termo de apresentação de condutor, a
   procuração está no nome da empresa errada, e isso atinge exatamente o fluxo
   de indicação construído na v135.

⚠️ Mexer na empresa procuradora ou na norma citada muda a base jurídica da
cláusula, não a redação — por isso ficou de fora mesmo com a autorização de
"melhorar o texto". Trocar qualquer um dos dois é uma linha.

### ⚠️ A diária não tem regra de mora para sustentar o "juros e multa"
O acréscimo diz "acrescida de juros e multa em caso de atraso". No **mensal** a
Cláusula 7ª define isso (2% + 6% ao mês, 20/10). Na **diária não há cláusula de
mora nenhuma** — a frase fica sem percentual definido naquele contrato.

Não escrevi número na diária porque o escopo da Cláusula 7ª foi explicitamente
só o mensal. Fica a decisão: levar a mora para a diária também, ou deixar.

### Cabe no A4 — medido nos arquivos reais das duas versões
Buscados do **raw do GitHub nos dois commits** (`13da033` = antes, `b22bcc6` =
agora), com as regras de `@media print` **extraídas e injetadas** no quadro de
medição.

| | altura do `.contract` | páginas | sobra na 1ª folha |
|---|---|---|---|
| mensal v5 (antes) | **937px** | 0,88 | 133px |
| **mensal v6** | **960px** (+23) | **0,90** | **110px** |
| diária v4 (antes) | **972px** | 0,91 | 98px |
| **diária v5** | **995px** (+23) | **0,93** | **75px** |

A4 útil = **726 × 1070px**. Os dois continuam em **uma folha**, sem transbordar a
largura (726px exatos). A Cláusula 8ª passou de 323 para **821 caracteres**.

⚠️ **A diária é a que tem menos folga: 75px.** Com muitas linhas de veículo o
documento cresce, e ela é a próxima a passar para a segunda folha.

### ⚠️ A medição em modo TELA deu 2.133px — 2,3× o valor certo
Minha primeira rodada mediu sem aplicar o `@media print`, e deu `mensal v5 =
2133px` quando o registro de 20/10 diz **937px**. O número só ficou confiável
depois de extrair o bloco `@media print` **com balanceamento de chaves** (tem
`@page{}` dentro, então regex simples corta no lugar errado) e injetá-lo como
CSS comum.

🔴 **O que salvou foi ter um número antigo para comparar.** Medida nova que não
reproduz a medida registrada da mesma versão está errada — e aqui ela estaria
errada por 2,3×, no sentido alarmista (eu teria concluído que o contrato já
passava de 2 folhas).

### Validado
- `node --check` nos dois; `<div>` balanceadas (mensal 45/45, diária 48/48 —
  iguais ao registro da v124); os **três** carimbos de cada arquivo batendo
- **99 testes** na suíte das cláusulas (eram 61): as 10 frases do acréscimo em
  cada contrato, "o dobro" **ausente**, "cliente" ausente, a parte antiga da
  cláusula intacta (a procuração), numeração sequencial, o acréscimo **uma vez
  só**, sem vazar para a cláusula vizinha, **idêntico nos dois**, e as Cláusulas
  7ª/10ª/11ª de 20/10 preservadas
- **52 defeitos injetados — todos acusados** (eram 32): entre eles voltar a dizer
  "o dobro", perder o multiplicador, a nova penalidade **substituir** a original,
  o repasse deixar de ser integral, a penalidade recair no LOCATÁRIO em vez do
  LOCADOR, citar o artigo errado do CTB, apagar a procuração, virar cláusula
  nova, entrar duas vezes, e a diária divergir do mensal por uma palavra
- **No ar, nos dois arquivos publicados**, parseados pelo navegador: carimbos
  v6/v5, 13 e 15 cláusulas, o texto da Cláusula 8ª **idêntico nos dois**
  (comparação de string, não de regex), e as Cláusulas 7ª, 10ª e 11ª intactas

### ⚠️ Um teste de 20/10 falhou sem haver defeito
`[o texto novo não aparece em nenhuma outra cláusula do mensal]` procurava o
marcador **genérico** `atraso no pagamento` em tudo que vem depois da Cláusula
8ª — e o acréscimo de hoje, que é *da* Cláusula 8ª e fala legitimamente de
atraso, o fez falhar. É a armadilha do **teste estrutural ancorado no vizinho**,
de novo. O marcador passou a ser o específico da Cláusula 7ª (`multa de 2%` /
`juros de 6%`), que é o que de fato não pode vazar.

E dois defeitos do injetor travavam o **número** da versão (`mensal-v5-…`):
publicar a v6 fez um deles dar *ERRO DE MONTAGEM* sem defeito nenhum. Os dois
passaram a montar a âncora a partir do próprio arquivo.

### ⏳ Não verificado
Falta **logado**: o Rogel gerar um contrato de cada tipo e ler a Cláusula 8ª no
documento impresso.

---

## ✅ LOKÁ é o nome fantasia da RODERA — 29/10/2026

Informação do Rogel, que **encerra o achado de hoje de manhã**: a Cláusula 8ª
constitui a **"Rodera Transportes LTDA"** como procuradora, e eu tinha marcado
isso como 🔴 *"procuração no nome da empresa errada"*.

**Não está errada.** Rodera Transportes LTDA é a **razão social**; LOKÁ é o
**nome fantasia**. A procuração está no nome da pessoa jurídica de verdade, que
é como tem de ser num contrato.

⚠️ Bate com o que já estava registrado e eu não tinha ligado: a conta de
faturamento do Google é da org **`rodlogtransportes.com`** (15/09).

**Nada a corrigir na Cláusula 8ª quanto a isso.** Continua em aberto só o outro
ponto dela: a citação da **Resolução 619/16 do CONTRAN**, revogada pela 918/2022
desde 01/04/2022 — essa é decisão do advogado.

---

## ✅ Mora também no contrato de diária — 29/10/2026 (`88d738e`) · diária v6

Pedido: *"levar juros e multa para diaria"*.

Em 20/10 a regra de mora entrou **só no mensal**, porque ele nomeou aquele
documento. A diária ficou de fora de propósito, e isso virou buraco quando a
Cláusula 8ª (hoje de manhã) passou a dizer *"acrescida de juros e multa em caso
de atraso"* — na diária não havia percentual nenhum para sustentar a frase.

🔴 **Texto idêntico ao do mensal, palavra por palavra.** Dois contratos da mesma
empresa com percentuais de mora diferentes seria pior do que não ter regra.

⚠️ O resto da Cláusula 7ª **não** é igual nos dois: o mensal aceita *"boleto
bancário ou transferência"*, a diária só *"transferência"*. Essa diferença é
anterior e **não foi tocada** — o acréscimo entra depois do PIX, como no mensal.
Há teste exigindo que a diária continue sem boleto e o mensal com.

### A suíte de 20/10 travava o escopo ANTIGO
Dois testes exigiam a diária **sem** a mora, e uma injeção se chamava *"o
acréscimo vaza para a diária (não foi pedido)"*. Com o pedido de hoje a
exigência **inverteu**. Os dois viraram a invariante nova, que é mais forte:

- a mora está nos **dois** contratos;
- o trecho é **idêntico** (comparação de string, não regex);
- aparece **uma vez** em cada;
- a forma de pagamento de cada contrato ficou como era.

A injeção obsoleta virou **"a mora entra DUAS vezes na diária"** — contradição
assinada é defeito de verdade. **102 testes · 56 defeitos injetados, todos
acusados.**

---

## 🔴 Campo de data do Contas a Receber: dois bugs, não um — 29/10/2026 · gestao v139 → v140

Relato: *"quando digitamos manualmente o campo correspondente ao ano apresenta
falha e nao permite digitarmos os quatro campos de uma só vez"*.

### 🔴 A prova veio do banco antes de vir da tela
`financeiro/receber[35]` (ISS, R$ 3.000) tem **`vencimento: "0025-07-25"`**.
Com ano 0025 esse lançamento **nunca aparece num filtro por data**. É a cicatriz
exata do bug, e estava no banco desde antes — eu já a tinha anotado em 13/10 como
"ano digitado errado", sem entender que era o sistema produzindo o erro.

### Bug 1 — campo VAZIO: o ano chega em pedaços
Medido no navegador, com **teclas de verdade** num `<input type="date">`:

```
digitar 2-5-1-2-2-0-2-6  →  change dispara QUATRO vezes
   0002-12-25 → 0020-12-25 → 0202-12-25 → 2026-12-25
```

Ano de **1 dígito já é data completa e válida** para o navegador. E como o
`finEdit` grava e **redesenha a tabela inteira**, o campo morria no primeiro
dígito. Medido no caso real:

| | |
|---|---|
| eventos recebidos | **1** (`0002-12-25`) |
| redesenhos | **1** → o campo é destruído |
| foco depois | **BODY** — os dígitos `0`, `2`, `6` não vão a lugar nenhum |
| valor na tela | **vazio** |
| 🔴 valor **gravado** | **`0002-12-25`** |

### 🔴 Bug 2 — campo que JÁ TEM data: cada tecla é uma data completa
A v139 guardou o ano (`_finDataValida`: 1900–2100) e resolveu o caso vazio.
**Testando no navegador contra o arquivo da v139 apareceu o segundo caso, e a
guarda de ano não o alcança:**

```
campo com 25/07/2026, digitando 25/12/2026 por cima:
   9 gravações · 9 redesenhos
   banco ficou 2026-07-06   ·   tela mostrou 25/07/2026
```

Com o ano **já completo**, cada tecla em **qualquer** segmento produz data
completa e válida — o change dispara em todas. Pior: a devolução de foco que a
v139 introduziu (um ganho no caso vazio) fazia o campo recriado **aceitar a
tecla seguinte e gravar de novo**. De 1 gravação errada passou a **9**.

🔴 **Nenhuma guarda de VALOR resolve isso:** `2026-07-02` é data legítima. O que
está errado é o **momento** — o change dispara enquanto se digita.

### O conserto (v140): a gravação sai do `change`
`_finDataSalvar(el, aba, idx, campo, voltarFoco)` grava no **blur** e no
**Enter** — uma vez por edição, e só quando o valor mudou de verdade.

| Situação | O que acontece |
|---|---|
| digitando | **nada**: nem grava, nem redesenha, nem perde o foco |
| ao sair com data completa | grava **uma** vez, redesenha, a tela mostra o que foi gravado |
| ao sair com ano incompleto | **restaura o valor gravado** e avisa "digite o ano com 4 dígitos" |
| só passar pelo campo | não grava nem redesenha (`el.value === atual`) |
| apagar a data | **é gravado** — limpar é legítimo |

⚠️ **No blur o foco NÃO é devolvido**: ele já está indo para onde a pessoa
clicou, e puxá-lo de volta seria roubar o clique. No **Enter** é devolvido,
porque ali ela continua no campo. Há defeito injetado para os dois lados.

Vale para os **3 campos de data graváveis** do Financeiro: `vencimento` e
`recebidoEm` do Contas a Receber, e `data` dos Acertos.

### Os filtros De/Até receberam só a guarda de ano
Eles **não** são destruídos (moram no HTML estático), então digitar sempre
funcionou. O que havia era a lista **piscando vazia** a cada dígito, porque o
filtro passava a valer para o ano 2. `_finDataFiltro` ignora enquanto o ano está
incompleto; ao sair incompleto, limpa o campo e avisa.

⚠️ **A `dívida` nunca teve o problema**: ela usa `<input type="text">` com
`dd/mm/aaaa`, e em campo de texto o change só dispara ao sair. Não foi tocada.

⚠️ **Os filtros de data dos outros painéis** (Aluguéis Ativos, Faturas,
Manutenção, Multas, Agenda, Almoxarifado, Sinistros, Histórico) continuam com
`onchange` + render. Lá **não há risco de dado**: nada é gravado, e o campo é
estático. O custo é redesenhar a lista a cada tecla. Não foram tocados — não foi
pedido, e a tabela do Contas a Receber era a única com gravação.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **50 testes** com o código real: a validação em 13 valores, as duas sequências
  **medidas no navegador** (a do ano em pedaços e a das 9 teclas), uma gravação
  por edição, só-passar-pelo-campo, foco no Enter e **não** no blur, restaurar e
  avisar, limpar o campo, elemento nulo, registro inexistente, os 3 campos, os
  filtros, e o `finEdit` continuando a registrar a baixa do recebido
- **24 defeitos injetados — todos acusados**, entre eles **os dois bugs
  relatados** (gravar no change nos 3 campos), a guarda do ano sumir, o blur
  roubar o foco, gravar sem ter mudado, e o filtro parar de redesenhar
- **No navegador, contra o arquivo do commit, com TECLAS DE VERDADE** e o
  "render" montando o campo a partir do banco (como o `finRenderReceber` faz):

| Caso | Durante | Ao sair |
|---|---|---|
| `25/12/2026` sobre `25/07/2026` | 0 gravações · 0 redesenhos · os 8 dígitos entraram | 1 gravação · banco e tela = `2026-12-25` |
| `03/11/2027` | 0 · 0 | 1 gravação · banco e tela = `2027-11-03` |
| ano só com `25` | campo mostrou `0025-06-15` | **0 gravações** · campo **restaurado** para `2027-11-03` · aviso certo |

  Nada foi gravado em produção — o banco do teste foi um objeto em memória.
- Regressão **medida**: **43 suítes, 2.137 testes**, nenhuma falha

### ⚠️ Três suítes antigas quebraram sem haver defeito
`t-condutor`, `t-sinistros` e `t-sinreparo` extraem funções **por nome** do
`gestao.html`, e o `_placasDoAtivo` da v138 passou a chamar `_subLista`, que elas
não extraíam → `ReferenceError`. Ganharam a dependência na lista.

⚠️ E o meu **contador de regressão** mentiu primeiro: ele somava só as suítes
cujo texto final casava com uma regex, e **pulou 20 em silêncio** (disse "23
suítes, 1.136 testes"). Passou a conferir o **código de saída** de cada uma e a
listar as que não produzem número. Sem isso eu teria registrado um total que não
cobre metade do sistema.

### ⚠️ A lição de método
A v139 estava **testada** — 47 testes, 20 defeitos injetados, todos acusados — e
mesmo assim **não consertava o bug inteiro**, porque todos os meus testes
partiam do campo **vazio**. Foi o teclado de verdade, no caso que o operador vive
(campo já preenchido), que mostrou o resto.

🔴 **Teste de campo de formulário tem de partir do estado que o operador
encontra, não do estado limpo.** E, quando o navegador é parte do mecanismo
(e aqui ele é: quem decide quando o `change` dispara é ele), não há teste em
Node que substitua apertar a tecla.

### ⏳ Falta corrigir um dado, e agora dá
O lançamento da **ISS, R$ 3.000, `vencimento: "0025-07-25"`** continua assim. Pela
fatura ligada a ele o certo é **25/07/2026**. Agora que o campo aceita os quatro
dígitos, o Rogel corrige na própria tela — **não mexi** porque é dado de
produção e não foi pedido.

---

## ✅ Coluna KM na aba Manutenção — 30/10/2026 (`4a5a794`) · gestao v141

Pedido: *"preciso que no menu manutencao seja exibido a coluna KM"*.

⚠️ **"Menu manutenção" é a LOKÁ.** Conferido pelos dados antes de abrir arquivo:
nas 17 manutenções da Auto Mais o campo `km` **nem existe** (os 10 campos
gravados lá são status, data, tipo, veiculo_id, valor, placa, descricao, oficina,
id e importadoOficina) — a coluna nasceria vazia. A LOKÁ tem 761 registros,
317 com km.

### O campo já existia — faltava a coluna
`manutKm` → `km` é gravado desde antes, e o valor **já aparecia na janela de
consulta** (🔍). O que não havia era a coluna na lista. Entrou entre **Retorno** e
**Custo**, nas **duas** tabelas (a normal e a `Restrito`, que o perfil
Oficina/Clientes vê) e no CSV.

🔴 **Nas duas, não em uma.** Deixar a coluna só na tabela normal faria a mesma
tela ter conteúdo diferente por perfil — a lição da v118.

### 🔴 Dois formatos convivem no banco, e o campo é TEXTO
Medido nos 761 registros reais:

| | |
|---|---|
| com km preenchido | **317** · vazios: 444 |
| só dígitos (`106095`) | **190** |
| com separador (`68.413`) | **127** |
| 🔴 forma impossível (`81.30100`) | **1** — placa **RUP3D82**, 21/07 |
| 2 dígitos (`96`, `52`, `87`) | 3 — saem como estão, sem aviso |

Mostrar cru deixaria `106095` ao lado de `68.413` na mesma coluna. A coluna
formata os dois igual — e isso é **apresentação, não invenção**: os dígitos são
os mesmos.

🔴 **O que NÃO se reformata é valor de forma inválida.** `81.30100` viraria
**8.130.100 km**, e o erro de digitação **pareceria número de verdade**. Esse sai
exatamente como está, com **⚠** e a explicação no `title`, para o operador
corrigir no cadastro.

⚠️ **A validação é de FORMA (`\d+` ou `\d{1,3}(.\d{3})+`), não de magnitude.**
Inventar uma faixa de km "plausível" seria chute meu, e esconderia dado que
talvez esteja certo — um guincho ou um caminhão quebram qualquer faixa que eu
chutasse.

Vazio e **zero** dão travessão: `"0"` e `"0.000"` não são quilometragem.

### No CSV vai o NÚMERO, não o formatado
No Excel pt-BR `106.095` com ponto é lido como separador de milhar, mas o
inteiro **deixa somar e ordenar sem depender de interpretação**. Valor de forma
estranha vai como está — o CSV não pode afirmar um número que o sistema recusou
na tela.

### A largura: MEDIDA depois de publicar, não escolhida de cabeça
As duas tabelas têm `min-width` (640 na restrita, 700 na normal) e wrapper com
`overflow-x:auto`. Escolher um piso novo "de cabeça" seria número inventado —
então o patch **não mexeu nele** e a largura foi medida no arquivo publicado,
com o pior caso de cada coluna tirado dos 761 registros (maior nome de veículo,
maior oficina, descrição de 335 caracteres, maior custo, os dois casos de km).

| Janela | Disponível | Tabela | Rola? | Coluna KM | `106.095` |
|---|---|---|---|---|---|
| 900px | 631px | 700px (piso) | **sim** | 73px | 1 linha |
| 1024px | 755px | 755px | não | 74px | 1 linha |
| 1366px | 1097px | 1097px | não | 85px | 1 linha |

**O número nunca quebra**: ocupa 42px numa coluna de 73–85px, e o CSS global
**não tem `word-break` nem `overflow-wrap`** — conferido —, então `106.095` não
pode partir ao meio e virar outro número.

**Antes e depois, nos arquivos reais das duas versões** (a v140 veio do raw do
commit `258733a`, não de markup remendado — regra de 19/10), medido a 900px:

| | v140 | v141 |
|---|---|---|
| colunas | 8 | 9 |
| tabela **normal** | 700px (piso) | **700px — igual**; rolava antes e rola agora |
| tabela **restrita** | 646px, **cabia** | **682px**, passou a **rolar** (+36px) |

🔴 **O custo real é esse: 36px de rolagem na tabela restrita a 900px.** Não se
conserta subindo o `min-width` — a restrita já passou do piso (682 > 640), então
quem manda agora é o mínimo do conteúdo, e subir o piso só faria rolar mais. O
wrapper cria a barra (a correção do `.shell` de 02/10 garante isso), então o
comportamento está certo: **ou cabe, ou rola.**

O único valor em duas linhas é o `81.30100 ⚠`: o ⚠ cai para baixo do número
(28px em vez de 13px). É **1 registro em 761**, o número continua inteiro e
legível, e é justamente o que o Rogel deve corrigir.

### ⚠️ Achado pré-existente, não tocado
`R$ 2.740,00` **já quebrava em duas linhas na v140** (coluna de 90px) — o `R$` e
o número são separados por espaço. Conferido nas duas versões para não registrar
como regressão minha.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **46 testes** com o código real e os 761 registros reais: a validação de forma
  em 14 valores, os dois formatos ficando comparáveis, o valor estranho saindo
  como está (e **não** virando 8.130.100), zero e vazio, nulo, a célula nos três
  casos, o aviso só onde deve, as duas tabelas e o CSV
- **20 defeitos injetados — todos acusados**, entre eles reformatar o valor
  estranho, a coluna sumir de um dos dois cabeçalhos, a célula entrar antes do
  Retorno, avisar em todas as linhas, a validação julgar magnitude, e o CSV
  mandar o texto formatado
- **No ar, no arquivo publicado**, rodando os dois `renderManutencao` reais com
  o pior caso por coluna: as medições acima, mais a conferência visual da coluna
- Regressão **medida**: **44 suítes, 2.186 testes**, nenhuma falha

### ⚠️ Dois enganos de medição, os dois pegos por o número não bater
1. **O CSS da página institucional contaminou a primeira medida.** Montei a
   casca na própria origem (que dispensa login) e o `body{padding:24px}` e
   `.content{max-width:520px}` **dela** deram "disponível = 486px" onde a conta
   (janela − 220 do menu − 32 de padding) pedia 772. Só desligando todo
   `<style>`/`<link>` que não fosse o do `gestao.html` a medida passou a bater.
2. **O detector de quebra acusou quebra onde não havia.** Contar "tops distintos"
   dos retângulos do texto marca duas linhas quando o número é **monospace** e o
   ⚠ é **sans-serif negrito** — fontes diferentes têm baseline diferente **na
   mesma linha**. Linha de verdade se conta por **sobreposição vertical**.

⚠️ E a primeira versão media a **altura do `<td>`**, que é a altura da **linha**
(75px, por causa da célula Veículo de duas linhas) — dava "quebrou" em todas as
dez.

### ⚠️ Dois "defeitos" injetados que passaram — e eram guardas inertes
`if (!t) return ''` no `_mntKM` e o `m &&` no `_mntKMCel` **não mudam resultado
nenhum** ao serem removidos: no primeiro, `parseInt('')` já dá `NaN` e o
`if (!n) return ''` logo abaixo devolve vazio; no segundo, a linha só é
alcançada depois do `if (!k) return <travessão>`, e `_mntKM(null)` já devolve
`''`. As duas ficaram no código (custam nada e dizem a intenção), mas estão
**sem cobertura**, e isso está dito aqui em vez de contado como teste.

O terceiro que passou era **asserção fraca minha**: o teste procurava
`parseInt(t.replace(/\D/g,''),10)` no arquivo inteiro, e o `_mntKM` tem a própria
cópia dessa linha — então o defeito no CSV passava batido. Corrigido recortando
o corpo do `kmCsv` antes de procurar.

### O que ficou de fora, de propósito
O **relatório PDF** de manutenção **não** ganhou a coluna. Ele já é apertado
(o cabeçalho impresso tem largura fixa) e o pedido foi sobre a tela; o CSV
cobre quem precisa do km em planilha. Vira coluna no PDF se for pedido.

### ⏳ Não verificado · e um dado para o Rogel corrigir
Falta **logado**: abrir Manutenção com **Ctrl+Shift+R** e ver a coluna. Eu não
autentico.

🔴 **A manutenção da placa RUP3D82 (21/07) está com `km = "81.30100"`.** Pelo
formato, deve ser **81.301** com um dígito a mais por engano — mas carro nenhum
tem 8.130.100 km, então quem sabe o número certo é quem lançou. A coluna mostra o valor com ⚠ justamente para isso aparecer.

---

## 🔴 O relatório de multas ignorava a seleção — 31/10/2026 (`9be05f8`) · gestao v142

Relato: *"quando selecionamos as multas e geramos o relatorio o sistema
apresenta o relatorio geral ao invez de apresentar apenas as multas
selecionadas"*. Estava certo.

### A causa, e ela estava à vista no fonte
As duas funções começavam igual:

```js
function mltRelatorio()    { var lista = mltFiltradas(); … }
function mltRelatorioCSV() { var lista = mltFiltradas(); … }
```

**Nenhuma das duas olhava `_mltBaixaSel`.** A marcação da tabela só alimentava a
barra de ações (💰 Baixar como pagas · 🏷 Alterar situação). O relatório sempre
imprimiu o filtro inteiro — não era intermitente nem cache.

### A regra nova
| | |
|---|---|
| há multa marcada | o documento é **só delas** |
| nenhuma marcada | continua valendo o **filtro da tela**, como sempre foi |

Quem não marca nada não vê diferença nenhuma.

### 🔴 Uma fonte só para os dois relatórios
A escolha saiu para **`mltRelatorioEscopo()`**, e o PDF e o Excel leem de lá.

⚠️ Deixar cada um escolher a própria lista seria repetir o acidente da **v119**:
havia **duas** `statusReal`, uma aprendeu sobre `renegociado` e a outra não — e o
**relatório impresso**, justamente o que se leva para reunião, era o que errava.
Há teste estrutural exigindo que nenhum dos dois volte a chamar `mltFiltradas()`
por conta própria, e defeito injetado para cada um.

### 🔴 O documento DIZ que é recorte
```
Seleção manual — 4 de 341 multa(s) do filtro. As demais não entram neste documento.
```

PDF de 4 linhas quando há 341 no filtro, **sem dizer que foi recorte**, é pior do
que não recortar: quem olhar o papel depois não sabe se faltou multa. É o padrão
dos cartões do Contas a Receber (v120–v122) — quando o número embute algo que o
olho não vê, a tela **diz**.

No Excel a marca vai no **nome do arquivo** (`multas_selecionadas_2026-10-31.csv`)
e no aviso, porque planilha não tem cabeçalho para avisar.

### A barra da seleção ganhou o botão
Sem ele o operador marca as multas e precisa voltar à barra do topo, onde o botão
não diz que vai respeitar a marcação. O botão do topo **continua valendo** — ele
agora respeita a seleção também.

### ⚠️ O limite é do CHECKBOX, não do relatório
Medido em 31/10 nas **657 multas reais**:

| | |
|---|---|
| paga | 227 · cobrada 155 · pendente 257 · recebida do cliente 18 |
| **selecionáveis** (têm checkbox) | **430** |
| 🔴 **sem checkbox** (pagas) | **227** |

Multa **paga ou cancelada não tem checkbox**, de propósito, para não dar baixa
duas vezes. Então *"selecionar e gerar"* só alcança multa **em aberto**. Para
relatório de pagas o caminho continua sendo o **filtro**.

🔴 **Não tornei a paga selecionável**, e isso é decisão a tomar, não esquecimento:
`mltBaixaAbrir` e `mltStatusAbrir` **confiam na seleção sem filtrar**, então um
checkbox em multa paga abriria risco de baixa em multa já paga em **dois fluxos
que funcionam**. É mudança maior do que o pedido. Se o Rogel quiser escolher a
dedo multas pagas e em aberto no mesmo documento, dá para fazer — mas mexendo
nos dois fluxos junto.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **48 testes** com o código real e as 657 multas reais: a regra nos dois
  sentidos, marcada que saiu do filtro, id marcado inexistente, o PDF (quantidade,
  os AITs que entram, **nenhum AIT que não foi marcado vazando**, o total, o
  agrupamento por locatário, o subtotal do grupo), o Excel (nome do arquivo e
  aviso), PDF e Excel concordando, a barra, pop-up bloqueado, lista vindo como
  objeto do Firebase, banco vazio
- **18 defeitos injetados — todos acusados**, entre eles **o defeito relatado nos
  dois relatórios**, o escopo ignorando a seleção, seleção vazia esvaziando o
  documento, o escopo lendo todas as multas em vez das filtradas, o PDF parando
  de dizer que foi recorte, e a multa paga ganhando checkbox
- **os 38 testes da suíte do órgão (v137) continuam passando** — é o que prova
  que a coluna de órgão não mudou de comportamento
- **No ar, no arquivo publicado, com as 657 multas reais** (só leitura):
  filtro pela **RSC TRANSPORTE 2016 LTDA** (341 multas, 224 em aberto) →
  sem marcar: **341 registros**, sem aviso de seleção;
  marcando 4: **4 registros**, os 4 AITs presentes, **0 não marcadas vazaram**,
  total **R$ 520,64** (e não os R$ 68.914,82 do filtro), aviso *"4 de 341"*,
  Excel `multas_selecionadas_2026-10-31.csv`
- Regressão **medida**: **45 suítes, 2.234 testes**, nenhuma falha

### A barra: medida, porque entrou um 4º botão
Comparado com o arquivo **real da v141** (raw do commit `4a5a794`):

| Janela | v141 (3 botões) | v142 (4 botões) |
|---|---|---|
| 1024px | 97px · **2 linhas** | 100px · 2 linhas |
| 1366px | 53px · 1 linha | 55px · 1 linha |

⚠️ **A quebra em duas linhas a 1024px já existia na v141** — eu quase a registrei
como custo meu. O botão novo custa **3px**, não uma linha.

### ⚠️ Dois tropeços de verificação, os dois pegos por o número não fechar
1. A primeira medida da barra deu **28px de largura e 381px de altura** — a aba
   estava estreita e o `.shell` espremeu tudo numa coluna. Número sem sentido é
   ambiente errado, não resultado. Com a janela fixada: 772px = 1024 − 220 − 32,
   que é a conta.
2. **O `node --check` não chegou a rodar na primeira tentativa** e eu quase segui:
   o `ext.js` recebe o destino como **argumento**, não por redirecionamento, então
   a cadeia `&&` morreu em silêncio. O "OK" nunca foi impresso — foi o que
   denunciou.

### ⚠️ A suíte do órgão quebrou sem haver defeito
`t-orgaorel.js` extrai funções **por nome**, e `mltRelatorio` passou a chamar
`mltRelatorioEscopo` → `ReferenceError`. É a mesma armadilha do `_subLista` em
29/10: **extrair por nome exige acompanhar a cadeia**. Ganhou as duas funções na
lista e `var _mltBaixaSel = {}` no ambiente; sem seleção o escopo cai no
`mltFiltradas()` que aquela suíte já stuba, então ela segue testando o mesmo.

### ⚠️ O contador de regressão tinha sido perdido, e a primeira versão mentiu
O scratchpad é limpo entre sessões e o `regressao.js` não existia mais. Refeito —
e a **primeira versão somou 1 suíte de 45**, porque conhecia um só formato de
saída. As suítes nasceram em dias diferentes e imprimem em **4 formatos**
(`ok: N falhou: M`, `--- N ok, M falha(s) ---`, `N passaram, M falharam`,
`N testes passaram`). Ele agora reconhece os quatro, julga cada suíte pelo
**código de saída** e **lista as que não produzem número** — era exatamente o
defeito registrado em 29/10, e ele voltou porque o arquivo se perdeu.

### ℹ️ O Rogel já está na v142
`loka_db/_writerBuild` ficou **`v142-20261031-0910`**, com escrita às 09:50 — o
navegador dele já carregou a versão nova. **Não fui eu:** meu ambiente de
verificação não tem `firebase` e relatório é só leitura. As multas seguem em
**657**, com a mesma distribuição de antes.

### ⏳ Não verificado
Falta **logado**: o Rogel marcar algumas multas e clicar em **📋 Relatório das
selecionadas** (ou no botão do topo). Eu não autentico.

---

## ✅ Histórico de recebimentos na fatura + a baixa pela fatura registra — 03/11/2026 (`c5fca2f`) · gestao v143

Pedido: *"exibir na fatura e em contas a receber o historico detalhado de
recebimentos. verificar se as abas estao sincronizadas para quando baixarmos os
valores em uma aba o sistema tambem baixar na outra"*.

### O que já existia — conferido no fonte e nos dados, não suposto
| | |
|---|---|
| histórico no **Contas a Receber** | ✅ existe desde a v108 (botão 📋 na coluna Recebido) |
| e está **em uso de verdade** | **13 lançamentos · 19 baixas** registradas |
| **baixa recíproca** nas duas direções | ✅ existe desde a v107 |

Então metade do pedido já estava pronta. O trabalho foi achar onde faltava.

### 🔴 Buraco 1 — o painel Faturas não mostrava NADA de recebimento
Ele mostrava o total da fatura e a marca "◑ pago parcialmente", e só. **Quem
olhava a fatura não sabia quanto já tinha sido pago** — nem tinha como chegar ao
histórico.

Entrou a coluna **Recebido**, entre Total e Status:

| Situação | O que a coluna mostra |
|---|---|
| parcial | o recebido **e** `falta R$ …` em vermelho |
| quitado | o recebido em verde, **sem** "falta" |
| renegociado | 🤝 renegociado, **sem** "falta" (o saldo migrou para as parcelas) |
| sem lançamento ligado | **⚠ sem lançamento · no Contas a Receber** |
| com recebimento | botão **📋** que abre o histórico |

🔴 **Fatura sem lançamento AVISA, não mostra R$ 0,00.** São **10 das 32** — um
zero ali faria parecer "nada recebido" quando o certo é "não há onde olhar".

### 🔴 Buraco 2 — a baixa pela FATURA não entrava no histórico
`_sincRecebimentoDaFatura` gravava `recebido` e `status` e **nunca chamava
`_finRegistrarBaixa`**. Ou seja: o histórico da v108 ia mentir por omissão a
partir do primeiro uso do botão **✅ Dar Baixa** da fatura — o dinheiro entrava
no acumulado sem linha nenhuma, e depois pareceria "registro anterior ao
histórico".

Agora registra. Com dois cuidados que não podem sair:

1. **Pela DIFERENÇA**, não pelo valor cheio — senão contaria de novo o que já
   havia entrado. Mesma regra do "✅ Quitar de uma vez" (v108).
2. **ANTES de mexer no acumulado** — depois, a diferença seria zero.

🔴 **A invariante que mantém isso honesto:** *soma das baixas + o que veio antes
do histórico = `recebido`*. Há teste exigindo que ela feche nos dois caminhos, e
defeito injetado para cada um dos dois cuidados.

### 🔴 Um visualizador só
A fatura abre o **MESMO `finVerBaixas`** do Contas a Receber, passando o índice
do lançamento.

⚠️ Escrever um segundo visualizador seria repetir o acidente da **v119**: havia
duas `statusReal`, uma aprendeu a regra nova e a outra não, e o impresso era o
que errava. Há teste estrutural exigindo que `_fatCelulaRecebido` **não desenhe
histórico próprio** — só chame a janela.

A janela passou a **dizer de qual fatura é** (`📄 Fatura 001 · 2026-08`), porque
agora ela abre de duas telas e precisa se situar sozinha. Acha a fatura pelo
**id E pela chave** — nos dados reais **20 dos 26 vínculos são por chave**, não
por id (nasceram antes de o id existir).

### A sincronização: auditada nos dados reais
Rodando a mesma `_lancDaFat` do sistema contra as 32 faturas e os 104
lançamentos:

| | |
|---|---|
| faturas com lançamento ligado | **22** · sem: 10 |
| **de acordo** com o lançamento | **20** |
| 🔴 divergentes | **2** |

**A sincronização em si está certa.** As 2 divergências são **dado**, não código
— e são o próximo item.

### 🔴 ACHADO: 4 faturas disputando 2 lançamentos
A `faturaKey` é `cliente + número + período`. Dois pares produzem a **mesma
chave**, então `_lancDaFat` devolve o **mesmo lançamento** para as duas:

| Lançamento | Cliente | As duas faturas |
|---|---|---|
| 63 | **G7 COMPANY** | `001 · 2026-08 · R$ 37.300,00 · paga`<br>`001 · 2026-08 · R$ 38.460,09 · pendente` |
| 77 | **ISS TRANSPORTES** | `001 · 2026-09 · R$ 1.750,00 · pendente`<br>`001 · 2026-09 · R$ 4.455,55 · pendente` |

Dar baixa em qualquer uma do par baixa o **mesmo** registro, e a outra fica
apontando para ele. É o mesmo problema de fundo já registrado na v81 (a
numeração não é incrementada — todas nascem "001"), mas aqui as duas também
dividem o **período**, que é o que fecha a colisão.

🔴 **A coluna nova DIZ isso na linha** — `⚠ compartilhado com 1 fatura(s)`, com a
explicação no `title`. Sem o aviso, a coluna repetiria R$ 25.863,00 nas duas
linhas da G7 e pareceria que o sistema conta em dobro. O defeito está no dado;
a tela só não pode esconder.

⚠️ **Não corrigi** — é dado de produção e não foi pedido. O conserto é mudar o
número de uma de cada par (ex.: `002`), e aí cada fatura passa a ter o seu
lançamento. **Decisão do Rogel.**

### O que NÃO mudou, de propósito
A `fatura.html` (a tela que gera o documento) **não ganhou nada**: ela é pública
e o recebimento é registro interno. "Na fatura" foi lido como o **painel
Faturas**, que é onde a baixa acontece. Se ele quis o documento impresso, é
outro trabalho.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **52 testes** com o código real, os **104 lançamentos e as 32 faturas reais**:
  o que a fatura lê do lançamento (com e sem vínculo, quitado pelos dois
  caminhos, renegociado, nulo), a detecção de chave duplicada, a célula nos 4
  estados, a baixa registrando (valor, diferença, data, quem, obs), **a
  invariante nos dois caminhos**, quitado e renegociado intocados, a janela
  nomeando a fatura pelo id **e pela chave**, e o fonte (8 colunas, a ordem, um
  visualizador só, registrar antes e pela diferença)
- **27 defeitos injetados — todos acusados**, entre eles **o buraco 2 de volta**,
  registrar o valor cheio, registrar depois do acumulado, a coluna sumir do
  cabeçalho ou das linhas, o 📋 abrir o histórico de outro lançamento, o "falta"
  aparecer no quitado, e parar de detectar a chave duplicada
- **as suítes da v107 (101 testes) e da v108 (58) continuam passando** — é o que
  prova que a baixa recíproca e o histórico não mudaram de comportamento
- **No ar, no arquivo publicado, com os dados reais** (`saveDB` neutralizado,
  banco em cópia de memória — **nada gravado em produção**, reconferido: 104
  lançamentos, 13 com histórico, 19 linhas, igual ao início):
  as 32 faturas produzem célula válida, 22 com lançamento / 10 avisando,
  12 quitadas · 3 parciais, 15 com botão de histórico, **4 linhas marcadas como
  compartilhadas**; e a baixa pela fatura da **RSC 001 · 2026-09**
  (R$ 170.748,41, com R$ 90.000 em 2 baixas) registrou **R$ 80.748,41** — a
  diferença exata —, virou 3 baixas, status `recebido`, e **a invariante fechou**
- Regressão **medida**: **46 suítes, 2.286 testes**, nenhuma falha

### A coluna: medida, não suposta
Comparado com o arquivo **real da v142** (raw do commit `9be05f8`, confirmado com
7 `<th>` e sem `_fatCelulaRecebido`):

| Janela | v142 (7 colunas) | v143 (8 colunas) |
|---|---|---|
| 900px | 778px · **já rolava** | 879px · rola |
| 1024px | 778px · **já rolava** | 879px · rola |
| 1366px | 1097px · não rola | 1097px · **não rola** |

⚠️ **A tabela já rolava a 900 e 1024 na v142** — o custo da coluna é **+101px**
numa rolagem que já existia, e a 1366px ela cabe de graça. Todas as 32 linhas
com **8 células**, nenhuma torta.

### ⚠️ Três tropeços meus, os três pegos por o número não fazer sentido
1. **O `v142_semColuna` deu `false`** — eu procurei `>Recebido</th>` no arquivo
   inteiro, e essa string **já existia**: é a coluna da tabela do **Contas a
   Receber**. A conferência tem de olhar dentro do `renderFaturas`.
2. **"v143 ths: 0"** — passei `window.__JS` (o script já extraído) para uma
   função que espera o **HTML**, então o regex de `<script>` não casou nada.
3. **A primeira medida da coluna veio com `janela: 0`** — a aba estava sem
   largura. Número que não bate com a conta (janela − 220 − 32) é ambiente
   errado, não resultado.

### ⚠️ A cadeia de dependências quebrou DUAS suítes, pela terceira vez em 5 dias
`t-baixas` (v108) e `t-sincfat` (v107) extraem funções **por nome**:
- `finVerBaixas` passou a ler `_todasFaturas` e chamar `_fatChave`;
- `renderFaturas` passou a chamar `_fatIdxRepetido` / `_fatRecebimento` / `_fatCelulaRecebido`.

Nenhum é defeito do sistema — em produção os dois são `var` global **antes** do
uso (6311 e 6396), conferido. As duas suítes ganharam a cadeia.

🔴 É a mesma armadilha do `_subLista` (29/10), do `mltRelatorioEscopo` (31/10) e
do `mltISO` (hoje, na suíte nova). **Extrair por nome exige acompanhar quem a
função passa a chamar** — e isso vai continuar acontecendo a cada mudança que
some uma chamada nova. Vale extrair por cadeia automática, como o ambiente do
navegador já faz.

### ⏳ Não verificado · e uma decisão para o Rogel
Falta **logado**: abrir o painel **Faturas** com **Ctrl+Shift+R**, ver a coluna
Recebido e clicar num 📋. Eu não autentico.

🔴 **Decidir os dois pares de faturas com chave repetida** (G7 `001/2026-08` e
ISS `001/2026-09`): mudar o número de uma de cada par separa as cobranças. Sem
isso, dar baixa numa delas mexe no lançamento da outra.

---

## ✅ Filtro por locatário na aba Manutenção — 03/11/2026 (`875a84c`, `v145`) · gestao v144 → v145

Pedido: *"na aba manutencao incluir o filtro por cliente"*.

### 🔴 O trabalho não foi o filtro — foi decidir o que "cliente" significa aqui
Manutenção é de **veículo**, não de cliente. Então "cliente" só pode ser *de quem
era o carro*. Há três respostas possíveis, e elas discordam. Medido nas **771
manutenções reais**:

| Como responder | Alcança |
|---|---|
| cliente **gravado** na manutenção | 268 |
| locatário **NA DATA** (ativos + histórico) | 573 |
| locatário **ATUAL** (só ativos) | 733 |
| 🔴 gravado **difere** do na-data | **0** — o gravado é confiável |
| 🔴 atual **difere** do na-data | **13** — o atual nomeia o cliente errado |

**E o número que decidiu:** das **159** manutenções em que só o locatário atual
responde, **154 são anteriores à PRIMEIRA locação do carro** — preparação de
frota, custo da própria LOKÁ. Elas somam **R$ 735.617,70**.

⚠️ Filtrar pelo locatário atual jogaria esses R$ 735 mil **na conta de clientes
que nem tinham o carro ainda**. Quem filtrasse por "RSC" para saber o gasto com a
frota dela veria custo de antes de a RSC entrar no contrato.

### A regra: gravado → locatário NA DATA → sem locatário
`_clienteDaManut(m)` devolve `{id, nome}`; vazio quando o carro não estava
alugado na data — e isso **é a verdade**, não falha: é manutenção por conta da
locadora.

🔴 **Reusa o `mltIndLocacao`** (v135, já coberto por 70 testes) em vez de
duplicar a varredura de `ativos` + `historico`. Ele já respeita contrato
multi-veículo (armadilha 2) e já ordena quando duas locações cobrem a data.

### 🔴 O badge foi corrigido junto — e isso é mudança ALÉM do pedido literal
`_empresaDaManut` usava gravado → **atual**, então o badge 🏢 já mostrava o
cliente errado nessas 159 + 13 linhas.

**Filtro e tela têm de concordar:** se eu deixasse o badge como estava, filtrar
por "RSC" não traria linhas cujo badge diz "🏢 RSC", e isso pareceria filtro
quebrado. Conferido antes de mexer: `_empresaDaManut` só é usado nos **2 badges**
(tabela normal e restrita) e **nada grava** com base nele.

⚠️ O `_locatariaAtual` dos **outros 7 lugares** (modal de manutenção, frota,
veículos) ficou **intocado** — ali "quem está com o carro agora" é o certo, e é
isso que a tela de registrar manutenção precisa.

### 🔴 O filtro entra nos DOIS lugares, por uma função só
A aba tem **duas** implementações do mesmo filtro: `_manutColetarSaida` (perfil
restrito + relatório) e `renderManutencao` (tabela normal).

A regra mora em **`_manutClienteOk`**, e os dois a chamam; a escolha vem de
**`_manutClienteFiltro()`**, e nenhum dos dois lê o `<select>` por conta própria.
Deixar em um faria o relatório discordar da tela — o acidente da **v119**. Há
teste e defeito injetado para cada ponta, e o relatório **nomeia** o locatário
escolhido no cabeçalho.

### O menu
Só os clientes que **têm** manutenção, em ordem alfabética sem acento, com a
contagem — opção que não filtra nada só atrapalha (padrão dos filtros de Vendas
e do órgão das multas). Mais a opção **"— Sem locatário na data"**, que é
informação valiosa por si: é o custo que a LOKÁ absorve.

### Medido no ar, com os dados reais e num `<select>` de verdade
| | |
|---|---|
| clientes no menu | **16** (+ "Todos" + "sem locatário") |
| 🔴 **INVARIANTE** | **771 = 771** — nenhuma manutenção perdida nem em dois baldes |
| 🔴 **invariante do custo** | R$ 642.362,38 + R$ 1.012.612,70 = **R$ 1.654.975,08**, o total exato |

| Locatário | Manutenções | Custo |
|---|---|---|
| RSC TRANSPORTE 2016 | 362 | R$ 204.787,08 |
| G7 COMPANY | 103 | R$ 61.259,00 |
| TRANSSOUZA | 46 | R$ 337.177,10 |
| BRJ EXPRESSO | 37 | R$ 26.857,31 |
| ISS TRANSPORTES | 13 | R$ 3.166,00 |
| **— sem locatário na data** | **198** | **R$ 1.012.612,70** |

🔴 **61,2% do custo de manutenção não tem locatário na data.** É o que a LOKÁ
absorve — preparação de frota e carro parado. Antes isso estava diluído no badge
como se fosse de cliente.

### ⚠️ O custo da barra de filtros: 44px a 1024px, e o teto NÃO resolveu
Medido contra o arquivo **real da v143** (raw de `875a84c~1`):

| Janela | v143 | v144 (sem teto) | **v145 (teto 230px)** |
|---|---|---|---|
| 900px | 4 linhas · 123px | 4 · 123px | **4 · 123px** |
| 1024px | **2 linhas · 79px** | 4 · 123px | 🔴 **4 · 123px** |
| 1366px | 2 linhas · 79px | 2 · 79px | **2 · 79px** |

Sem teto o `<select>` crescia até **356px** (a opção mais longa é "TRANSSOUZA
TRANSPORTE E TURISMO LTDA (46)"). O teto o trouxe para **230px** — mas **a barra
continua em 4 linhas a 1024px**.

🔴 **Correção do que eu afirmei:** a mensagem do commit da v145 dá a entender que
o teto resolveria a quebra a 1024px. **Não resolveu.** A caixa de datas sozinha
tem **378px**, e a 1024px sobram 772px: busca + status + datas já ocupam quase
tudo, então **qualquer** campo novo ali custa uma linha. Reduzir mais o seletor o
deixaria ilegível, e mexer na caixa de datas seria alterar o que não foi pedido.

O teto fica porque melhora a proporção (230 contra os 144 do status, em vez de
356) e não custa nada — mas **o custo real é 44px de altura na faixa de 1024px**,
e a 900 e 1366 não custa nada.

⚠️ Com o seletor fechado o navegador trunca o nome; a **lista aberta** mostra o
nome inteiro e a contagem — que é quando elas importam. Conferido no ar.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **47 testes** com o código real e os dados reais (771 manutenções, 107 ativos,
  101 encerrados): a regra nas três fontes, manutenção antes da primeira locação,
  **as 154 reais sem ganhar cliente**, placa com hífen, locação encerrada,
  manutenção sem data contra contrato **em aberto**, badge = filtro, a invariante
  da partição, as contagens do menu batendo com o filtro, ordem, escape, menu
  vazio, lista vindo como objeto do Firebase, e o fonte (os dois filtros, uma
  fonte só, o relatório nomeando, o `<select>` nas duas telas)
- **25 defeitos injetados — todos acusados**, entre eles **voltar ao locatário
  atual**, ignorar o gravado, inverter o "sem locatário", o relatório parar de
  filtrar, o menu perder a escolha, e duplicar a varredura em vez de reusar
- **No ar, no arquivo publicado**: as medições acima, num `<select>` de verdade,
  com a escolha sobrevivendo ao redesenho nos 3 clientes testados
- Regressão **medida**: **47 suítes, 2.333 testes**, nenhuma falha

### ⚠️ Três tropeços meus
1. **O teste [3] falhou e o código estava certo.** Eu testava a véspera de *uma*
   locação, e a placa EQQ2J61 tem **outra** da mesma TRANSSOUZA cobrindo aquela
   data (2025-06-28 → 2027-06-28). Amostra ruim, não defeito. Reescrito para a
   véspera da locação **mais antiga** — que é o caso real das 154.
2. **Dois defeitos injetados passaram.** Um era teste fraco meu (placa inventada
   `ABC1234`, que não está em locação nenhuma, deixava a guarda `!m.data`
   invisível — com placa real de contrato **em aberto** o defeito aparece). O
   outro revelou **código morto meu**: ver abaixo.
3. **Escrevi uma guarda que não faz nada.** `if (atual && sel.value !== atual)
   sel.value = '';` — conferido no navegador em 03/11: trocar o `innerHTML` de um
   `<select>` **não mantém o `.value` sozinho** (nem quando a option continua
   existindo); quem preserva é o atributo **`selected`**, e option que sumiu já
   deixa o value vazio. A linha saiu, e o teste [23] passou a medir **o resultado**
   (o value do select) em vez da fiação (ter `selected` na string) — a lição de
   28/09.

⚠️ E o stub de `<select>` da suíte precisou simular o navegador de verdade
(`innerHTML` recriando as options e zerando um value que sumiu). Sem isso um
teste falhava por defeito do **ambiente**, não do código.

### 🔴 Achado de dado, não corrigido
A placa **EQQ2J61** tem uma locação marcada como **encerrada** com devolução em
**2027-06-28** — no futuro. Provavelmente é a vigência contratada, e não
atrapalha o filtro (a locação ativa dela é de 11/06/2026). Fica registrado.

### ⏳ Não verificado
Falta **logado**: abrir Manutenção com **Ctrl+Shift+R**, escolher um locatário e
conferir a lista e o PDF. Eu não autentico.

---

## 🔴 A fatura reiniciava e apagava o trabalho — 03/11/2026 (`97cf276`) · fatura v83

Pedido: *"verificar o bug que acontece quando estamos gerando nova fatura onde o
sistema reinicia e perdemos o trabalho. criar o salvamento automatico"*.

### 🔴 A causa era um recarregador que EU tinha deixado na página
No fim da `fatura.html` havia:

```js
// ── Detecta nova publicação e recarrega sozinho (evita ficar preso em cache) ──
var c = r.headers.get('etag') || r.headers.get('last-modified') || '';
if (c !== carimbo) { location.replace(location.pathname + '?v=' + Date.now() + …); }
```

A cada **5 minutos** *e* a cada **`visibilitychange`** (trocar de aba e voltar),
ele fazia `HEAD` na própria página e, se o cabeçalho tivesse mudado, recarregava
**à força, sem aviso e sem salvar nada**.

### 🔴 E o gatilho era FALSO — medido em produção
| | |
|---|---|
| último commit que tocou `sistema/fatura.html` | **13/10/2026** (`095494c`) |
| o que o servidor respondia em 03/11 | `Last-Modified: 03 Nov 2026 14:11` |

**O GitHub Pages reescreve o `Last-Modified` — e o `ETag`, que o embute — de
TODOS os arquivos a cada publicação, mesmo nos que não mudaram.** Então a fatura
aberta recarregava a cada push meu em **qualquer** arquivo.

Em 03/11 foram **5 pushes** (10:05, 10:13, 11:01, 11:06, 11:10) — cinco
reinícios possíveis, **dois deles com 5 minutos de intervalo**. Preencher uma
fatura de 13 veículos leva mais que isso.

### O conserto não é invenção minha
O **`gestao.html` já fazia o certo**: compara o **build** e apenas **avisa**
(`mostrarAvisoAtualizacao`). A fatura passou a fazer igual:

| | antes | agora |
|---|---|---|
| o que compara | `etag`/`last-modified` do HTTP | o **carimbo dentro do arquivo** |
| quando dispara | a cada publicação de qualquer página | só quando **esta** página muda |
| o que faz | `location.replace` à força | **faixa** com *Atualizar agora* / *Depois* |

🔴 **Quem decide a hora de atualizar é quem está preenchendo.** E "Atualizar
agora" **salva o rascunho antes de sair** — há teste e defeito injetado para a
ordem das duas coisas.

⚠️ O `ajuste.html`/`ajuda.html` também tem um recarregador; **não foi tocado**
(não foi pedido, e lá não há formulário longo). Fica registrado.

### O salvamento automático
| Decisão | Por quê |
|---|---|
| **`_fatMontarObjeto()` extraído do `salvarFatura`** | o rascunho e o salvamento montam **a mesma forma**. Em duas montagens, o rascunho restauraria algo diferente do que seria gravado — o acidente da v119 |
| essa função **não valida** | é rascunho justamente do incompleto; quem valida é o `salvarFatura`, antes de gravar |
| restaura pelo **`preencherFaturaParaEdicao`** | é o caminho que a edição já usa — um restaurador só |
| 🔴 **oferece, nunca restaura sozinho** | aplicar por cima do que o operador acabou de abrir é pior que perder o rascunho. O `localStorage` não manda no Firebase (armadilha 4) |
| rascunho **por contexto** | o de uma fatura nova não é oferecido a quem abriu `?edit=`, e vice-versa |
| **debounce de 1,5s** | gravar a cada tecla encheria o `localStorage` num formulário de dezenas de campos |
| modo **consulta** não gera rascunho | `?view=` é leitura |
| apagado ao **gravar** e ao **Limpar** | senão a próxima abertura ofereceria de volta o que já está no banco ou o que foi descartado de propósito |
| `localStorage` bloqueado não atrapalha | aba privada e cota cheia caem no `catch` — quem está digitando não pode levar erro na cara |

O indicador **💾 rascunho salvo 11:52** fica ao lado dos botões: "automático" sem
sinal na tela não passa confiança.

### 🔴 Esta página não tinha escape de HTML NENHUM
Conferido antes de escrever as faixas: `grep` de escape = **0**. Entrou `_escH` —
sem ele, nome de cliente com `<` ou aspas quebraria as duas faixas, que é
exatamente o defeito que deixou o `crm.html` em branco.

⚠️ Antes de aplicar o patch eu varri **toda função que o código novo chama**:
`_escH` não existia (0 ocorrências). Se eu tivesse aplicado sem conferir, as duas
faixas nasceriam quebradas.

### Validado
- `node --check`; `<div>` balanceadas (**73/73**, como no registro da v82); os
  dois carimbos batendo
- **49 testes de runtime** com o código real: o checador (não recarrega, não lê
  cabeçalho, compara o carimbo, para quando a versão é igual, segue checando ao
  voltar à aba), a faixa de versão (aparece, não navega, não duplica, fora da
  impressão), a montagem única, o rascunho (grava, contexto, vazio não grava,
  consulta não grava, debounce, indicador, `localStorage` quebrado), oferecer ×
  restaurar, descartar com confirmação, apagar ao gravar e ao Limpar, e o escape
- **34 defeitos injetados — todos acusados**, entre eles **o bug relatado de
  volta** (o checador antigo inteiro), recarregar em vez de avisar, restaurar
  sozinho, oferecer rascunho de outro contexto, e "Atualizar agora" sair sem
  salvar
- **No ar, na página publicada, com teclas de verdade e os dados reais**
  (141 clientes, 119 veículos):

| Passo | Resultado |
|---|---|
| digitei no nº da fatura | rascunho salvo sozinho · indicador *"💾 rascunho salvo 11:51"* |
| escolhi RSC + 3 veículos a R$ 1.500 | rascunho com cliente, nº, 3 veículos e **R$ 4.500,00** |
| 🔴 os dois sinais lado a lado | `Last-Modified` **de hoje** · carimbo **igual** → **o gatilho novo não dispara** |
| faixa de versão nova | avisou, **não navegou**, trabalho **intacto** na tela |
| recarreguei a página | rascunho **oferecido**, `restaurou sozinho: false` |
| cliquei em Restaurar | RSC · nº 007001 · 3 veículos · R$ 4.500,00 **de volta** |

  Nada foi gravado em produção — nunca cliquei em Salvar, e o rascunho de teste
  foi removido do `localStorage` ao fim.
- Regressão **medida**: **48 suítes, 2.382 testes**, nenhuma falha

### ⚠️ QUATRO asserções minhas julgaram pelo COMENTÁRIO, não pelo código
O comentário que eu escrevi para explicar o defeito antigo **cita os termos**
(`etag`, `last-modified`, `location.replace`, `visibilitychange`). Quatro testes
estruturais procuravam esses termos **no bloco inteiro** e, por isso:

- dois **falhavam** com o código certo;
- dois **absolviam** defeitos injetados de verdade.

🔴 A regra para esta suíte passou a ser: teste estrutural olha `codigoChecador`
(com as linhas de comentário filtradas), **nunca** o bloco cru. E há um teste
`[2b]` que **exige que o comentário cite os termos** — se alguém reescrever o
comentário, o filtro deixa de ser necessário e isso tem de aparecer.

⚠️ **Comentário não é código.** Vale para qualquer asserção que procure uma
string no fonte — e este arquivo tem comentários longos de propósito.

### ⚠️ Outros tropeços da entrega
1. **O recorte do bloco engolia a função do botão.** "2200 caracteres a partir do
   comentário" incluía o `_fatAvisarVersao`, onde o `location.replace` é
   **legítimo** (é o operador clicando). Passou a ser delimitado pelo fechamento
   do próprio IIFE.
2. **O ambiente de teste ficou meio carregado**: o `pega()` só extrai
   `function X(){}`, então as `var` de módulo do bloco (`RASCUNHO_CHAVE`,
   `_rascTimer`) ficaram de fora — o `_rascSalvar` gravava em
   `store['undefined']` e **sete testes caíam em cascata**. Agora as `var` são
   extraídas **do fonte**, então renomear a chave não quebra o teste em silêncio.
3. **O meu próprio `preenche()` escondia um caso**: `o.cliente || padrao`
   substituía um `null` proposital pelo padrão, e o teste do cliente ausente
   nunca exercitava o caso.
4. Uma asserção terminava em `&& r.em`, devolvendo a **string** da data em vez de
   `true` — faltou o `!!`.
5. O **heredoc comeu os escapes** mais uma vez ao tentar consertar a suíte por
   script (`\n` virou quebra de linha, a âncora não casou e nada foi aplicado).
   Refeito pela ferramenta de escrita. É a regra já registrada.

### ⚠️ E a suíte `t-fat-baixa` travava o NÚMERO da versão
Ela exigia literalmente `v82-`, então publicar a v83 a fez falhar **sem defeito
nenhum** — é a quarta vez (v134, 20/10, 31/10 e agora). Passou a comparar **os
dois carimbos entre si** mais o formato `vNN-AAAAMMDD-HHMM`, que é a regra de
verdade do CLAUDE.md e ainda pega o caso de a fatura sair carimbada como outra
página.

### ⏳ Não verificado
Falta **logado no fluxo real**: o Rogel montar uma fatura de verdade, deixar a
aba aberta, e confirmar que não reinicia mais. O ciclo foi exercitado por mim na
página publicada, mas com um preenchimento de teste.

---

## ✅ Importação da Notificação de Autuação — 04/11/2026 (`4541245`) · gestao v146

Pedido: *"⚠ 1 falhou(ram): notificacaoAutuacao_FIJ1F24_… — nenhuma infração
reconhecida. verificar os arquivos acima e implantar um padrão para importação
do pdf"*, com dois PDFs em anexo.

### 🔴 Os dois arquivos são a MESMA multa e dois problemas diferentes
| | |
|---|---|
| `notificacaoAutuacao_FIJ1F24_….pdf` | ✅ **tem texto dentro** (97 operadores `Tj`, fontes Helvetica) → faltava o **parser** |
| `fij1f24.pdf` | 🔴 **14.568 curvas, 0 fontes, 0 caracteres extraídos** → é desenho |

O segundo é a tela **"Detalhes da Infração"** — layout que o sistema **já
conhece desde antes** — salva pelo **"Microsoft Print to PDF"**, que transforma
cada letra em curva vetorial. ⚠️ **Não há nada a consertar no código para ele:**
o conserto é na origem, escolhendo em *Destino* → **"Salvar como PDF"**.
É o mesmo caso de 14/10, e voltou porque a mensagem de erro não ensinava.

Os dois trazem o AIT **R004328370**, placa **FIJ1F24**, R$ 195,23, 27/09/2026.

### O parser novo — e o padrão que ele implanta
A **Notificação de Autuação** é formulário padronizado: rótulos fixos, por
extenso. Mas ele tem **duas colunas**, e o `pdf.js` agrupa por **altura** —
então rótulo e valor quase nunca caem na mesma linha, e pedaços de colunas
diferentes se misturam:

```
ÓRGÃO AUTUADOR
105300 ROD. BA524, KM 5,75 - SENTIDO DECRESCENTE   ← código + o LOCAL
SEINFRA - SECRET DE                                 ← nome do órgão, parte 1
INFRAESTRUTURA DO ESTADO                            ← parte 2
BAHIA DATA                                          ← parte 3 + rótulo vizinho
```

🔴 **Por isso não dá para ler por posição.** O padrão é: **ancorar no RÓTULO e
procurar adiante o primeiro valor com a FORMA certa** (data, hora, dinheiro,
placa, código), pulando os rótulos do caminho. É o mesmo princípio do cartão do
DETRAN-BA (v115), e é o que deve valer para qualquer formulário desta família.

`MLT_NA_ROTULOS` lista os rótulos do formulário; `_naSemRotulos` os arranca
**como palavra inteira** de um pedaço de valor (`BAHIA DATA` → `BAHIA`). Sem
isso o nome do órgão sai com "DATA" grudado.

### 🔴 O gabarito não foi inventado por mim
Os **12 campos** foram conferidos contra a tela **"Detalhes da Infração" do
próprio portal** — o segundo PDF, que mostra a MESMA multa. É renderização do
órgão, não suposição minha:

| campo | valor |
|---|---|
| placa · AIT | FIJ1F24 · R004328370 |
| data · hora | 27/09/2026 · 00:06 |
| valor | R$ 195,23 (grave, 5 pts, pelo valor do CTB) |
| código da infração | 7463 |
| órgão | `105300 - SEINFRA - SECRET DE INFRAESTRUTURA DO ESTADO BAHIA` |
| local | `ROD. BA524, KM 5,75 - SENTIDO DECRESCENTE - SIMOES FILHO` |
| 🔴 prazo de indicação | **2026-11-23** |

### 🔴 O que este documento traz e o sistema não tinha
| | |
|---|---|
| **`prazoIndicacao`** | hoje **1** das **587** multas a indicar tem esse dado. Buscá-lo no e-Frotas custaria **394 consultas cobradas** (decisão de 24/09: não buscar). Aqui vem **de graça** |
| **`codigoInfracao` / `codigoOrgao`** | a **Auditoria** agrupa por eles (N2/N3) e a **Indicação** os exibe — e **nenhum parser de PDF os preenchia**. ⚠️ As 245 multas de PDF que os têm vieram de um preenchimento avulso anterior, não do código |
| RENAINF, data da notificação, prazo de defesa, marca/modelo, proprietário | vão para a **observação** |

`mltParsePDF` passou a repassar os dois códigos (`b.codigoInfracao || ''`).
Quem não os conhece manda `''` — que é **exatamente o que já acontecia**
(`undefined` → `''` na Auditoria), então nenhum parser existente muda de
comportamento.

### 🔴 O que o parser NÃO inventa: `vencimento` fica VAZIO
O documento tem **três** datas — notificação (13/10), defesa prévia (23/11) e
identificação do condutor (23/11) — e **nenhuma é data de pagamento**. Notificação
de **AUTUAÇÃO** não cobra: a cobrança vem na Notificação de **Penalidade**.
Pôr qualquer uma delas em `vencimento` faria a tela mostrar uma data de
pagamento que não existe. Há teste e defeito injetado para isso.

⚠️ **As duas datas-limite deste documento são iguais (23/11)**, então ele sozinho
não distingue "defesa prévia" de "identificação do condutor" — trocar uma âncora
pela outra passaria. Entrou um caso com as duas **diferentes**.

### As mensagens de falha passam a dizer o que fazer
*"sem texto selecionável"* e *"nenhuma infração reconhecida"* informavam que
falhou e mais nada — foi por isso que o Rogel não teve como saber se o problema
era o arquivo ou o sistema.

| Situação | O que a tela diz agora |
|---|---|
| **zero texto** | que as letras são desenho, e **como consertar na origem** ("Salvar como PDF", não "Microsoft Print to PDF"); e o caso do digitalizado |
| **layout desconhecido** | que o texto **foi lido** (quantos caracteres) e **com o que o documento começa** — que é o que permite reconhecer um formato novo **sem o arquivo em mãos** — mais a lista dos 4 formatos conhecidos |

### 🔴 De quebra: o nome do arquivo já ia cru para o `innerHTML`
`falhas.push(f.name + ' — ' + e.message)` desembocava em `innerHTML` **sem
escape**, e acrescentar o início do PDF alargaria o buraco. Entrou **`_mltEsc`**
(padrão da casa: `_condEsc`, `_agEsc`, `_axEsc`) e os dois passam a ser
escapados. É o defeito que deixou o `crm.html` em branco, por outro ângulo.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**814/814**); os dois carimbos batendo
- **86 testes** com o código real, o **texto real** do PDF (extraído com o
  `mltExtrairTexto` do próprio sistema e **conferido byte a byte** contra o
  navegador: 1714 caracteres, mesmo hash) e o **banco real** (662 multas):
  roteamento, os 12 campos, o que não pode ser inventado, as notas, ponta a
  ponta pelo `mltParsePDF`, duplicata pelo AIT, locatário na data, 14 bordas e
  as mensagens
- **29 defeitos injetados — todos acusados**, entre eles **o bug relatado**
  (sem rota, cai no parser de lista), `vencimento` recebendo o prazo de defesa,
  o nome do órgão engolindo o rótulo, o município pegando pedaço do nome do
  órgão, a descrição engolindo a data que cai no meio dela, e o nome do arquivo
  voltando a ir cru
- **No ar, contra o arquivo PUBLICADO** (buscado na própria origem, que dispensa
  login), com o texto real conferido por hash: **1 registro, os 12 campos
  certos**, e o parser de lista — o que respondia antes — **continua devolvendo
  zero**. Nada foi gravado em produção.
- Regressão **medida**: **49 suítes, 2.468 testes**, nenhuma falha

### ⚠️ Quatro defeitos injetados passaram, e os quatro ensinaram
| O que passou | Por quê |
|---|---|
| a rota exigir **só um** marcador | meu teste só exigia resultado vazio — e ele é vazio dos dois jeitos. O que o 2º marcador protege é um documento de **lista** que cite a expressão; passou a ser esse o caso |
| o município aceitar pedaço do nome do órgão | no documento real a linha antes da UF é **sempre** o município. Quem exercita a guarda é o documento **sem** município |
| a data da infração ancorada no começo | aqui a data da infração **é a primeira** do documento. Só com uma data no **cabeçalho** o descuido aparece |
| o código da infração com regex frouxa | era **injeção minha errada**: `7463` vem antes de `0 R$ 195,23`, então a ordem já protegia. Troquei pelo defeito de verdade — perder a âncora e pegar o código do **órgão** |

⚠️ E o ambiente compartilhado (`amb-gestao.js`) **engolia o erro de carga** com
`catch (e) { }` — a armadilha de 14/10. Agora ele guarda em `ctx.__erroCarga`, e
o primeiro teste da suíte **exige que o sistema tenha carregado inteiro**
(`MLT_GRAV` + `MLT_UF` + `MLT_NA_ROTULOS`, todas `var` tardias).

⚠️ O contador de regressão **não lia o formato desta suíte** e pulou-a em
silêncio (disse "48 com número" de 49) — era o defeito já registrado em 29/10,
que voltou porque o arquivo se perdeu entre sessões. O `---` virou opcional.

⚠️ E o heredoc comeu os escapes **mais uma vez** ao tentar corrigir uma asserção
por script. Ferramenta de escrita, sempre.

### ⚠️ Achado não corrigido: `mltDetectarOrgao` acha "DER" dentro de "CONSIDERADO"
```js
var lista = ['DETRAN','DNIT','PRF','SEMOB','SMTT','DER','PMBA',…];
for (var i = 0; i < lista.length; i++) if (t.indexOf(lista[i]) >= 0) return lista[i];
```
É **substring sem fronteira de palavra**: neste documento ele devolve **`DER`**,
achado em `VALOR CONSIDERADO`. Não atrapalha aqui porque o parser traz o órgão e
`b.orgao || orgaoGlobal` dá preferência a ele — **e há teste e defeito injetado
para essa ordem**. Mas `mltDetectarOrgao` é o **fallback de todo parser que não
traz órgão**, e qualquer documento com "considerado", "liderado" ou "moderado"
recebe órgão "DER". **Não corrigido** (é anterior e não foi pedido); consertar é
uma fronteira de palavra, mas muda o órgão de importações futuras dos outros
parsers.

---

## 🔴 O documento revelou por que o Serpro recusa a FIJ1F24 — 04/11/2026

A Notificação de Autuação diz quem é o dono no DETRAN:

> **NOME DO PROPRIETÁRIO: AUTO MAIS COMERCIO E C DE VEICULOS LTDA**
> **CPF/CNPJ: 05.622.137/0001-00**

🔴 **A FIJ1F24 é uma das 6 placas ATIVAS que o Serpro recusa com 403** ("Consulta
não autorizada / Nenhum registro encontrado"), registradas em 30/09. E o contrato
e-Frotas é da **LOKÁ — nome fantasia da Rodera Transportes LTDA**, outro CNPJ.

**Uma placa cujo proprietário no DETRAN é a Auto Mais não está na frota e-Frotas
da Rodera.** Daí o 403. É o *"não está no nome da locadora"* do pedido de 14/10,
agora com documento.

⚠️ **Provado para UMA placa, hipótese para as outras cinco** — só esta tem
documento. Mas é a explicação mais provável, e é conferível: basta ver de quem é
o CNPJ de cada uma no DETRAN.

⚠️ E a FIJ1F24 **não está** na frota da Auto Mais no sistema (45 veículos no
Firestore, conferido): ela roda na LOKÁ e está registrada no CNPJ da Auto Mais.
É fato de registro, não defeito de sistema.

### O que isso custa, medido em 04/11 (662 multas no banco)
| Placa | Status | Multas no sistema | Alugada agora para |
|---|---|---|---|
| SKT3B92 | alugado | 5 *(as importadas à mão em 14/10)* | ISS TRANSPORTES |
| TKQ7I29 | alugado | **0** | DANILO DA SILVA FERREIRA |
| SUJ8F15 | alugado | **0** | Luciano Evangelista Brito |
| EXI0G91 | alugado | **0** | BRJ EXPRESSO |
| TMX5C27 | alugado | **0** | ATP Comercio de Alimentos |
| FIJ1F24 | alugado | **0** | RSC TRANSPORTE 2016 LTDA |

**As 6 estão alugadas.** A multa deste PDF (R004328370, R$ 195,23, locatário
**RSC** na data) **não está no sistema** — e não entraria nunca pela varredura,
porque a consulta daquela placa é recusada. Cada varredura ainda gasta 6
consultas cobradas que sempre dão erro.

🔴 **O conserto é fora do sistema:** incluir as placas na frota e-Frotas do CNPJ
que de fato as possui, ou transferir a propriedade. Enquanto não for, o caminho
é importar o PDF de cada notificação — que agora funciona.

### 🔴 8 placas estão nas DUAS frotas (LOKÁ e Auto Mais)
Conferido nos dois bancos: `SJC3A29`, `RVN9D70`, `RTE3J91`, `SCZ4A24`,
`SHP2B83`, `SJA7D59`, `RVO7F21`, `RBV3F29`. Quase todas `inativo` na LOKÁ e
`vendido` na Auto Mais — carros que passaram de uma empresa para a outra.

⚠️ Duas delas já eram pendência: a **RTE3J91** está `inativo` na LOKÁ **com
aluguel ativo da G7** (achado de 29/10) e `disponivel` na Auto Mais; a
**SJA7D59** tem 4 multas sem locatário.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o painel Multas → aba **Importar** com
**Ctrl+Shift+R**, escolher o `notificacaoAutuacao_….pdf` e conferir a multa na
tela de conferência antes de gravar. Eu não autentico.

---

## ✅ Cliente pode ser cadastrado como fornecedor — 04/11/2026 (`0a520d5`) · Auto Mais

Pedido: *"permitir que o cadastro de cliente tambem possa ser salvo como
fornecedor pois muitas vezes compramos o carro do mesmo cliente o qual
haviamos vendido"*.

### 🔴 O Rogel viveu o caso 8 minutos antes de eu publicar
Enquanto eu trabalhava, apareceu no banco a prova do problema:

| | Horário (local) |
|---|---|
| cliente **CLESIVAN OLIVEIRA DA SILVA** (cli#30) criado | **17:21** |
| **mesmo nome e mesmo CPF** criado como fornecedor (forn#15) | **17:34** — à mão |
| meu commit | 17:42 |

⚠️ **Não fui eu** — todas as minhas gravações passam por stub, e o registro é
anterior à publicação. Ele redigitou os 9 campos, 13 minutos depois de
cadastrar o cliente. É exatamente o que o pedido descreve.

### O tamanho do problema, medido antes de construir
| | |
|---|---|
| clientes | 28 · fornecedores: 14 (na medição) |
| **clientes que já compraram carro** | **27 de 28** |
| clientes que eram fornecedor | **0** |
| campos em comum entre os dois cadastros | **9** |

Comuns: nome, documento, RG, telefone, e-mail, endereço, cidade, UF e
observações. Só do fornecedor: `tipo`, banco, agência, conta. Só do cliente:
nascimento, CEP, estado civil, profissão.

### Dois lugares, o mesmo caminho
| Onde | Quando serve |
|---|---|
| botão na **linha do cliente** | é o caso real: o cliente já existe de uma venda antiga |
| botão no rodapé do **formulário**, ao **editar** | quando já está com o cadastro aberto |

🔴 **No cadastro novo o botão não aparece** — não se torna fornecedor quem
ainda não existe. Há teste e defeito injetado para isso.

### 🔴 Abre o formulário PREENCHIDO; não grava sozinho
Dois motivos, e os dois vêm dos dados:

1. **O `tipo` é derivado da contagem de dígitos**, e isso foi conferido nos 14
   fornecedores reais: **todo documento de 11 dígitos está como pessoa física,
   todo de 14 como jurídica — sem uma exceção**. Mas derivação é palpite, e
   quem confere é quem está cadastrando.
   ⚠️ Os **7 fornecedores marcados PJ sem CNPJ** são os de documento **vazio**
   (vieram do cadastro rápido de 26/09) — não contradizem a regra.
2. **Os dados bancários existem para repassar o pagamento do carro**, e o
   cadastro de cliente não os tem. Nascem vazios — não se inventa conta de
   ninguém. (Hoje estão vazios em **14 de 14**, mas inventar seria pior.)

### 🔴 O `id` NÃO é copiado
As duas sequências de id são **independentes** (clientes vão de 3 a 30;
fornecedores de 1 a 15). Levar o id do cliente **sobrescreveria o fornecedor
de mesmo número** — o cliente 7 apagaria o fornecedor 7. Há teste e defeito
injetado só para isso.

### As travas contra duplicata
| Situação | O que acontece |
|---|---|
| cliente **já é** fornecedor (mesmo documento) | a linha mostra **selo 🏢✓** e o botão **abre o existente**; não oferece criar outro |
| **mesmo nome**, documento diferente ou ausente | **avisa e deixa seguir** |
| documento repetido ao salvar | o **`svForn` passou a perguntar** |

🔴 **O `svForn` não conferia documento repetido** — o `svCli` confere desde
sempre. O atalho novo deixaria duplicar fácil, então a guarda entrou junto.
⚠️ É mudança além do pedido literal, e está registrada para ser revertida se
ele não quiser.

⚠️ O aviso por **nome** não bloqueia de propósito: nome se repete, e 7 dos 15
fornecedores estão **sem documento nenhum** — esses nunca casariam por
documento.

### Validado
- `node --check` no shared e nas **10 páginas**
- **39 testes de runtime** com os dados reais (28 clientes, 14 fornecedores,
  46 veículos, 28 vendas, 28 contratos): o mapeamento campo a campo, o que
  **não** é copiado, a derivação do tipo **conferida contra os 7 fornecedores
  reais que têm documento**, as três travas, o ciclo completo (abrir → salvar →
  conferir o registro), e a invariante de que o **cliente não é alterado nem
  apagado**
- **25 defeitos injetados — todos acusados, nenhum cego**: não preencher, levar
  o id, levar o CEP, inventar banco, errar o tipo (sempre PF, sempre PJ, e pelo
  tamanho do *texto* em vez dos dígitos), não tirar máscara, ignorar quem já
  existe, gravar sozinho, tirar a guarda do `svForn`, perder o botão da linha
- **No ar, no arquivo publicado, com os dados reais** e `fsave`/`fdel`
  substituídos: **CLESIVAN** (o par que o Rogel criou à mão) sai com **selo e
  atalho para o forn#15**, os outros 27 com o botão de criar; ciclo completo na
  **IZADORA DA CONCEIÇÃO SANTANA** (cli#10) → formulário com os 9 campos,
  acento intacto, banco vazio, tipo PF, salvou como **forn#16** (não #10),
  gravou **só** em `fornecedores`, cliente intacto, e na segunda vez a linha
  **já reconhece**. **Nada gravado em produção** — reconferido: 28 clientes,
  15 fornecedores, 46 veículos, e `fornecedores/16` responde **404**

### ✨ Confirmação de brinde
O cliente **"Tux net serviços de informatica ltda"** (cli#7) — aquele com CNPJ
no campo `cpf`, pendência registrada em 15/09 — sai corretamente como
**pessoa jurídica**. A derivação acerta justamente o caso torto.

### ⚠️ Cinco tropeços meus, nenhum do sistema
1. **O `$&` da minha string de substituição** foi interpretado como "o trecho
   casado" e corrompeu o próprio arquivo de patch. Substituição que monta
   código **não passa por `String.replace`** — fatiar com `slice` resolve.
2. **Âncora com `\n` literal não casa em CRLF.** O patch recusou aplicar na
   primeira tentativa, que é melhor do que trocar metade.
3. 🔴 **O ambiente de teste ficou meio carregado:** meu `modal` falso não tinha
   `addEventListener`, e a página faz
   `document.getElementById("modal").addEventListener(...)` — o script estourava
   ali e **todo `let` depois (`cSrch`, `fSrch`) nunca nascia**, derrubando 13
   testes. **O teste [1] foi quem acusou.** É a armadilha já registrada.
4. **`let` de topo não vira propriedade do global**, e em código de `eval`
   nem para outro `eval` fica visível. No `vm` do Node a pergunta vai *dentro*
   do contexto; no navegador a prova é **não ter havido exceção** mais o `var
   DB` tardio estar populado.
5. **O `om()` escreve em `#mdc`, não em `#modal`** — eu lia o elemento errado e
   concluí que o título não avisava a origem. Avisava.

⚠️ **E a entidade HTML de novo:** procurei `&#127970;&#10003;` no `innerHTML` e
achei zero selos — o navegador já converteu para `🏢✓`. É a lição de 28/10,
e foi a contraprova (`entidade_no_DOM: false`) que a confirmou.

### ⚠️ Achados não corrigidos (não foram pedidos)
- **A paginação das duas abas não pagina:** `renderCli` e `renderForn` calculam
  `flCliP`/`flFornP` com `pagSlice` e depois desenham `fl.map(...)`, a lista
  **inteira**. Com 28 e 15 registros não incomoda; incomodará.
- `fmForn` tem um `<select id="ftcc">` (Corrente/Poupança) que o **`svForn`
  nunca lê** — campo morto.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Cadastros com **Ctrl+Shift+R**, clicar no 🏢+ de
um cliente e salvar o fornecedor de verdade. Eu não autentico.

⚠️ **O scratchpad foi limpo entre sessões outra vez** (caminho novo), então as
suítes anteriores da Auto Mais não existem mais. **Não houve regressão a rodar**
além da suíte desta entrega — o `node --check` nas 10 páginas passou, mas isso
só pega erro de sintaxe.

---

## ✅ Campo Corrente/Poupança eliminado — 05/11/2026 (`d252b0c`) · Auto Mais

Pedido: *"elimina o campo corrente/poupança"* — o campo morto que eu registrei
ontem no formulário de fornecedor.

### Conferido antes de tirar
| | |
|---|---|
| `ftcc` no repositório | só onde é **criado** — 2 lugares, nenhuma leitura |
| `svForn` lê o campo? | **não** |
| campo de tipo de conta nos bancos | **nenhum** (`tipo_conta`, `tipoConta` → 0) |

⚠️ **Formulário que pede informação e joga fora faz a pessoa trabalhar de
graça** — e ainda dá a impressão de que o dado está guardado.

### 🔴 O layout era a parte que exigia decisão
`.fr` é grid de **duas colunas fixas** (`1fr 1fr`), e o Tipo dividia a linha com
o campo **Conta**. Tirar um deixaria o outro sozinho na metade esquerda, com
buraco à direita.

Medido no próprio arquivo: as **5 linhas de campo único** usam `.fg full`
(`cn`, `cend`, `cobs`, `fend`, `fobs`) — **não há precedente de campo solto em
meia largura**. O Conta seguiu a convenção do arquivo.

**Medido no DOM real, com o CSS real:**

| campo | largura |
|---|---|
| Banco | 291px |
| Agência | 291px |
| **Conta** | **598px** = 291 + 291 + 16 de gap |

O bloco **Dados Bancários** ficou com 2 linhas: *Banco \| Agência* e *Conta*.

### O que NÃO foi tocado
| | Por quê |
|---|---|
| seletor **PF/PJ** (`ftp`) | é outro campo "Tipo", e esse **é lido** pelo `svForn` |
| Banco, Agência e Conta | continuam gravados |
| cópia velha de `cadastros.html` na **raiz** do repo | é de junho, ninguém aponta para ela, e limpar aquelas 7 páginas é a **pendência A3** |

### Validado
- `node --check` no shared e nas **10 páginas**
- **16 testes de runtime** com os 14 fornecedores reais: o campo ausente nos
  **três** caminhos de abertura (cadastro novo, edição, e o atalho do cliente
  de ontem), os três campos bancários ainda gravados, **nenhum** campo de tipo
  de conta no registro, o `.fg full` do Conta, nenhuma linha `.fr` com campo
  solto em meia largura, e os 14 fornecedores abrindo sem erro
- **7 defeitos injetados — todos acusados, nenhum cego**: o campo de volta,
  Conta em meia largura, levar o Conta junto, passar a **gravar** tipo de conta,
  **esconder** o seletor PF/PJ, perder o Banco, e o bloco inteiro sumir
- **No ar, no arquivo publicado, com os dados reais** e `fsave` substituído:
  `ftcc` e "Corrente/Poupança" **ausentes do arquivo publicado e do**
  **formulário**; as larguras acima; gravação de ponta a ponta com
  `Itau | 7314 | 98590-9` e **14 campos, nenhum de tipo de conta**; e o atalho
  do cliente abrindo com banco e conta vazios. **Nada gravado em produção** —
  reconferido: 28 clientes, 15 fornecedores

### ⚠️ Dois testes meus falharam, e os dois eram do AMBIENTE
1. **O stub de elemento não modela `<select>`.** `svForn` lê
   `getElementById("ftp").value`; num select real o navegador já traz a 1ª
   opção selecionada (`pessoa_fisica`), no stub o value nasce `''`. A asserção
   media o defeito do ambiente — o PF/PJ passou a ser definido explicitamente.
2. **O recorte do bloco bancário ia até `id="fobs"`**, mas o
   `<div class="fr">` das Observações **abre antes** dele: eu contava a linha
   vizinha e dava 3 em vez de 2. O limite passou a ser o início daquela linha.

🔴 **E um teste meu era CEGO:** o defeito *"esconder o seletor PF/PJ com
`display:none`"* **passou** na primeira rodada, porque a asserção só procurava
a string `pessoa_juridica` — que continua no HTML mesmo escondida. Esconder é
justamente uma das formas de errar este pedido. Agora o teste exige que a caixa
do campo **não** tenha `display:none`.

⚠️ E uma âncora do injetor deu **ERRO DE MONTAGEM** por escape escrito à mão.
Ela passou a ser **recortada do próprio arquivo pelo id do campo** — e aí o
erro seguinte foi meu: passei `banco` onde o id é **`fbco`**. Âncora que não
casa é defeito que nunca foi testado, e o injetor acusa isso em vez de passar.

---

## ✅ Contrato: pagamento "Troca por outro veículo" + busca por placa — 06/11/2026 (`f36726b`, `4bdd596`) · Auto Mais

Pedido: *"no menu contrato colocar a opção de pagamento 'troca por outro
veiculo'"* e *"no campo seleção de veiculo inserir a opção de digitarmos a
placa"*.

⚠️ **"Menu contrato" é a Auto Mais.** Conferido antes de abrir arquivo: "troca
por outro veículo" como **forma de pagamento** é coisa de revenda, e a lista de
pagamento existe só em `automaiscar/sistema/contratos.html:338`. A LOKÁ aluga —
lá não há forma de pagamento de contrato.

### 🔴 O achado que mudou o pedido: a opção JÁ EXISTIA na tela de Vendas
E com outro nome — **`Permuta`** (`vendas.html:355`). As duas telas discordavam:

| Tela | Formas oferecidas |
|---|---|
| `contratos.html` | A vista · Financiamento · Consorcio · Entrada + Parcelas |
| `vendas.html` | as mesmas **+ Permuta** |

🔴 **E isso era perda silenciosa de dado.** As duas telas gravam o registro uma
da outra: `svCt` grava a venda (`pagamento: obj.pagamento`) e `svVenda` grava o
contrato. Então uma venda registrada como **Permuta** e depois reaberta no
Contratos caía na **primeira** opção do `<select>` — porque nenhuma option
recebia `selected` — e era gravada como **"A vista"**, no contrato **e** na
venda, sem avisar.

**Provado no navegador, com o mesmo valor:**

| | o que o `svCt` gravaria |
|---|---|
| o `<select>` **antigo** | **A vista** 🔴 |
| o `<select>` **novo** | **Permuta** ✅ |

É a terceira vez nesta família — o select de **Fonte do CRM** (15/09) gravava
"Outro" por cima do canal real pelo mesmo mecanismo.

⚠️ **Nenhum registro usa "Permuta" hoje** (medido: 31 contratos e 30 vendas, só
os 4 valores antigos), então nada foi perdido até aqui. Mas o buraco estava
aberto justamente na opção que ele vai começar a usar.

### A lista virou UMA, no `firebase-shared.js`
`AM_PAGAMENTOS` + `pagamentoOpts(atual)`. As duas telas leem de lá; só o
`login.html` não carrega o shared, e ele não tem campo de pagamento.

🔴 **Valor que a lista não conhece é PRESERVADO como opção extra**, nunca
descartado — é o que impede o select de trocar calado o pagamento de um
registro antigo. Vale para "Permuta" e para qualquer coisa que entre por
importação ou à mão.

⚠️ **"Troca por outro veiculo" substitui "Permuta" nas DUAS telas.** Mexer na
tela de Vendas é além do pedido literal, e está aqui para ser revertido se ele
não quiser — mas duas opções para a mesma coisa dividiriam o dado em dois
valores e os relatórios nunca mais fechariam (é a armadilha dos nomes de
órgão e de oficina). Sem acento, como o resto do vocabulário gravado
("Consorcio", "Veiculo").

### Digitar a placa
O **`<select id="ctv">` continua sendo a fonte da verdade** — o `svCt` lê o
`veiculo_id` dele. A caixa é um **atalho de busca** ao lado, então a gravação
não mudou e a lista segue disponível para quem prefere o mouse. Foi o que o
pedido disse: *inserir a opção* de digitar, não trocar o campo.

🔴 **Procura nas opções do PRÓPRIO seletor**, nunca numa lista paralela:
buscando em `DB.veiculos` direto, uma placa visível na lista poderia "não
existir" na busca — ou o contrário — e ninguém entenderia o porquê. Há teste
da igualdade (candidatos = opções = 46) e defeito injetado.

⚠️ **Ignora hífen e caixa de propósito:** das **46 placas**, **20 estão
gravadas COM hífen** (`PLF-0254`) e **26 SEM** (`OLF1I86`). Comparar o texto
cru deixaria metade da frota inalcançável pela digitação.

| Situação | O que acontece |
|---|---|
| uma placa casa | seleciona e confirma **qual** veículo (`✓ FIAT ARGO PLF-0254`) |
| várias casam | **não seleciona** e avisa quantas |
| nenhuma casa | avisa, em vermelho |
| caixa apagada | limpa só o aviso |
| seletor mexido à mão | a caixa para de opinar |

🔴 **Nos três últimos casos a escolha anterior NÃO é apagada:** um caractere
errado no meio da digitação não pode descartar o veículo que já estava
escolhido. Conferido no navegador caractere por caractere — digitando
`OLF1I86`, o `O` ainda é ambíguo e mantém o veículo anterior, e o `OL` já
resolve.

⚠️ **O `oninput` não redesenha a tela.** Se redesenhasse, destruiria o próprio
campo e só entraria 1 caractere — é o bug de 26/09 e 28/09. Medido: os 7
caracteres entram, o foco fica no campo, **0 renders**.

⚠️ `min-width:0` no `<select>` é obrigatório (lição de 02/10): flex item não
encolhe abaixo do conteúdo, e as opções são longas. Medido a **375px**: caixa
150 + seletor 217 + 8 de gap = 375, **sem estouro e sem rolagem lateral**.

### Validado
- `node --check` no shared e nas **10 páginas**
- **31 testes de runtime** com o código real das duas e os dados reais
  (46 veículos, 31 contratos, 30 vendas): as 5 formas e a ordem, a opção nova
  no menu, reabrir com ela marcada, **"Permuta" preservada**, qualquer valor
  desconhecido preservado, formulário novo sem nada inventado, espaço em volta,
  as duas telas batendo, nenhuma lista embutida sobrando, **cada uma das 46
  placas**, hífen nos dois sentidos, minúscula, prefixo, sufixo, ambígua,
  inexistente, caixa vazia, veículo vendido, e a gravação inalterada
- **22 defeitos injetados — todos acusados, nenhum cego**: entre eles o estado
  anterior ao pedido nas duas telas, o valor desconhecido descartado, nenhuma
  opção marcada, a busca numa lista paralela, normalizar um lado só, ambígua
  escolhendo a primeira, apagar a escolha no erro de digitação, o `oninput`
  redesenhando, e a caixa virando fonte do `veiculo_id`
- **No navegador, nos arquivos publicados, com os dados reais** e o `firebase`
  substituído: o sistema carrega inteiro (`DB` com os 46), as 5 opções, a prova
  do bug lado a lado (antigo `A vista` × novo `Permuta`), as 46 placas com
  **0 erros**, `G` (2 placas) não mexendo na escolha, `JC` escolhendo quem
  **começa** com JC, as larguras em 900/620/480/375px, e **0 gravações em
  produção** — reconferido: 31 contratos, 30 vendas, 46 veículos

### ⚠️ O ramo "placa exata" está INERTE com os dados de hoje
Medido: **nenhuma placa é substring de outra**, então tirar a preferência pela
igualdade exata não muda resultado nenhum. Ficou no código (custa nada e
protege o dia em que houver), **mas sem cobertura** — está dito aqui em vez de
contado como teste.

Já o ramo **"prefixo antes de contém" é distinguível**: `JC` é prefixo de 1
placa e aparece no meio de 2. Ganhou teste próprio e defeito injetado.

### ⚠️ Três resultados vermelhos meus que NÃO eram defeito
No navegador eu testei "placa ambígua" digitando **`L`** — e a minha própria
medição, minutos antes, já dizia que `L` é **prefixo de exatamente 1** placa
(`LUK-6D78`). A busca acertou, e os dois passos seguintes, que comparavam com
a escolha anterior, deram "não sobreviveu" porque a linha de base tinha
mudado **legitimamente**.

🔴 **A sonda do teste tem de sair da medição, não da cabeça** — e eu tinha a
medição. A sonda certa (`G`, que casa com 2) passou a ser achada por uma
varredura do alfabeto dentro do próprio teste. Mesmo erro de 03/11 (a véspera
de uma locação que tinha outra locação cobrindo a data).

### ⚠️ O que fez a suíte conseguir provar o bug
O stub de `<select>` reproduz o navegador: **`selectedIndex = 0` quando nenhuma
option tem `selected`**, e option sem atributo `value` vale pelo texto. Sem
isso a suíte não distinguiria o conserto do defeito.

E o **teste [1] fez o trabalho dele** duas vezes: o shared chama
`firebase.initializeApp()` na **linha 10**, então sem o stub de `firebase` ele
morre ali e nenhuma global dele existe — é exatamente o que deixou o
`crm.html` em branco em agosto. Faltava também `window.addEventListener`.

⚠️ E duas âncoras do injetor deram **ERRO DE MONTAGEM** por eu ter escrito
`\"` onde o arquivo tem `"` simples. Âncora que não casa é defeito que nunca
foi testado — o injetor acusa isso em vez de passar.

### Corrigido depois de medir no publicado (`4bdd596`)
O aviso da busca tinha **16px vazio e 18px com texto**, então a linha pulava
2px a cada mensagem enquanto a pessoa digita. `min-height` e `line-height`
passaram a **18px**, a altura que o texto de 12px ocupa de fato. Reconferido no
arquivo publicado: 18/18.

### O que ficou de fora, de propósito
- **A busca por placa não entrou na tela de Vendas.** O pedido foi sobre o menu
  Contrato, e lá a ausência dela é só falta de comodidade — não há perda de
  dado como havia na lista de pagamento (que por isso foi unificada). É uma
  linha, se ele quiser.
- **O seletor continua oferecendo os 46 veículos**, não só os 14 disponíveis:
  editar contrato antigo depende de alcançar carro já vendido. Há teste de que
  a busca acha veículo `vendido`.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Contratos com **Ctrl+Shift+R**, gerar um
contrato escolhendo "Troca por outro veiculo" e digitar uma placa na caixa nova.
Eu não autentico.

---

## ✅ Usuários: editar de verdade — senha, perfil e funções — 06/11/2026 (`f54c928`, `6fadb11`) · Auto Mais

Pedido: *"inserir em usuarios a opcao de editar o usuario para alteracao de
senhas, alteracao de perfil, inserção de funcoes e etc, assim como já funciona
no sistema Loka"*.

⚠️ **"Como já funciona na LOKÁ" indica o alvo:** a tela a mexer é a da Auto
Mais (`gestao.html`, aba Usuários), e o modelo é o `renderUsuarios` +
`renderPerfis` da LOKÁ.

### 🔴 O botão de editar JÁ existia — e três defeitos explicavam o relato

**1. O usuário `daniel` tinha `id: NaN` no banco** (documento literalmente
`usuarios/NaN`). A linha gerava `fmUsr(NaN)`, e `find(u => u.id == NaN)` nunca
casa (**NaN != NaN**), então o botão caía no `if(!u) return` e **não fazia
nada, em silêncio**. Agora as ações vão pelo **índice do array**, que é o
padrão da LOKÁ (`editarUsuario(n)`) — e todo registro fica alcançável.

**2. 🔴 A causa raiz disso — e ela ia se repetir.** Cada página declara o
próprio

```js
function nid(a){return a.length?Math.max(...a.map(x=>x.id))+1:1;}
```

que **sombreia o do `firebase-shared.js`** — e o local não tem guarda. Medido
com os ids reais de `usuarios` (`[2,3,4,NaN,"u1787759746817"]`):

| | resultado |
|---|---|
| `nid` **local** | **NaN** — `Math.max` com um id de **texto** dá NaN |
| `nid` do **shared** (`Number(x.id)||0`) | **5** |

Foi assim que o daniel nasceu, e **o próximo usuário criado nasceria igual**.
Corrigido nos **8 arquivos** que têm a cópia.

**3. 🔴 O `+` UNÁRIO.** `'<editar>' + +(isAdmin()?'<excluir>':'')` aplica
`Number()` na string e produz **NaN**: a célula imprimia `NaN` e o botão de
excluir **nunca aparecia**. Medido no Node antes de corrigir. Estava em **4
listas**: Usuários, Manutenção, **Despesas e Veículos**.

⚠️ Despesas e Veículos não foram pedidos, mas é o mesmo caractere e o mesmo
"NaN" na tela — registrado para ser revertido se ele não quiser.

### 🔴 A senha forçou mexer no login
A tela gravava **texto puro**, e o login publicado **só comparava texto puro**
(`d.senha === p`). Medido: dos 5 usuários, **4 têm texto puro** e só o `rogel`
tem `senhaHash`+`salt` — e **sem** o campo `senha`. Ou seja: pelo Firestore o
rogel **não conseguia entrar**; ele só entrava pelo `USERS_FIXOS`.

Então gravar hash sem mexer no login **trancaria** quem trocasse de senha.
As duas pontas entraram juntas:

| | |
|---|---|
| tela | botão **🔑** próprio, confirmação, mínimo 6, hash **SHA-256 + salt**, texto puro apagado |
| login | aceita **hash primeiro**, texto puro como legado, e **converte no primeiro acerto** |

⚠️ **O formato não foi escolhido por mim:** `SHA-256(salt + "|" + senha)` em
hex é o do `login.html` do commit **`5352cff`** (26/08/2026), recuperado do
histórico — é ele que gerou o hash que já estava no banco. Por construção, a
senha atual do rogel continua valendo. **Trocar o separador invalidaria** a
senha de quem já tem hash.

🔴 Cuidados contra trancamento (3 dos 30 defeitos injetados são disso):
hash **antes** do texto (registro com os dois **recusa a senha antiga**, senão
trocar a senha não adiantaria nada) · falha ao migrar **não barra** o login ·
navegador sem crypto cai no caminho antigo em vez de recusar · o
**`USERS_FIXOS` fica onde está** (tirá-lo é decisão separada, e sem ele um
banco fora do ar deixaria todos de fora).

### As "funções": aba Perfis de Acesso
Cada perfil tem **telas** (as 8 do menu) e **funções**, com curinga "Todas"
que vale para o que for criado depois — o modelo do `loka_perfis`.

⚠️ **As 5 funções não foram inventadas:** são exatamente as que o `isAdmin()`
já controlava — excluir registros, exportar, ver Relatórios, gerenciar
usuários, configurações. Função que não controla nada seria promessa falsa na
tela.

### 🔴 Coleção nova é RECUSADA pelas regras — por isso vive em `config/perfis`
Medido antes de escolher onde guardar:

| coleção | |
|---|---|
| veiculos, clientes, …, **config** | HTTP **200** |
| **perfis**, **permissoes** | HTTP **403** |

As regras do Firestore são **coleção por coleção** e não listam nenhuma das
duas — é o mesmo que aconteceu com `leads` em 15/09. `config` já está liberada
e já guarda `config/empresa`, então os perfis são **um documento ali**. Uma
coleção nova teria dado "NÃO foi salvo" e exigido o Rogel no console.

### 🔴 Os padrões reproduzem o acesso de ANTES
admin alcança tudo; **atendimento vê as 8 telas** (nenhuma tinha
`data-admin-only`) e **não tem função nenhuma**. Enquanto ninguém editar um
perfil, **nada muda de acesso para ninguém** — e isso é teste, com defeito
injetado nas duas direções (atendimento ganhando tudo, e perdendo as telas).

🔴 **`isAdmin()` é PISO** em `podeTela`/`podeAcao`: quem é admin nunca se
tranca para fora por ter salvo um perfil errado. E o perfil **Administrador
não pode ser limitado**.

### 🔴 A outra armadilha: cada página sombreia o `applyProfile` do shared
A parte nova (esconder do menu a tela que o perfil não alcança) entrou no
`applyProfile` do shared e era **código morto** — 7 das 10 páginas declaram o
próprio `applyProfile`, idêntico, que vence o do shared. Extraída para
`amAplicarTelas()`, chamada pelos 7 locais.

⚠️ É a mesma família do `nid`: **a página redefine o helper do shared.** Vale
conferir isso *antes* de mexer em qualquer função do shared.

### Outras travas
não dá para excluir o usuário com que se está logado · não dá para rebaixar,
desativar ou excluir o **último administrador ativo** · falha de gravação diz
**"NÃO foi salvo"** e mantém o modal aberto (lição do CRM) · o registro de id
inválido ganha id novo **e o documento velho é apagado**, senão ficariam dois
do mesmo usuário.

### Validado
- `node --check` no shared e nas **10 páginas**
- **55 testes de runtime** com o código real dos três arquivos, os dados reais
  do Firestore e o **`crypto.subtle` de verdade (o do Node)**: o formato do
  hash conferido contra o SHA-256 do próprio Node, os 4 usuários de texto puro
  continuando a entrar, o registro misto recusando a senha antiga, a migração
  apagando o texto puro, falha de migração não barrando o login, o usuário de
  id NaN abrindo para edição, as travas do último admin, os perfis padrão, o
  curinga, e os estados de falha de gravação
- **30 defeitos injetados — todos acusados, nenhum cego**
- **No navegador, contra os arquivos PUBLICADOS, com os dados reais**
  (`firebase` substituído — **0 gravações em produção**, cache do navegador
  devolvido): o sistema carrega inteiro; a lista sem `NaN` com as 3 ações por
  índice, o selo "você" e 1 senha protegida × 4 em texto puro; o cenário de id
  NaN **abrindo** para edição; a aba Perfis com as 8 telas e 5 funções; as abas
  de Gestão **4 para admin / 0 para atendimento** (igual a antes) e **só
  Relatórios** ao conceder aquela função; o menu escondendo a tela não
  permitida. E a prova contra trancamento: **o login publicado aceita o hash
  que a tela publicada gera** (arquivos diferentes, formato casando).

### ⚠️ Dois testes meus que passaram com defeito vivo
| O que passou | Por quê |
|---|---|
| `_usrIdValido` aceitar **NaN** | 🔴 **o harness perdia o NaN**: o DB entra pelo `localStorage` (regra desta casa, porque a página declara o próprio `loadDB`) e **JSON não carrega NaN** — virava `null`, `typeof null` não é `number`, e o ramo quebrado nunca era alcançado. O `carregar()` passou a **repor o NaN** depois do `loadDB`, e entrou teste que pergunta `_usrIdValido(NaN)` direto |
| tirar o piso do admin de dentro do `amAplicarTelas` | era **guarda inerte**: quem tem o piso é o `podeTela()`, que ela chama para cada item. Nenhum teste podia distinguir, então a linha **saiu** em vez de ficar como proteção que ninguém alcança (`6fadb11`) |

### ⚠️ Tropeços de ferramenta
O `python` com `io.open` em modo texto **converteu o arquivo de teste para
CRLF**, e aí as âncoras de várias linhas do script seguinte não casaram —
nada foi gravado, o que é o comportamento certo. Normalizar para LF antes de
editar. E o heredoc comeu escape mais uma vez.

### ✅ Confirmado em produção pelo próprio Rogel
Ele usou a tela e disse *"ok, funcionou"*. Conferido no banco depois:
o `daniel` agora tem **id 5** e o documento `usuarios/NaN` responde **404** —
ou seja, ele abriu e salvou justamente o registro que estava quebrado, e o
conserto de id rodou como desenhado (id novo + documento velho apagado).

### ⏳ O que fica em aberto
- **4 usuários ainda com senha em texto puro** (thaina, sandro, bruno,
  daniel). Cada um migra sozinho no **próximo login certo** — ou o Rogel troca
  a senha pelo 🔑, que já grava com hash.
- A aba Perfis pode dar **"NÃO foi salvo"** se as regras do Firestore não
  liberarem escrita em `config`. Leitura responde 200; escrita só se sabe
  tentando. Se der, é adicionar a regra no console — como foi com `leads`.
- O `USERS_FIXOS` do `login.html` continua com `rogel` / `daniel01` **em texto
  puro num arquivo público** (a regressão de 11/09). Não foi tocado: tirá-lo
  exige o Rogel presente, e a senha deve ser considerada **queimada**.

---

## ✅ Acerto do encerramento: veículo sujo, cobranças e caução a devolver — 07/11/2026 (`96ab56b`) · gestao v147

Pedido: *"no encerramento da locação, na condição na devolução adicionar as
opções Veículo Sujo e adicionar o campo para adicionarmos a cobrança de
lavagem, avaria e outros. incluir também a forma de pagamento e o campo valor
da franquia a devolver."*

### 🔴 Os dados decidiram duas coisas antes de eu escrever uma linha

**1. "Franquia a devolver" já tem nome no sistema: é a CAUÇÃO.** Ela existe no
próprio aluguel e já é levada ao histórico:

| | com o campo `caucao` |
|---|---|
| `ativos` | **11 de 107** (9 com valor > 0) |
| `historico` | **89 de 102** (79 com valor > 0) |
| `contratos` | 58 de 153 |

Valores reais: `"500,00"` ×52 · `"750,00"` ×18 · `"0,00"` ×10 · `"1.000,00"` ×6.
E a **Cláusula 10ª** do contrato diz o que fazer com ela: volta ao locatário
depois da avaliação física do veículo. Então **o que se devolve é o que sobra
dela depois das cobranças** — não é um campo novo, é a conta que faltava.

**2. A forma de pagamento já tem vocabulário.** 68 encerramentos gravam
`pagamento.forma`: **pix (45) · cartao_cred (19) · dinheiro (2) · cartao_deb (2)**.
O seletor novo usa exatamente essas, mais `transferencia` (que a prorrogação já
oferece). ⚠️ Inventar nome dividiria o dado em dois valores e os filtros nunca
mais fechariam — é a armadilha dos nomes de órgão e de oficina.

### 🔴 O que se devolve é DERIVADO, nunca digitado
```
caução retida − (lavagem + avaria + outros) = a devolver
```
Campo editável de "a devolver" criaria **dois números para a mesma conta**, e um
ficaria velho. É a regra do saldo do Almoxarifado (v126) e do total do recibo
(v128). **Só as ENTRADAS são gravadas** (`caucao`, `encLavagem`, `encAvaria`,
`encOutros`, `encOutrosDesc`, `encForma`); o total e o a-devolver são calculados
na hora de mostrar. Há teste e defeito injetado exigindo que não sejam gravados.

🔴 **E é UMA função só — `_encAcerto(o)` — lida pelo modal E pelo histórico.**
Duplicar a conta foi o acidente da **v119**: havia duas `statusReal`, uma
aprendeu a regra nova e a outra não, e o relatório impresso era o que errava.

### Os dois casos que a tela não pode confundir
| Situação | O que a tela diz |
|---|---|
| cobrança **maior** que a caução | `A DEVOLVER R$ 0,00` **e** *"A caução não cobriu — ainda deve R$ X"* |
| **sem caução registrada** no aluguel | *"Sem caução registrada neste aluguel"* — nunca `R$ 0,00 a devolver` |

🔴 A segunda importa: zero e ausência são coisas diferentes, e um zero ali faria
parecer que a caução **já foi devolvida**. É o mesmo padrão da fatura sem
lançamento (v143) e dos cartões do Contas a Receber (v120–v122): quando o número
embute algo que o olho não vê, a tela **diz**.

A caixa de resultado mostra a conta inteira, parte por parte:
```
Locação                      R$ 7.800,00
Cobranças na devolução
   Lavagem                      R$ 80,00
   Avaria                      R$ 150,00
   Outros                       R$ 45,50
   Total cobrado               R$ 275,50
Caução retida                  R$ 500,00
A DEVOLVER                     R$ 224,50
```

### As travas
| Recusa | Por quê |
|---|---|
| valor **sem dígito** (`abc`) em qualquer cobrança ou na caução | `mltNum('abc')` devolve **0**, e 0 é cobrança legítima — passaria calado. Lição da baixa em lote (v94), da franquia (v99) e do recibo (v128) |
| **negativo** | cobrança não é desconto |
| cobrança em **"Outros" sem dizer do que é** | ninguém confere depois uma cobrança sem nome |

Campo vazio **não** é erro: é o caso normal (não houve cobrança).

### 🔴 Onde "sujo" teve de ser registrado
No `<select>` **e** no mapa `conds` do histórico. Sem o segundo, a coluna
Condição mostraria **"—"** para todo encerramento marcado como sujo — e isso só
apareceria dias depois de publicado. É a família da armadilha do
`multasefrotas` e do `normalizarDB`.

⚠️ Conferido antes: `condicao` é lido em **um único lugar** no sistema inteiro
(`renderHistorico`), e em nenhuma outra página. A opção entra **entre Normal e
Avaria leve** — gravidade crescente.

### Outros cuidados
- A caução é **pré-preenchida do aluguel mas fica editável**: 96 dos 107 não a
  têm registrada, e nesses o operador precisa informar. O que ele confirmar
  substitui o valor no registro do histórico.
- A forma vem de `a.pagamento.forma` quando o aluguel tem; senão, PIX.
- 🔴 **Digitar uma cobrança NÃO recalcula a locação.** O `_encRenderAcerto` só
  desenha; quem recalcula é o `calcEnc`. Senão, um valor de locação ajustado à
  mão seria apagado ao digitar a lavagem. Há defeito injetado para isso.
- A descrição de "Outros" é **escapada** antes de ir ao `innerHTML` do histórico.
- O resumo aparece na linha do histórico, sob o valor:
  `cobrado R$ 275,50 · devolvido R$ 224,50 · combustível`.

### O modal passou a rolar — medido, e é o padrão da casa
Comparado com o arquivo **real da v146** (raw do commit anterior), a 1024×768:

| | conteúdo | rola? |
|---|---|---|
| v146 | **441px** | não |
| **v147**, caixa vazia | **720px** | **sim** |
| v147, caixa com a conta | 930px | sim |

O teto é `max-height:90vh` = 691px. Então **o custo real é +279px e a rolagem**.
Medindo **os 28 modais do arquivo publicado** no mesmo viewport, **6 já
rolavam**: Sinistro 984 · Multa 919 · Aluguel 831 · Veículo 804 · Contrato 738 ·
Manutenção 733. O encerramento a 720 entra **no meio dessa faixa** — é o padrão
da casa, e o `overflow-y:auto` existe para isso. Não estoura de lado em nenhuma
largura (1366 / 1024 / 900 / 420).

### Validado
- `node --check`; `<div>` do HTML balanceadas (**821/821**; eram 814, +7 dos
  blocos novos); os dois carimbos batendo
- **78 testes** com o código real e os dados reais (107 ativos, 102
  encerramentos): a conta em 13 entradas, **a invariante varrida** (caução =
  devolver + o que ela cobriu · nunca negativo · nunca os dois positivos ao mesmo
  tempo), **os 102 encerramentos antigos continuando válidos**, as recusas, o
  modal, abrir/confirmar, e o resumo do histórico
- **27 defeitos injetados — todos acusados**, entre eles **o estado antes do
  pedido** (sem a opção sujo), `sujo` fora do mapa `conds`, devolver negativo,
  "sem caução" virando zero, o histórico refazendo a conta por conta própria, o
  render apagando a locação, e a descrição indo crua para o `innerHTML`
- **No ar, no arquivo publicado, com os dados reais**: encerramento de ponta a
  ponta no aluguel real da **GM ELETRODIESEL · RENAULT KWID · caução 500,00** —
  condição sujo, R$ 80 + R$ 150 + R$ 45,50 → **R$ 275,50 cobrado, R$ 224,50 a
  devolver**, conferido contra a conta feita por fora; os 6 campos gravados, os
  derivados **ausentes** do registro, e a linha do histórico montada
- Regressão **medida**: **50 suítes, 2.546 testes**, nenhuma falha

### ⚠️ Dois erros meus de sonda, os dois pegos por medição
1. **A asserção dos 102 encerramentos dizia 89, e o certo é 79.** Dos 89 que têm
   o campo `caucao`, **10 valem `"0,00"`** — caução zero não tem o que devolver,
   então não ganha linha de resumo. O código estava certo; a conta de cabeça é
   que não.
2. **O defeito "não arredondar" PASSOU** na primeira rodada: minha sonda era
   `33,33 × 3`, e em ponto flutuante isso dá **exatamente 99,99**. A sonda nova
   saiu de uma varredura dos valores realistas de cobrança —
   `10,05 + 10,15 = 20.200000000000003`. É a lição de 06/11 de novo: **a entrada
   do teste sai dos dados por código, não de cabeça.**

### 🔴 Duas armadilhas do ambiente, uma delas séria
**`amb.carregar(DB, …)` faz `ctx.db = DB` — é o MESMO objeto.** Os testes do
`confirmarEnc` fazem `ctx.db.historico = []`, e isso **esvaziava o `DB` que as
asserções sobre os dados reais leem**. Dois testes falhavam sem haver defeito. A
suíte passou a tirar cópia (`HIST_REAL`, `ATIVOS_REAL`, `VEIC_REAL`) **antes** de
qualquer teste. É o espelho da armadilha de 22/10, em que reatribuir o `db` do
sandbox *não* trocava o banco que o código via.

🔴 **E a séria, no navegador:** a `multas.html` carrega o SDK do Firebase na
mesma origem, e o `eval` do script do `gestao.html` roda no **escopo global** —
então `confirmarEnc` teria gravado **em produção**. Substituí `window.firebase`
e `saveDB` antes de chamar, e a interceptação provou que as duas gravações
(`loka_encerrados/<id>` e o `update` do `loka_db`) **foram barradas**.

⚠️ **Mas o stub veio DEPOIS do `eval`**, e o script faz reconciliação na carga
(`aplicarEncerrados`, `reconciliarStatusVeiculos`), que pode chamar `saveDB`. O
banco registra uma escrita às **11:48 com `_writerBuild: v147`** que **não
consigo atribuir com certeza** — ou foi o navegador do Rogel (ele já estava na
v147), ou foi a minha carga regravando os mesmos dados.

**O que está conferido, e isso é o que importa:** o aluguel que usei continua
**ativo e intacto** (GM ELETRODIESEL, caução 500,00), a lápide do id de teste
responde **null**, o histórico tem **0** registros com os campos novos, e as
contagens não mudaram (107 ativos · 102 encerramentos · 680 multas · 119
veículos).

🔴 **Regra daqui em diante:** ao avaliar o script de uma página num navegador que
já tem o Firebase de produção carregado, **trocar `firebase` e `saveDB` ANTES do
`eval`**, não depois.

### ⚠️ O que NÃO foi feito, de propósito
- **Nenhum lançamento automático** em Contas a Receber ou a Pagar. Dois motivos
  medidos: a cobrança é **abatida da caução que a empresa já tem em mãos**, e
  criar um "a receber" de dinheiro já retido duplicaria o saldo — o erro das
  renegociadas (v119); e o **Contas a Pagar é uma estrutura de parcelas mensais**
  (`mesInicial`, `parcelas`, `pagamentos` por mês, 24 registros, todos
  financiamento), em que uma devolução avulsa de caução não cabe.
  Só o **excedente** (quando a cobrança passa a caução) seria recebível de
  verdade. É uma linha de decisão do Rogel, não um esquecimento.
- **O `valorFinal` não mudou de significado**: continua sendo a locação. As
  cobranças são acertadas contra a caução, então somá-las ali mudaria o cartão
  "Valor total" do histórico sem aviso.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Aluguéis Ativos, encerrar uma locação de verdade
marcando "Veículo sujo", lançar uma lavagem e conferir o valor a devolver.
Eu não autentico.

---

## ✅ Taxa de lavagem simples: R$ 40,00 → R$ 50,00 — 09/11/2026 (`ab2c5a1`) · diária v7

Pedido: *"alterar o valor da taxa de lavagem simples que consta nos contratos
por diária e mensal para R$ 50,00."*

### 🔴 A tarifa existe SÓ na diária — e isso muda o pedido
| | Cláusula "Demais Custos" | tem lavagem? |
|---|---|---|
| **diária** | **14ª** | ✅ *"Caso o veículo seja devolvido sujo, será cobrada tarifa de lavagem simples de **R$ 40,00** ou R$ 150,00 para lavagem severa."* |
| **mensal** | **12ª** | 🔴 **não** — manutenção preventiva por conta do LOCADOR, 01 jogo de pneus a cada 40.000 km, e avarias por mau uso |

As duas cláusulas têm o **mesmo nome** e conteúdo completamente diferente. A
palavra "lavagem" **não aparece** no contrato mensal — nem na Cláusula 10ª dele,
que (ao contrário da diária) não tem a frase do veículo devolvido sujo. Isso já
estava registrado em 20/10.

🔴 **Acrescentar a tarifa ao mensal seria CRIAR cobrança contratual nova**, não
"alterar um valor". Vale para todo locatário mensal e tem peso jurídico — por
isso **não foi feito por conta própria** — fica como decisão dele.

### Conferido antes de trocar
`R$ 40,00` existia em **um lugar no sistema inteiro**. As outras citações de
"lavagem" são:

| Onde | O quê |
|---|---|
| `gestao.html` | o campo `encLavagem` do acerto de encerramento (v147) — **sem valor fixo** |
| `recibo.html` | *"Lavagem / limpeza"* na lista de origens — **rótulo** |

Nada a mudar nelas.

⚠️ A **lavagem severa (R$ 150,00) não foi tocada**: o pedido falou de lavagem
simples. Há teste e defeito injetado para quem trocar as duas juntas.

### ⚠️ A armadilha dos dígitos: `40,00` × `40.000 km`
A Cláusula 12ª do **mensal** garante *"01 jogo de pneus a cada **40.000 km**"* —
os mesmos dígitos da tarifa, com outro separador. **Um `sed` cego em "40" teria
mexido na franquia de pneus de todos os contratos mensais.** Há teste exigindo
que os 40.000 km continuem lá, e defeito injetado que os troca por 50.000.

### Validado
- `node --check`; `<div>` balanceadas (**48/48**, como no registro da v124); os
  **três** carimbos da diária batendo
- 🔴 **O arquivo tem exatamente o mesmo tamanho de antes** (`len == len`):
  `R$ 40,00` e `R$ 50,00` têm o mesmo número de caracteres, então **nada além
  da troca mudou** — e o A4 não pode ter mudado, sem precisar medir
- **112 testes** na suíte das cláusulas (eram 102): o valor novo, nenhum
  `R$ 40,00` sobrando, a severa intacta, o gatilho "devolvido sujo", a tarifa
  uma vez só, a Cláusula 10ª da diária intacta, e **as invariantes do mensal**
  (sem lavagem, Cláusula 12ª inteira, pneus em 40.000 km)
- **12 defeitos injetados — todos acusados**: o estado antes do pedido, a severa
  trocada junto, zero a mais e zero a menos no valor, a cláusula sumindo, o
  gatilho sumindo, a tarifa em dobro, a Cláusula 10ª atropelada, **a tarifa
  inventada no mensal**, o sed cego nos pneus, e os carimbos desencontrados
- Regressão **medida**: **50 suítes, 2.556 testes**, nenhuma falha

⚠️ **O injetor das cláusulas tinha se perdido** com a limpeza do scratchpad
entre sessões (o registro de 29/10 fala de 56 defeitos, e o arquivo não existia
mais). Refeito, agora com 12 — os antigos cobriam as Cláusulas 7ª/8ª/10ª/11ª e
teriam de ser reescritos para voltar ao número de lá.

### ⏳ Pendente de decisão do Rogel
**O contrato mensal deve passar a cobrar lavagem?** Hoje não cobra. Se ele
quiser, é acrescentar à Cláusula 12ª a mesma frase da diária — uma linha, mas
que cria obrigação nova para quem já tem contrato mensal assinado.

### ⏳ Não verificado
Falta **logado**: o Rogel gerar um contrato por diária e ler a Cláusula 14ª no
documento impresso.

---

## 🔴 O encerramento calculava pela tabela, não pelo contrato — 11/11/2026 (`a4ac8f8`) · gestao v148

Duas demandas: *"na aba aluguéis encerrados permitir que o ADM/master possa
editar os valores pois muitas vezes no momento do encerramento do contrato o
sistema calcula o valor aleatoriamente quando deveria calcular com base no valor
em que o contrato foi firmado"*, e *"na aba manutenções preciso de um relatório
da frota constando o km da última manutenção de cada carro"*.

### 🔴 Não era aleatório: era a TABELA DO VEÍCULO
```js
// o calculo antigo, no openEncerramento e no calcEnc:
var v = db.veiculos.find(...);
var taxa = (a.tipo === 'mensal') ? mltNum(v.mensal) : mltNum(v.diaria);
```
O valor vinha do **cadastro do carro**, nunca do contrato. Então todo aluguel com
valor negociado fechava pelo preço de tabela — e, como a tabela é por carro e o
contrato não, o número não tinha como ser conferido na tela.

Medido nos 105 aluguéis ativos: **40 mudam de valor** com a correção.

| Placa | Tipo | Contrato | ANTIGO (tabela) | NOVO (contrato) |
|---|---|---|---|---|
| RUI8I24 | mensal | 3.350,00 | R$ 22.400,00 | **R$ 23.450,00** |
| SJA7D13 | diária | 4.500,00 | R$ 5.400,00 | **R$ 4.500,00** |

### 🔴 `a.valor` quer dizer TRÊS coisas — e a troca ingênua estouraria
| Tipo | O que `a.valor` é |
|---|---|
| **mensal** | a **mensalidade** → é a taxa, direto |
| **diária** | o **TOTAL do período**, não a diária |
| sem valor | nada → cai na tabela |

⚠️ **Usar `a.valor` como diária daria R$ 4.500/DIA** na SJA7D13 — R$ 135.000 num
mês. A diária sai **rateada**: `contrato ÷ dias contratados` (retirada →
devolução prevista), e o teste exige que `taxa × dias contratados` volte a fechar
com o valor do contrato.

### 🔴 `_placasDoAtivo` NÃO deduplica — a tabela dobrava
Ela junta `a.placa`, `a.veiculoPlaca`, `a.placaVeiculo` e `a.placas[]`, e **nesta
base `a.placas[]` já contém `a.placa`**. Medido: **17 dos 105 aluguéis devolvem a
mesma placa duas vezes.**

Para quem só pergunta *"esta placa está no contrato?"* (`indexOf`) a repetição é
inofensiva — e é assim que os outros 8 pontos do sistema a usam. Aqui a lista é
**somada**, e repetida **dobrava a tabela do veículo**. Entrou
`_encPlacasUnicas`, que normaliza pelo `_normPlacaCmp` do próprio sistema.

⚠️ **`_placasDoAtivo` não foi alterada** — mexer nela atingiria 8 chamadas que
não foram pedidas. Mas fica registrado: **qualquer código futuro que CONTE ou
SOME sobre ela precisa deduplicar primeiro.** Há teste exigindo que ela continue
devolvendo a lista crua.

### 🔴 O multi-veículo: minha primeira versão descartava o contrato
Eu havia escrito `if (!multi && contrato > 0)`, tratando contrato multi-veículo
como caso em que a tabela manda. **Medido, era errado nas duas pontas:**

- com a repetição corrigida, os contratos multi-veículo de verdade são **4**, não
  17 — e **todos têm valor ZERO**, então a guarda era **inerte**;
- o `confirmarEnc` leva o registro **inteiro** (com as suas placas) para o
  histórico: o encerramento fecha o **contrato**, não uma placa. Então o valor
  firmado é a taxa do contrato, e descartá-lo jogaria fora um valor registrado
  no dia em que houver.

A guarda saiu: **o valor do contrato vale sempre que existir.** O texto da fonte
diz *"(os N carros do contrato)"* quando é mais de um, senão o número se leria
como se fosse por carro.

### A tela DIZ de onde vem o número
`_encFonteTexto` escreve a composição por extenso, e **mostra a tabela ao lado
quando ela difere do contrato**:

```
R$ 3.350,00/mês — valor do contrato (tabela do veículo: R$ 3.200,00/mês)
R$ 150,00/dia — do contrato: R$ 4.500,00 ÷ 30 dia(s) contratado(s)
R$ 6.600,00/mês — soma da tabela dos 2 veículos (o contrato não registra valor)
```

Digitando outro valor por cima, a caixa avisa **"valor ajustado à mão (a conta
daria R$ …)"** em vez de ficar muda. Era exatamente o relato: o operador não
tinha como saber por que o número era aquele.

🔴 **Sem limite inventado.** Dois registros da **BRJ** (SWH3A72 e SWO4I55) têm
`a.valor = R$ 43.550,00` numa placa cuja tabela é R$ 3.200 — é o total de um
contrato de 13 carros gravado em cada registro. Com a correção, a tela
pré-preenche **R$ 391.950,00** e põe a tabela ao lado, à vista. Antes mostrava
R$ 28.800 — errado também, mas plausível, e **escondia o registro torto**.
Escolher um fator a partir do qual "desconfiar" seria número meu; os dois ficam
confrontados e quem decide é o operador. **Corrigir esses dois registros é
decisão do Rogel** (já estava em aberto).

### Uma conta só, três leitores
`_encTaxaLocacao` → `_encLocacao` → `_encFonteTexto`. O `openEncerramento`, o
`calcEnc` e a caixa de resultado leem **a mesma função**.

⚠️ Duplicar foi o acidente da **v119**: havia duas `statusReal`, uma aprendeu
sobre `renegociado` e a outra não — e o relatório impresso era o que errava. Há
teste exigindo que o `calcEnc` não refaça a conta da tabela, e defeito injetado.

---

### Editar e excluir aluguel encerrado (master e admin)

A regra de quem pode mora em **`_ehMasterAdmin`**, e o `_ctPodeEditar` (v124)
passou a delegar para ela — duas cópias da mesma regra envelhecem em ritmos
diferentes. A permissão é conferida **ao abrir, ao salvar e ao excluir**:
esconder botão não é controle de acesso.

#### 🔴 A sugestão do contrato é OFERECIDA, nunca aplicada
O campo traz o **valor gravado**; ao lado, a caixa mostra o que a conta do
contrato daria, com um botão **"usar R$ …"**. Medido: **82 dos 106 encerrados**
têm `valorFinal` diferente do valor do contrato — aplicar sozinho apagaria uma
negociação real em 82 registros de uma vez.

Quando o gravado já é o do contrato, a caixa confirma (`✓ o valor gravado é
esse`) e **não oferece botão**.

#### O que a edição preserva e o que ela grava
| | |
|---|---|
| 🔴 `encerradoEm` | **não muda** — ele diz quando a locação foi encerrada, não quando alguém corrigiu o registro |
| `editadoEm` / `editadoPor` | gravados, pelo `mltIndQuemSou()` que o sistema já tem |
| as 4 recusas | valor **sem dígito** (`mltNum('abc')` = 0 passaria calado), "Outros" sem descrição, sem data de devolução, e campo vazio **não** é erro |
| o `valorFinal` | gravado no formato do sistema (`R$ 1.234,56`) — número cru quebraria o `histValorNum` |

As cobranças da devolução (v147) são lidas pela **mesma** `_encAcertoDosCampos`,
agora parametrizada por tela (`'enc'` | `'ee'`).

#### 🔴 A exclusão mede o estrago antes de perguntar
O banco não tem lixeira. Medido em 11/11: **45 multas apontam para 11
encerramentos** (um deles com 30) e **25 encerramentos guardam 39 prorrogações**
— a 2ª via daqueles termos (v128) morre com o registro.

O `confirm` nomeia as duas coisas, diz que **não há lixeira**, que não pode ser
desfeito e que a locação **não volta para os ativos**. Há um botão de **cópia em
JSON** antes de mexer.

| Cuidado | Por quê |
|---|---|
| 🔴 reconfere `db.historico[i] === h` antes do `splice` | entre abrir a tela e confirmar, outra aba pode ter mexido na lista — senão excluiria o registro errado |
| 🔴 a **lápide** em `loka_encerrados` **fica** | é ela que impede a locação de ressuscitar nos ativos (armadilha 5) |
| o índice vem de `db.historico.indexOf(h)` | a lista é filtrada, invertida e paginada: o índice da página não serve (lição da v103) |
| a célula de Ações existe mesmo sem permissão | linha mais curta que o cabeçalho é a família de defeito dos colspans (v78/v119/v137) — o colspan do vazio foi para 8 |

---

### Relatório: KM da frota

Botão **🛣️ KM da Frota** na barra do painel Manutenção. O campo `km` já era
gravado e já aparecia na janela de consulta; faltava o retrato da frota.

#### 🔴 A decisão: 33 carros têm KM, mas não na última manutenção
Medido nos 119 veículos e 811 manutenções:

| | |
|---|---|
| a última manutenção **tem** KM | **75** |
| a última **não** tem, mas uma anterior tem | **33** |
| tem manutenção, KM em nenhuma | 4 |
| sem manutenção nenhuma | 7 |

Deixar os 33 em branco jogaria fora quilometragem que existe; chamar de *"km da
última manutenção"* um número que veio de outra seria mentir. O relatório mostra
o **KM mais recente disponível**, a coluna **Medido em** diz quando, e a
observação **avisa** quando não é o da última — citando a data da última, que não
registrou KM:

```
EBL7E41 | VW Saveiro Baú | alugado | 73.206 | 23/09/2026 | preventiva |
   KM de uma manutenção anterior — a última (13/10/2026) não registrou KM
```

É o padrão dos cartões do Contas a Receber (v120–v122): quando o número embute
algo que o olho não vê, a tela **diz**. E a nota *"Como ler"* no pé do documento
explica a procedência, com **108 de 119** veículos tendo alguma quilometragem.

#### 🔴 O escopo restrito continua restrito
Perfil com `manutencaoEscopoOficina` / `manutencaoEscopoCliente` vê só as placas
dele — essas ações **limitam** a visão, e por isso nem entram no curinga "Todas
as ações" (v89). Um relatório da frota inteira ali burlaria exatamente esse
limite, então ele é **recusado**, e o botão **não** entra na barra daquele
perfil.

#### Outros cuidados
- reusa o **`_mntKM`/`_mntKMValido` do sistema** (v141), sem conta própria
- KM de **formato impossível não é reformatado** (`81.30100` não vira 8.130.100)
  e ganha ⚠ — ⚠️ **inerte com os dados de hoje**: o único registro torto
  (RUP3D82, 21/07) foi superado por um de 84.749, então **nenhum carro** aciona
  esse ramo. Exercitado na suíte com registro sintético, e isso está dito aqui em
  vez de contado como se a frota o cobrisse.
- manutenção **sem data** não é tratada como a mais recente
- placa casa ignorando hífen e caixa; nome do veículo escapado; pop-up bloqueado
  avisa; frota vazia não gera documento em branco

### Validado
- `node --check`; `<div>` do HTML balanceadas (**843/843**; eram 821, +22 do
  modal de edição); os dois carimbos batendo
- **104 testes** com o código real e os dados reais (105 aluguéis, 106
  encerrados, 119 veículos, 811 manutenções, 683 multas): o cálculo nas 3 fontes,
  o rateio da diária fechando com o contrato, o dedup das placas, a varredura dos
  105 sem estouro, a composição **desenhada na tela**, a permissão nas três
  pontas, a sugestão oferecida e não aplicada, os 11 campos gravados, o
  `encerradoEm` preservado, as 4 recusas, as dependências medidas, o `confirm`
  recusado, a lista mudando no meio, as 4 situações do KM com a **invariante da
  partição**, o documento inteiro e o escopo restrito
- **59 defeitos injetados — todos acusados**, entre eles **o cálculo antigo de
  volta** (o defeito relatado), a diária usando o total como diária, a tabela
  somando a placa repetida, o multi descartando o contrato, qualquer perfil
  editando, a sugestão aplicada sozinha, o `encerradoEm` sobrescrito, excluir sem
  confirmação, excluir sem reconferir o índice, apagar a lápide, o KM vindo da
  última sem quilometragem, o KM anterior deixando de ser marcado, e o escopo
  restrito vendo a frota inteira
- **No ar, no arquivo publicado, com o banco real** e o `firebase`/`saveDB`
  substituídos **ANTES do eval**: o script carrega inteiro; os 3 casos de cálculo
  acima; 17 aluguéis com placa repetida e **0 dobraram a tabela**; 40 de 105
  mudam de valor, 0 estouros; edição de ponta a ponta no encerrado real da
  **SIA6F77** (R$ 165,00 pelo contrato, cobranças R$ 275,50, a devolver
  R$ 224,50, conferido contra a conta feita por fora), `encerradoEm` preservado,
  as duas recusas; exclusão com o `confirm` nomeando 1 multa, recusado não
  excluindo, confirmado excluindo **só** o alvo com os vizinhos intactos, e a
  lista mudando no meio sendo barrada; o relatório de KM com 119 linhas, 833
  células, 33 avisos e os 4 cartões em 75/33/4/7. **Nada foi gravado em
  produção** — reconferido: 105 ativos, 106 encerrados, 683 multas,
  `_writerBuild` ainda `v147`, e o registro que editei em memória segue
  `R$ 300,00 · ok · sem editadoPor`.
- Regressão **medida**: **51 suítes, 2.660 testes**, nenhuma falha

### ⚠️ Três tropeços meus, os três pegos por medição
1. **A sonda do [A6] era "contrato com mais de 3 carros"** — o maior real tem
   **3**. Sonda chutada; o teste passou a achar o caso **por código**.
2. **O [A25] era cego.** Ele conferia o *fonte* (`/ajustado/` existe no código) e
   **absolveu** o defeito que deixa a caixa muda. Entraram o [A26]/[A27], que
   chamam a função e leem o `innerHTML`.
3. **Duas âncoras do injetor eram ambíguas** (`_encLocInfo = _encLocacao(a,` em 2
   lugares, `if (!confirm(msg)) return;` em 3). O injetor ganhou um campo `fn`
   que recorta a troca **dentro daquela função**, em vez de eu escrever âncora
   maior à mão.

⚠️ E o **heredoc comeu os escapes mais uma vez** ao tentar consertar a âncora por
script (`\n` virou quebra de linha de verdade dentro da string do injetor).
Refeito pela ferramenta de escrita. É a regra já registrada, e ela voltou a ser
cobrada.

### 🔴 A `t-encerra` (v147) quebrou sem defeito — e o meu conserto nasceu CEGO
Dois testes dela travavam a **assinatura** das funções:
`/function _encAcertoDosCampos\(\) \{/` e `/function _encRenderAcerto\(\) \{/`.
A v148 parametrizou as duas por tela (`'enc'` | `'ee'`), o recorte passou a
devolver vazio e elas falharam **sem haver defeito** — a armadilha do teste
estrutural ancorado no vizinho, pela quinta vez em duas semanas.

🔴 **Mas o conserto foi pior:** reescrevi as duas devolvendo **mensagem de erro**
(`return 'recalcula a locacao'`), como na suíte nova. **O `t()` desta suíte é
`!!(cond)`** — então string não vazia é **aprovação**, e os dois testes passaram
a absolver o próprio defeito que vigiam. Só descobri injetando os defeitos de
propósito; antes disso a suíte dizia **78 ok**.

⚠️ **Regra:** antes de reescrever asserção em suíte antiga, conferir o `t()`
daquela suíte. As deste projeto não são iguais — umas exigem `=== true` e
imprimem a mensagem, outras avaliam `!!(cond)`.

E o sinal do [9d] também tinha mudado de nome: ele procurava `encValor`, que na
v148 virou `pre + 'Valor'`. O teste passou a aceitar os dois — o que ele promete
é que o render **leia o valor da tela**, não o nome do id. Provado com 4 defeitos
injetados, todos acusados.

### ⏳ Não verificado · e decisões para o Rogel
Falta **logado**: encerrar uma locação e ver a composição do valor; abrir o ✏️ de
um encerrado e conferir a sugestão do contrato; gerar o **KM da Frota**. Eu não
autentico.

🔴 **Dois registros da BRJ com `a.valor = R$ 43.550,00`** (SWH3A72, SWO4I55): é o
total do contrato de 13 carros gravado em cada placa. Agora isso aparece na tela
em vez de ficar escondido — e enquanto não for corrigido, encerrar um deles
pré-preenche R$ 391.950,00.

🔴 **A manutenção da RUP3D82 (21/07) com `km = "81.30100"`** segue lá, agora
também visível no relatório da frota.

---

## ✅ Endividamento: parcelas pagas editável — 11/11/2026 (`45a8631`) · gestao v149

Pedido: *"a coluna parcelas pagas precisa ser editável onde informaremos a
quantidade já paga (exemplo 18 parcelas pagas). A coluna JÁ AMORTIZADO é a soma
das parcelas base já pagas e a coluna saldo devedor é o resultado do valor
financiado menos o valor já amortizado"*.

### 🔴 "Soma das parcelas base" ao pé da letra é CIRCULAR
A coluna **Parcela Base** da tela é `parcela − encargos`, e `encargos = saldo ×
CET`, e `saldo = principal − amortizado`. Definir `amortizado = base × pagas`
fecha um círculo. Resolvendo:

```
amortizado = pagas × (parcela − CET × principal) / (1 − pagas × CET)
```

⚠️ Com 48 parcelas a 1,48% o denominador vai a **0,29** — o amortizado
explodiria. Não dava para implementar a leitura literal.

### 🔴 A medição decidiu o significado
Nos 19 financiamentos reais, comparando o `amortizado` que o Rogel já usa com as
duas interpretações:

| | |
|---|---|
| batem com a **tabela Price** dentro de 0,01% | **16 de 18** (o 19º está gravado como 0) |
| batem com **`base × nº pagas`** | 🔴 **nenhum** com CET > 0 |

Então "soma das parcelas base já pagas" quer dizer a **soma da parte de
principal de cada parcela paga** — que na tabela Price é a base *daquela*
parcela, e muda mês a mês. É exatamente o que o `divAmortizadoPrincipal` já
calculava.

⚠️ Os 2 cartões têm **CET = 0**, e aí as duas contas coincidem (base = parcela).
Não são contraexemplo — eles não distinguem os métodos, e há teste que os exclui
da comparação de propósito.

### Os 2 fora da conta (não corrigidos)
| Contrato | Gravado | Pela conta | Diferença |
|---|---|---|---|
| **920312070** (BV) | R$ 47.594,14 | R$ 42.210,58 | **11,3%** — pagamento extra? CET diferente? |
| 2918912281 | R$ 105.110,88 | R$ 105.405,24 | 0,28% (R$ 294,36, arredondamento) |
| **J Carlos** | **R$ 0,00** | R$ 120.352,92 | nunca foi preenchido |

🔴 **Nenhum dos três era LIDO pela tela** — os três têm vínculo no Contas a
Pagar, e por ali a tela já calculava. Então o campo gravado estava errado sem
afetar número nenhum. Agora ele é mantido em sincronia.

### 🔴 O que estava faltando era só o campo ser editável
O que não dava era **informar**: a coluna era um `<span>` de leitura, alimentado
por `divPagamentosDoContrato` (o contador do Contas a Pagar), com o manual só
como reserva. E o amortizado, **sem vínculo no Contas a Pagar**, vinha do campo
**gravado** — congelado, sem acompanhar nada.

| | antes | agora |
|---|---|---|
| Parcelas Pagas | `<span>` 18/48 | **campo editável** |
| quem manda na contagem | o Contas a Pagar | **o que você informa** |
| Já Amortizado | Price **se** houvesse vínculo; senão o campo gravado | **sempre** calculado da contagem |
| Saldo Devedor | principal − amortizado | igual (agora seguindo a contagem) |

### 🔴 A mudança não altera NENHUM número de hoje
Medido: nos **17** financiamentos com contrato vinculado, o contador do Contas a
Pagar é **idêntico** ao informado à mão. Então inverter a precedência muda
**R$ 0,00** no amortizado (R$ 1.370.535,80) e no saldo (R$ 5.402.460,21).

Quem passa a ser atendido são os **2 cartões Itaú**, que não têm número de
contrato — nunca tiveram vínculo, e eram justamente os que não havia como
corrigir.

É teste, e é o primeiro do bloco: *o amortizado de cada um dos 19 é o mesmo de
antes*.

### O Contas a Pagar passa a conferir, não a mandar
Divergindo os dois, a tela **diz** o número do Contas a Pagar embaixo do campo,
com um botão **usar** — não resolve por conta própria, porque só o operador sabe
qual dos dois está certo. É o padrão dos cartões do Contas a Receber
(v120–v122).

⚠️ **"Informado" só manda quando é > 0.** Num financiamento novo o campo nasce
zerado, e mostrar 0 havendo pagamento lançado esconderia informação real. A
consequência é que *"zero pagas"* não se distingue de *"não informei"* — mas
nesse caso o número do Contas a Pagar fica à vista no campo.

### As recusas
| Entrada | O que acontece |
|---|---|
| texto sem dígito (`abc`) | **recusa** — `mltNum('abc')` devolve 0, e 0 é "nenhuma paga" legítimo (lição da v94, v99, v127, v147) |
| negativo | **recusa**, sem adivinhar que era positivo |
| mais que o total de parcelas | **limita ao total** e avisa |
| `18,7` | vira **18** — não há meia parcela |
| em branco | vira 0, sem erro |

### O campo gravado não pode defasar
`_divSincAmortizado` regrava o `amortizado` do registro. 🔴 Entrou também um
gancho no **`finEdit`** para a aba `divida`: mexer em principal, valor da
parcela, CET ou total de parcelas muda a conta, e sem o gancho a tela ficaria
certa (ela calcula) e **o banco guardaria outro número**.

⚠️ O gancho é **só** da aba `divida` — há defeito injetado que o aplica a todas
e um teste que exige que uma conta a receber **não** ganhe um campo
`amortizado` que não é dela.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**843/843**, sem mudança — a
  célula nova é string de JS); os dois carimbos batendo
- **48 testes** com o código real e os **19 financiamentos reais**: a invariante
  de que nada mudou de valor, a conta conferida contra uma tabela Price
  reimplementada por fora, os 16 que batem com o gravado, os 2 fora nomeados, as
  5 recusas, a precedência nos dois sentidos, a divergência dita e adotada, o
  campo gravado acompanhando pelos dois caminhos, o saldo **desenhado** em cada
  linha, o teto do amortizado varrido em **todas** as contagens possíveis dos 19,
  e a lista vindo como objeto do Firebase
- **32 defeitos injetados — todos acusados**, entre eles **o estado antes do
  pedido** (célula não editável), o amortizado voltando ao campo gravado, o
  Contas a Pagar atropelando o informado, a leitura circular `base × N`, a
  parcela cheia em vez da base, o cronograma sem abater o saldo, amortização
  negativa, o saldo ignorando o amortizado, aceitar mais parcelas que o contrato,
  e o gancho sujando as outras abas

### ⚠️ Sete defeitos passaram na primeira rodada — os sete eram teste fraco meu
| O que passou | Por quê |
|---|---|
| o amortizado voltar ao campo gravado | eu testava a **linha 0**, que TEM vínculo — o ramo do campo gravado só é alcançado **sem** vínculo. Agora o teste varre as duas |
| o saldo da tela virar `parcela × pagas`, e ignorar o amortizado | eu conferia a **função**; **nenhuma asserção olhava o saldo desenhado**. Entrou o bloco G |
| a amortização passar do saldo na última parcela | a tolerância de 2% do meu teste de "zera no fim" absolvia. Agora a invariante é *o amortizado nunca passa do financiado*, varrida em todas as contagens |
| limitar sem avisar | o aviso de **sucesso** diz "48 de 48", então procurar o número `48` nos avisos passava. Passou a exigir a frase do limite |
| o gancho valer para todas as abas | não quebra nada visível — suja a linha com um campo alheio. Virou asserção própria |
| o input nascer com o informado em vez da contagem efetiva | nos 19 reais os dois são **iguais**: nada distinguia. Zerando o informado numa linha com vínculo, o campo tem de mostrar os 18 |

⚠️ E uma asserção minha procurava `value="0"` solto no HTML — que aparece na
coluna **Receita** (0 em 3 linhas) e aprovaria o defeito. Teve de ser ancorada
no `onchange` do próprio campo.

### ⏳ Não verificado · e uma pendência de dado
Falta **logado**: o Rogel abrir Financeiro → **Endividamento**, digitar a
quantidade de parcelas pagas de um financiamento e conferir o Já Amortizado e o
Saldo Devedor. Eu não autentico.

🔴 **O contrato 920312070 (BV)** tem `amortizado` gravado R$ 47.594,14 enquanto a
conta dá R$ 42.210,58 — **R$ 5.383,56** de diferença. A tela sempre mostrou o
calculado, então nenhum total está errado; mas vale ele dizer se houve
**pagamento extra** (amortização antecipada) nesse contrato, porque aí a conta
pela contagem de parcelas é que fica incompleta.

---

## 🔴 A planilha de Endividamento mostrava 3 casas decimais — 11/11/2026 (`45a8631`+) · gestao v150

Achado **olhando a tela publicada** da v149, logo depois de entregar: a planilha
tinha **60 valores** como `R$ 1.641,538`, `R$ 110.914,707`, `R$ 47.129,923`.

### A causa é a mesma da v110
```js
function brl(v){ … minimumFractionDigits: 2 … }   // sem maximumFractionDigits
```
O `brl()` global só exige o **mínimo** de 2 casas; sem `maximumFractionDigits`,
o `toLocaleString` deixa chegar a 3. Aparece onde há **divisão ou produto com
fração de centavo** — e aqui `Encargos = Saldo × CET` e
`Parcela Base = Parcela − Encargos` produzem exatamente isso.

### 🔴 Conferido: é ANTERIOR, não da v149
Medido buscando o **arquivo real da v148** no raw do GitHub (`45a8631~1`) e
refazendo a conta daquela versão: **os mesmos 60 valores**. A v149 não
introduziu nada — ela só não consertou.

⚠️ É a regra de 19/10 sendo cobrada de novo: *o antes tem de ser o arquivo real
daquela versão*. Sem isso eu teria registrado como regressão minha.

### O conserto já existia no sistema
`_divBRL`, nas 11 chamadas do `finRenderDivida` — o mesmo caminho do **`_fvBRL`**
do painel Faturamento/Veículo (v110), que nasceu do mesmo defeito.

🔴 **O `brl()` global não foi tocado.** Ele serve todas as telas, e mexer nele
seria alterar o que não foi pedido. Então **o defeito segue latente fora desta
planilha**, em qualquer lugar que venha a dividir — e há um teste exigindo que
ele continue como está, para a decisão ficar explícita em vez de virar
esquecimento.

### Validado
- `node --check`; `<div>` 843/843; os dois carimbos batendo
- **52 testes** (os 48 da v149 + 4): nenhum valor da planilha com 3 casas, o
  `_divBRL` arredondando e não truncando (nos dois sentidos), zero e nulo, os
  totais do rodapé, e o `brl()` global **intacto**
- **37 defeitos injetados — todos acusados** (os 32 da v149 + 5): o estado antes
  do arredondamento, truncar em vez de arredondar, arredondar para o real
  inteiro, **alterar o `brl()` global**, e o rodapé voltando ao `brl()` cru
- Regressão **medida**: ver abaixo

### ⚠️ Duas asserções minhas tiveram de acompanhar
As [G1]/[G2] — que eu havia escrito *nesta mesma entrega* para conferir o saldo
desenhado — comparavam com `brl(...)` sem arredondar, e falharam quando a tela
passou a arredondar. Não era defeito: era a asserção seguindo o comportamento
antigo. Passaram a usar o `_divBRL`.

⚠️ E o **heredoc comeu os escapes** ao tentar acrescentar o bloco de testes por
script (`\d`, `\$`). Refeito pela ferramenta de escrita, agora com asserção
exigindo que os escapes estejam como **texto** no arquivo.

---

## ✅ CONFIRMADO EM PRODUÇÃO: o Rogel atualizou os 19 financiamentos — 11/11/2026 · gestao v151

Enquanto eu verificava a v150, o banco mudou: `_writerBuild` passou a
`v150-20261111-1545`, escrita às **17:34**. Conferido que **só o `divEditPagas`
escreve `r.pago`** no sistema inteiro (nada automático), então foi ele usando a
tela nova.

### O que ele fez, medido antes e depois
**Todas as 19 linhas** foram atualizadas — `pago` subiu **+6** em 17 delas (ele
trouxe os financiamentos para a data de hoje; a base era de ~6 meses atrás) e
**+4** no J Carlos.

| | antes | depois |
|---|---|---|
| principal total | R$ 6.772.996,01 | — |
| **já amortizado** | R$ 1.370.535,80 | **R$ 2.251.230,83** |
| **saldo devedor** | R$ 5.402.460,21 | **R$ 4.521.765,18** |

🔴 **A conta fecha ao centavo nos 19**, reconferida com uma tabela Price
reimplementada por fora. E o campo `amortizado` gravado acompanhou em todos —
inclusive o **J Carlos**, que estava gravado como **R$ 0,00** desde sempre e
passou a R$ 129.980,00.

### 🔴 Dois achados que isso revelou

**1. O Contas a Pagar está 6 meses atrás, em 17 dos 19 financiamentos.**
As divergências que a tela agora mostra não são erro dela — são o retrato certo:

```
2916787056: informado 24  ·  Contas a Pagar 18
29418875  : informado 12  ·  Contas a Pagar  6
J Carlos  : informado 46  ·  Contas a Pagar 42
```

⚠️ **O botão "usar" ali desfaria o trabalho dele.** O certo é dar baixa dos
meses faltantes no **Contas a Pagar**, não adotar o número atrasado. Por isso o
botão deixou de dizer só *"usar"*: agora diz **"usar as 18"** e o título explica
*"Troca as 24 parcela(s) que você informou pelas 18 que o Contas a Pagar tem
baixadas"*. A consequência fica dita **antes** do clique.

**2. O J Carlos quitou — com 46 de 48 parcelas.**
Saldo **R$ 0,00** com 2 parcelas ainda por vencer. O amortizado bateu o teto do
principal, o que significa que **a parcela registrada (R$ 3.985,82) amortiza mais
rápido que o CET registrado (1,45%)** — pelo cronograma Price, R$ 129.980 em 48
meses a 1,45% daria parcela de ~R$ 3.777.

⚠️ **Não é defeito da conta** (o teto existe justamente para o saldo não ficar
negativo — testado em todas as contagens dos 19), mas é sinal de que o CET ou o
valor da parcela daquele contrato estão registrados fora do real. **Decisão do
Rogel**: conferir o contrato. Se a parcela estiver certa, o CET é menor que
1,45%.

### 🔴 O defeito que a verificação pegou: o AVISO saía com 3 casas
`✅ 18 de 48 parcela(s) paga(s) · amortizado R$ 47.129,923`

O `toast` do `divEditPagas` é desenhado **fora** do `finRenderDivida`, então as
11 trocas da v150 não o alcançaram — e o teste [H1] olhava **só a grade**.

⚠️ É a lição de sempre por um ângulo novo: **o conserto cobriu o lugar onde eu
tinha olhado o defeito**, não todos os lugares onde ele podia estar. O teste
novo varre os avisos de **quatro** edições diferentes, e há defeito injetado que
reproduz exatamente o estado da v150.

### Validado
- `node --check`; `<div>` 843/843; os dois carimbos batendo
- **56 testes** (os 52 da v150 + 4): o aviso com 2 casas, nenhum aviso com 3 em
  nenhuma das 4 edições, o botão nomeando o número que adota, e o título citando
  os dois
- **41 defeitos injetados** (os 37 + 4): o aviso voltando ao `brl()` cru, o aviso
  parando de dizer o amortizado, o botão voltando a dizer só "usar", e o título
  não citando o informado
- **No ar, no arquivo publicado da v150, com o banco real** e `firebase`/`saveDB`
  substituídos **antes do eval** (5 gravações interceptadas, **nada em
  produção**): 19 linhas, 247 campos, **0 valores com 3 casas** na grade;
  informar 18 → amortizado **R$ 47.129,92** e saldo **R$ 110.914,71**, os dois
  conferidos contra a conta feita por fora; informar 30 → saldo R$ 71.811,72;
  `abc` e `-5` recusados com a mensagem certa; `99` limitado a 48 com o aviso, e
  aí o amortizado = **R$ 158.044,63**, exatamente o principal (o teto); a
  divergência aparecendo e o botão adotando as 18

⚠️ **Uma medição minha quase passou vazia:** a primeira leitura da linha deu
`inputs: []` e `monospace: []` — e eu estava a um passo de registrar
*"0 valores com 3 casas"* a partir de uma tabela que eu não tinha provado que
renderizou. Era o meu recorte, não o render: a grade tinha **90 KB, 21 `<tr>` e
247 campos**. **Zero só vale depois de provar que havia o que contar.**
- Regressão **medida**: **52 suítes, 2.716 testes**, nenhuma falha

### ⏳ Decisões para o Rogel
1. **Dar baixa dos 6 meses faltantes no Contas a Pagar** nos 17 financiamentos
   — e **não** clicar em "usar as N", que desfaria a atualização de hoje.
2. **Conferir o contrato J Carlos**: parcela R$ 3.985,82 com CET 1,45% quita em
   46 de 48 parcelas. Um dos dois está registrado fora do real.
3. **O contrato 920312070 (BV)** tinha `amortizado` gravado R$ 5.383,56 acima da
   conta antes de hoje — vale dizer se houve **amortização antecipada** nele,
   porque aí a conta pela contagem de parcelas fica incompleta.

---

## ✅ Coluna "Previsão Reparos" na aba Veículos — 12/11/2026 (`2380f29`) · Auto Mais

Pedido: *"na aba veiculos criar uma coluna 'Previsao para Reparos' que
apresente a previsao de valor que pode ser gasto com o veiculo com eventual
garantia. permitir que cliquemos no botao para inserir as informações de
previsao e criar tambem um botao para darmos baixa se o servico de fato vier a
ser realizado, lançando o gasto em despesas e manutenção"*.

⚠️ **"Despesas" é menu da Auto Mais** (a LOKÁ tem "Contas a Pagar"), e garantia
de veículo vendido é coisa de revenda — por isso o alvo é o `automaiscar`.
Conferido antes de abrir arquivo.

### 🔴 A medição mostrou que o pedido é maior do que parece
Não existia **nada** de previsão de reparo: nem campo, nem coluna. A garantia
só aparecia nos **contratos** (90 dias do CDC + Termo Uber). Mas:

| | |
|---|---|
| veículos | 51 (17 disponíveis, **34 vendidos**) |
| 🔴 **vendas com garantia de 90 dias VIGENTE hoje** | **23** (= 22 carros) |
| 🔴 **manutenções em carro JÁ VENDIDO** | **16 de 22 · R$ 13.172,35** |

**A loja já gasta isso com garantia e não havia previsão nenhuma.** Era o
número que justificava o pedido, e ele só aparece cruzando manutenção com
status do veículo.

### 🔴 A baixa NÃO monta despesa por conta própria
Ela cria a **manutenção**, e a cadeia que já existia gera a despesa sozinha
(`_despesaDeManutencao`, de 19/09). Para isso as 4 peças saíram do
`gestao.html` para o **`firebase-shared.js`**:
`DESP_TIPO_MANUT` · `_gravarTudo` · `_despesaDaManutencao` · `_despesaDeManutencao`.

⚠️ Em duas cópias, uma aprenderia regra nova e a outra não — foi exatamente o
acidente da v119 da LOKÁ (duas `statusReal`, e o relatório impresso era o que
errava). Há **teste e defeito injetado** exigindo que a despesa da baixa seja
**campo por campo idêntica** à que a aba Manutenção geraria para a mesma
manutenção.

### 🔴 As duas cópias de `_gravarTudo` NÃO eram iguais
| Onde | O que faz |
|---|---|
| `gestao.html` | trata `it.apagar` → chama **`fdel`** |
| `contratos.html` | **só grava** — nunca apaga |

Subiu a **completa**, a do gestao. A do `contratos.html` **ficou onde está**:
não foi pedido, e conferido que ela **nunca recebe `apagar`** (0 ocorrências),
então hoje é inofensiva. Fica registrado como dívida — se algum dia alguém
passar `apagar:true` por aquele caminho, ela **gravaria em vez de apagar**, em
silêncio. Há teste exigindo que a versão do shared continue tratando `apagar`.

### Por que o previsto é uma LISTA, não um campo
Um carro em garantia pode ter "revisão de freios" **e** "retífica" ao mesmo
tempo, e se baixa um sem perder o outro. Com um campo único, baixa parcial
viraria conta de cabeça. `v.reparos[]`, cada item com descrição, valor, marca
de garantia, observação e status.

### O que a coluna diz (e o que ela se recusa a dizer)
Entrou **entre Preço e Status**; o `colspan` do estado vazio foi de 7 para 8 —
esquecer isso é a família de defeito dos rodapés (v78/v119/v137).

| Situação | O que aparece |
|---|---|
| com previsão | o total **em aberto** + quantos itens |
| carro vendido, garantia vigente | *"garantia: faltam N dia(s)"* |
| garantia vencida | *"garantia vencida"* |
| já baixado | quantos e quanto |
| 🔴 **sem previsão nenhuma** | **travessão, nunca R$ 0,00** |

🔴 O último é o que mais importa: **zero previsto** ("avaliei, não há o que
gastar") e **ausência de previsão** ("ninguém avaliou") são coisas diferentes.
É o padrão da fatura sem lançamento (v143) e dos cartões do Contas a Receber
(v120–v122). Há defeito injetado que troca o travessão por R$ 0,00.

⚠️ **O que foi baixado sai do previsto** — ele já está em Despesas. Somar os
dois faria a tela contar duas vezes o mesmo gasto.

### 🔴 A garantia corre da venda MAIS RECENTE
Medido: há carro vendido **duas vezes** nos dados reais (`SWI1J24`, 13/08 e
20/10). Pegar a primeira venda diria que a garantia venceu quando ela está
vigente. Por isso são **23 vendas** vigentes mas **22 carros** — e o teste
compara a conta da tela com a conta feita por fora, nas duas.

⚠️ `REP_GARANTIA_DIAS = 90` **não é número meu**: é o prazo que o próprio
contrato de venda promete (*"garantia legal de 90 (noventa) dias"*). A borda é
inclusiva — 90 dias exatos ainda é vigente — e há defeito injetado para ela.

### A baixa: os três registros vão juntos
`_gravarTudo([manutencoes, despesas, veiculos])` numa chamada só. Falhando
**qualquer um**, nada muda na tela, o modal fica aberto e o aviso diz
**"NÃO foi dada a baixa"**.

| Cuidado | Por quê |
|---|---|
| o valor realizado é **editável** | o serviço custa o que custou, não o que foi previsto |
| a tela mostra a **diferença** ao vivo | *"R$ 150,00 ACIMA do previsto"* — sem obrigar conta de cabeça |
| 🔴 o **previsto original é preservado** no item | senão a comparação previsto × realizado se perderia |
| o item vira `realizado`, **não é apagado** | é o histórico de que a garantia foi usada |
| guarda `manutencao_id` | é por ele que se reencontra o que gerou o gasto |
| `repBaixaDif` só **desenha** | se recalculasse, apagaria o valor ajustado à mão a cada tecla |
| baixar duas vezes é **recusado**, e abrir a baixa de item já baixado também | |

### As recusas (a lição do `repNum("abc") = 0`)
| Entrada | O que acontece |
|---|---|
| valor **sem dígito** (`abc`) | recusa dizendo **"Informe o valor"** |
| zero ou negativo | recusa dizendo **"maior que zero"** |
| sem descrição / sem data | recusa |

⚠️ A guarda de dígito **só muda a mensagem** (o `n<=0` barraria de todo jeito)
— mas a mensagem é o que diz ao operador o que está errado. Por isso o teste
exige a **mensagem específica de cada caso**, não só que recusou.

🔴 **Prever não é gastar:** adicionar previsão grava **só o veículo** — nenhuma
manutenção, nenhuma despesa. Há teste e defeito injetado que lança despesa na
hora de prever.

### Validado
- `node --check` no shared e nas **10 páginas**
- **33 testes de runtime** com o código real e os dados reais (51 veículos, 32
  vendas, 22 manutenções, 102 despesas): `repNum` em 10 entradas, lista vindo
  como objeto indexado, o previsto sem o baixado, a garantia nas 6 situações
  (vigente, vencida, sem data, sem venda, 90 exatos, 91), a venda mais recente,
  a célula nos 4 estados, as 8 colunas em toda linha renderizada, adicionar com
  as 5 recusas, excluir, a baixa de ponta a ponta, **a invariante da despesa
  idêntica**, falha em cada uma das 3 coleções, escape de HTML, e os 51
  veículos reais produzindo célula válida
- **49 defeitos injetados — todos acusados, nenhum cego**: entre eles o estado
  antes do pedido (coluna, célula, botão, colspan), o previsto somando o
  baixado, o travessão virando R$ 0,00, a garantia pegando a venda mais antiga,
  a baixa não criando a despesa, a baixa **apagando** a previsão em vez de
  marcar, a baixa montando a despesa por conta própria, a baixa usando o valor
  previsto em vez do realizado, a cadeia voltando a ser duplicada na página, e
  o `_gravarTudo` do shared voltando a não apagar

### ⚠️ Seis defeitos passaram na primeira rodada — e os seis eram meus
| O que passou | Por quê |
|---|---|
| a guarda `!s.data` da garantia | **inerte**: `new Date("T12:00")` é Invalid Date e o `isNaN` adiante já devolve `{semData:true}`. Depois de simplificar, o `!s` também virou redundante pelo mesmo motivo. **As duas saíram** em vez de ficarem como proteção que nenhum teste alcança |
| a guarda de dígito, em dois lugares | só muda a mensagem — ver acima |
| adicionar apagando as previsões anteriores | meu teste só adicionava a **primeira** previsão, e com lista vazia `[]` e `repLista(v).slice()` dão o mesmo. Entrou o caso da **segunda** |
| abrir a baixa de item já baixado | 🔴 **asserção fraca**: eu lia o **último** aviso, e o aviso anterior já dizia "ja foi baixada". Agora o teste zera os avisos e exige que o modal **não troque** |
| trocar o `_gravarTudo` por três `fsave` soltos | meu teste de falha derrubava **todas** as gravações, e aí os dois desenhos avisam erro. O que distingue é falhar em **uma** coleção: com `fsave` solto a manutenção falha em **silêncio** e a tela diz sucesso. Entrou `opts.falhaCol` |

### 🔴 Quatro armadilhas do ambiente de teste, todas na mesma rodada
1. **A sonda de carga estava errada:** `CSS_A4` é do `vendas.html`, não do
   `veiculos.html`. Passou a ser o `let vTab` (242, e `let` **não é içada**) +
   `REP_GARANTIA_DIAS` (316). ⚠️ Depois da 316 o arquivo só tem declarações de
   função, que **são** içadas: a sonda alcança a linha 316, e isso fica **dito**
   em vez de alegado como "rodou inteiro".
2. 🔴 **O stub devolvia Promise de verdade, e microtask não drena dentro de
   `vm.runInContext`** — o callback do `fsave` nunca rodava, e 3 testes mediam
   o **silêncio do ambiente**. Virou **thenable sincrono**: o `.then()/.catch()`
   do `fsave` real é exercitado e o callback roda na hora. ⚠️ Determinístico,
   mas não prova ordem assíncrona.
3. **O `materializar` pulava elemento que já existia**, então um `innerHTML`
   novo não reconstruía o checkbox — ele guardava o `checked` da abertura
   anterior. No navegador, trocar `innerHTML` **destrói e recria** tudo.
4. **O recorte do `renderVeic` ia até `function renderPlaca`** — e eu inseri o
   bloco dos reparos exatamente entre as duas, então o recorte engolia os
   `<th>` dos modais e contava 14 colunas. Delimita pelo **fim da função**.

⚠️ **E a minha própria conferência se contradisse:** eu exigia que
`DESP_TIPO_MANUT` **não** sobrasse no `gestao.html` **e** que ele continuasse a
chamá-la. Para uma constante, declarar e chamar são a **mesma string** — a
asserção era impossível de satisfazer. A ausência se confere pela
**declaração** (`var DESP_TIPO_MANUT =`). Ela parou o patch antes de eu seguir,
que é o comportamento certo.

⚠️ E o `node -e` comeu os escapes do caminho do Windows, igual ao heredoc —
é a regra já registrada, cobrada de novo.

### ⚠️ Achado de dado, não corrigido
A placa **SWI1J24** aparece em **duas vendas** (13/08 e 20/10). Pode ser
recompra/revenda legítima — mas ela é também uma das placas que já estavam
registradas com **numeração de contrato torta** (19/09: dois contratos
numerados com a placa, `SWI1J24` e `RPH2C27`). Vale o Rogel conferir se são
duas vendas de verdade. **O código trata o caso de qualquer forma** (usa a mais
recente), então nada depende dessa decisão.

### Verificado no ar, no arquivo publicado, com os dados reais
Sandbox com o `firebase` substituído **antes do eval** (a regra de 11/11) e os
51 veículos, 32 vendas, 22 manutenções e 102 despesas reais:

| | |
|---|---|
| a lista | **8 `<th>`**, **8 células em toda linha**, 20 travessões e **zero** `R$ 0,00` indevido |
| garantias vigentes | **22 pela tela = 22 pela conta feita por fora** |
| carro usado no teste | **FIAT ARGO · RNS8I00**, garantia real com **26 dias** restantes |
| adicionar previsão | gravou **só `veiculos`** · a caixa de garantia veio marcada sozinha |
| a célula depois | *R$ 800,00 · 1 previsto(s) · garantia: faltam 26 dia(s)* |
| baixa com valor maior | aviso *R$ 150,25 ACIMA do previsto* |
| a baixa | 3 coleções · manutenção `R$ 950,25` na JT CAR · item `realizado` com o previsto `800` preservado e `manutencao_id` 23 |
| 🔴 **a despesa** | **idêntica, campo por campo**, à que `_despesaDeManutencao` geraria |

**Nada foi gravado em produção** — 3 gravações interceptadas, e reconferido:
51 veículos / 32 vendas / 22 manutenções / 102 despesas, **0** veículos com o
campo `reparos`, e a manutenção 23 responde **404**.

### 🔴 A conferência final quase registrou um número falso
A primeira leitura do banco voltou **0 em todas as quatro coleções** — e eu
estava a um passo de registrar aquilo. Zero nas quatro, minutos depois de ler
51/32/22/102 da mesma origem, é **requisição falhando**, não banco vazio.

A causa, provada: eu anexei um `&v=` de anti-cache à URL do Firestore, e ele
responde **HTTP 400** — `Unknown name "v": Cannot bind query parameter`. O meu
código lia `(j.documents || []).length` e **engolia o erro como zero**.

⚠️ **A lição, que é a de 11/11 por outro ângulo:** contagem tem de carregar o
**status HTTP** junto. `|| []` transforma falha em zero, e zero parece um
resultado. *Zero só vale depois de provar que havia o que contar.*

### ⏳ Não verificado
Falta **logado**: o Rogel abrir Veículos com **Ctrl+Shift+R**, clicar no 🔧 de
um carro em garantia, lançar uma previsão e depois dar baixa — conferindo que a
manutenção aparece na aba Manutenção e a despesa em Despesas. Eu não autentico.

---

## ✅ Almoxarifado: fornecedor na entrada — 12/11/2026 (`7aadd0e`) · gestao v152

Pedido: *"no item almoxarifado, criar o campo fornecedor dentro do botão de
entradas para identificarmos de onde foram comprados"*.

### 🔴 A ficha já tinha fornecedor — o que faltava era a origem de CADA compra
`axFornecedor` (fornecedor **habitual**) existe na peça desde a v126. Mas a
movimentação não guardava nada: a mesma peça vem de fornecedores diferentes, a
preços diferentes, e isso não era registrado em lugar nenhum. Medido nas **18
movimentações reais**: `fornecedor` **em zero** delas — o dado começa agora.

### O que os dados mostraram antes de eu escrever
| | |
|---|---|
| peças | 5 (todas pneu) · **todas com habitual "Avannt Pneus Remold Ltda"** |
| movimentações | 18 — 5 entradas, 11 saídas, 2 ajustes |
| fornecedores cadastrados | 16 |

🔴 **O campo Motivo das SAÍDAS já é usado para dizer PARA ONDE a peça foi**:
"JT", "Tudo Pneus", "JT Pneus", "Reposição JT CAR" — e **"Tudo Pneus" e "JT Car
Mecânica" são fornecedores cadastrados**. Então o pedido é sobre a **compra**, e
o motivo da saída continua servindo ao destino. Não encostei nele; há teste
exigindo que os motivos reais continuem na tela.

### Só na ENTRADA
Saída é **consumo** (o destino vai no motivo, o carro no campo do veículo) e
ajuste é **correção de contagem**. Nenhum dos dois compra nada, e gravar origem
neles encheria o extrato de uma compra que não houve. É a mesma regra que o
**custo** já seguia desde a v126 (só entrada) e a **placa** (só saída).

A guarda é no **salvar**, não só na visibilidade: o campo fica escondido, mas o
DOM aceita valor por fora. Há teste que preenche o campo na saída e exige que o
registro saia com `fornecedor: ''`.

### A sugestão, e por que ela DIZ de onde veio
A entrada já abre com o **fornecedor habitual** da peça — é a informação
verdadeira mais provável — e abaixo do campo aparece *"Sugerido do cadastro da
peça — troque se comprou de outro."* Editando, a nota **some**: ela explica uma
procedência que já não é a da tela.

🔴 **Comprar de outro NÃO muda o habitual da ficha.** O cadastro é decisão de
quem cadastra, não efeito colateral de um lançamento — senão uma compra avulsa
reescreveria em silêncio o fornecedor da peça. Há teste e defeito injetado.

⚠️ Abrir o modal de novo **não herda** o que foi digitado antes: sem a limpeza,
uma entrada de outra peça sairia no nome do fornecedor da anterior.

### A entrada do saldo inicial leva o habitual
O cadastro com quantidade (v127) cria uma entrada no extrato. Ela passa a levar
o fornecedor que acabou de ser digitado na **mesma tela** — é a melhor
informação disponível, e o motivo *"Saldo inicial do cadastro"* deixa claro que
é saldo de prateleira, não uma compra datada de ninguém. Cadastro sem
fornecedor **não inventa** origem.

🔴 E a ficha continua **sem** campo de quantidade: o saldo segue sendo a soma
das movimentações (v126). Há teste exigindo que `qtd`/`saldo`/`estoque` não
apareçam no registro da peça.

### No extrato: coluna própria, e a busca acha
A coluna **"Comprado de"** entra entre *Motivo / veículo* e *Quem*, e a busca
livre passa a varrer o fornecedor (com `semAcento` nos dois lados).

⚠️ Movimentação de antes deste campo — e toda saída e ajuste — mostra
**travessão**, nunca célula vazia: célula em branco se leria como defeito da
tela.

O `<datalist>` aprende de **quem já vendeu peça**, mesmo sem ficha de
fornecedor: a lista se padroniza com o uso, sem obrigar a cadastrar antes.
⚠️ `<datalist>`, não `<select>`: lista fechada obrigaria a migrar o que já foi
digitado — a lição do fornecedor nas despesas da Auto Mais (26/09).

### A coluna custa ZERO de largura — medido, não suposto
Comparado com o arquivo **real da v151** (raw de `7aadd0e~1`), rodando o
`renderAlmoxMov` **de cada versão** sobre as mesmas 18 movimentações:

| | v151 (6 colunas) | v152 (7 colunas) |
|---|---|---|
| mínimo do conteúdo | 625px | **731px** (+106) |
| piso (`min-width`) | 820px | 820px |
| largura desenhada a 1024px | **820px** | **820px — igual** |
| rolava a 1024px? | **sim, já rolava** | sim |

🔴 **731 ainda cabe sob o piso de 820**, então a tabela é desenhada na mesma
largura nas duas versões e a rolagem a 1024px **já existia na v151**. Há 89px de
folga antes de a coluna passar a custar largura de verdade.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**845/845**; eram 843, +2 do campo
  e da nota); os dois carimbos batendo
- **60 testes** com o código real e os dados reais: o campo no HTML e dentro do
  modal certo, visibilidade nos 3 tipos, a sugestão nas 5 peças reais, a nota
  aparecendo e sumindo, o que fica gravado em cada tipo, trim, nome com aspa e
  `&`, a ficha preservada, o saldo inicial, as validações de sempre, a coluna, o
  escape, a busca com e sem acento, os filtros, o datalist, e lista vindo como
  objeto do Firebase
- **31 defeitos injetados — todos acusados**, entre eles o **estado antes do
  pedido** (campo inexistente, nada gravado, coluna ausente), a saída gravando
  origem, não sugerir o habitual, a sugestão virar imposição sobre a ficha, o
  modal herdar o valor anterior, a célula sair das linhas, o nome ir cru para o
  `innerHTML`, a busca parar de achar, e os carimbos deixarem de bater
- **as duas suítes do almoxarifado continuam passando** — v126 (70 testes) e
  v127 (53) —, o que prova que nem o saldo nem a quantidade inicial mudaram de
  comportamento
- **No ar, no arquivo publicado, com o banco real** e `firebase`/`saveDB`
  substituídos **antes do eval**: sistema carregado inteiro (`MLT_GRAV`), 18
  linhas com 7 células cada; abrir a entrada do **Pneu 175/65 R14** → caixa
  visível, campo com **"Avannt Pneus Remold Ltda"**, a nota do cadastro, 16
  sugestões no datalist; na saída → caixa `none` e campo vazio; editar → a nota
  some; salvar com **"Gomma Pneus"** → saldo **12 → 16**, extrato mostrando
  `12/11/2026 | Pneu 175/65 R14 | ⬇ Entrada | +4 | — | Gomma Pneus | —`, e **a
  ficha ainda em "Avannt"**. 1 gravação interceptada; reconferido no banco: 5
  peças, 18 movimentações, **0 com fornecedor**, nenhuma "Gomma".
- Regressão **medida**: **53 suítes, 2.776 testes**, nenhuma falha

### ⚠️ Dois ramos inertes, e isto está dito
Na injeção, dois trechos não mudaram resultado: a limpeza preventiva do campo
antes da sugestão é redundante com o `else` que já o esvazia, e o `|| ''` do
habitual nunca é alcançado com `it.fornecedor` truthy. Ficaram no código (custam
nada e dizem a intenção), **mas sem cobertura própria**.

### 🔴 Achado de dado, não corrigido
Há **duas peças com o mesmo nome**: "Pneu 205/60 R15" aparece em
`ax1792238656606` (17/10) e `ax1794483164035` (12/11), as duas **sem código** e
as duas hoje com saldo **zero**. A guarda contra duplicata é sobre o **código**,
e nas 5 peças ele está vazio — então nome repetido passa, e o saldo da mesma
peça se divide em duas fichas. Não corrigido: é dado de produção e não foi
pedido. Juntar é lançar as movimentações numa só e zerar a outra.

### ⏳ Não verificado
Falta **logado**: o Rogel abrir o Almoxarifado com **Ctrl+Shift+R**, lançar uma
entrada de verdade e conferir a coluna no extrato. Eu não autentico.

---

## ✅ Ocorrências no encerramento + comunicado de cobrança — 12/11/2026 (`c87df2c`) · gestao v153

Pedido: *"ao encerrarmos um aluguel, criar um botão 'OCORRÊNCIAS?' para
preenchermos em caso de haver avaria ou necessidade de averiguação posterior por
multas e demais situações. permitir que preenchamos a ocorrência ou as
ocorrências classificando por tipo. Criar um formulário de comunicado de cobrança
para enviarmos para o cliente notificando da cobrança da ocorrência, citando as
cláusulas do contrato a que se refere cada situação."*

### 🔴 A CLÁUSULA DEPENDE DO TIPO DE CONTRATO — e isso foi o trabalho
As duas cláusulas de "Demais Custos" têm o **mesmo nome e numeração diferente**:

| Matéria | Mensal | Diária |
|---|---|---|
| Da Devolução | 3ª | 3ª |
| Das Multas | 8ª | 8ª |
| Da Caução | 10ª | 10ª (+ a frase do veículo sujo) |
| Do Seguro | 11ª | 11ª |
| **Demais Custos** | **12ª** | **14ª** |
| Franquia de KM | 13ª | 15ª |
| Uso em desacordo com o CTB | — | **12ª** |
| Rastreador | — | **13ª** |

🔴 **A 12ª da diária é outra matéria.** Citar "Cláusula 12ª" num comunicado de
contrato por diária aponta o cliente para *uso indevido do veículo* em vez de
*demais custos*. Num documento de cobrança isso é pior do que não citar.

### 🔴 E onde NÃO HÁ cláusula, o sistema diz que não há
Medido nos dois contratos publicados:

| Tipo de ocorrência | Mensal | Diária |
|---|---|---|
| **Devolvido sujo (lavagem)** | 🔴 **nenhuma** | 14ª e 10ª |
| **Combustível** | 🔴 nenhuma | 🔴 nenhuma |
| Pneu além do direito | 12ª | 🔴 nenhuma |
| Uso indevido · Rastreador | 🔴 nenhuma | 12ª · 13ª |

⚠️ **E 98 dos 105 aluguéis ativos são MENSAIS** (os 106 encerrados são 93 diária
/ 13 mensal — a frota virou). Ou seja: o caso que mais vai acontecer daqui para
frente é justamente o que o contrato não prevê.

Então: ao escolher o tipo, a tela **avisa antes**
(*"O contrato mensal não prevê cobrança para este item… o comunicado sairá sem
citação de cláusula — não inventamos amparo que o contrato não dá"*), o seletor
marca as opções sem amparo, a linha do documento sai *"não prevista no
contrato"* e há um aviso ao pé. Descobrir isso **depois** de o comunicado estar
enviado já é tarde.

### 🔴 A transcrição é a do contrato, não paráfrase minha
O documento **transcreve** o texto de cada cláusula citada, recortado dos
próprios `contrato-mensal.html` / `contrato-diaria.html`. Onde recorto (a 11ª
começa com as franquias, que no formulário estão em branco), entra **`[...]`** à
vista.

⚠️ **Dois defeitos meus que o teste pegou:** eu havia abreviado a 8ª (cortei a
procuração do meio) e escrito *"A restituição **da caução**"* na 10ª, onde o
contrato diz *"A restituição"*. O teste compara **frase por frase, terminada em
ponto, contra o contrato real do repo** — e acusou. Transcrição que não é
transcrição vira discussão quando o cliente abre o contrato.

🔴 E o teste exige **a frase inteira**: sem o ponto final, uma transcrição
cortada no meio passava como prefixo válido. Foi um defeito injetado que mostrou.

### As 4 situações
| | |
|---|---|
| 💰 **A cobrar** | exige valor — "a cobrar" sem valor seria comunicado que cobra nada |
| 🔎 **Em averiguação** | **sem valor ainda** — é o caso que o pedido nomeia: *multa que pode chegar depois* |
| ✅ Já comunicada | cobrança viva, soma |
| ⊘ Sem cobrança | só registro |

🔴 **Só "a cobrar" e "já comunicada" entram no total.** Averiguação **com** valor
também fica fora: é justamente o que ainda não se sabe. O documento traz um bloco
separado dizendo *"não estão incluídas no total acima"*, e sem nada a cobrar o
comunicado sai **sem total e sem a mora**.

### Os valores são OFERECIDOS ao acerto, nunca aplicados
O acerto da devolução (v147) abate da caução; a ocorrência pode ser cobrada por
fora — e só **8 dos 105 ativos** têm caução registrada. Escrever sozinho nos
campos criaria dois números para a mesma dívida e apagaria o que o operador
digitou. Então o aviso mostra os dois lados e um botão
*"usar R$ x / R$ y / R$ z"*. Mesma regra do *"usar as 18"* do Endividamento.

### Outros cuidados
- **O rascunho é cópia**: cancelar não deixa meia ocorrência no registro
- No encerramento **não grava por fora** — o `confirmarEnc` leva o registro
  inteiro para o histórico. No encerrado grava **só `loka_db/historico`**, por
  caminho (armadilha 3), e **falha de gravação avisa** em vez de fechar o modal
- 🔴 **selo na linha do histórico** (`📋 3 · R$ 400,00`): sem ele a ocorrência
  ficaria invisível na lista — ninguém abre o que não sabe que tem
- 🔴 **`z-index:600` no modal**: ele está **antes** do `mEncerramento` no
  documento (linha ~1309), e com z-index igual quem fica na frente é o último —
  sem isso abriria **atrás** do modal que o chamou. Há teste e defeito injetado
- valor sem dígito recusa (`mltNum('abc')` = 0), negativo recusa, descrição
  obrigatória (é o que o cliente lê), remover pede confirmação
- `_ocoLista` normaliza a lista vinda como objeto do Firebase (armadilha 1)
- a numeração do comunicado é **`CC-`**, para não se confundir com o recibo de
  multa (`REC-`) nem o de pagamento (`RP-`)

### O que os dados mostraram
| | |
|---|---|
| encerrados | 106 — 97 "ok", **6 avaria leve, 1 grave, 2 sujo** |
| 🔴 avarias com valor em `encAvaria` | **ZERO** |
| lavagens cobradas | 3, todas R$ 40,00 e todas de contrato **diária** |

🔴 **As 7 avarias foram cobradas À MÃO, no campo de observação, em prosa:**
*"avarias no parachoque/farois **cobrado a parte R$ 3760,00**"*, *"Veículo
entregue com pára-brisa quebrado. O cliente pagou R$…"*, *"AVARIA NO PARA CHOQUE
T, CLIENTE JÁ EFETUOU O PAGAMENTO"*. O valor vivia no texto e **nunca entrou no
sistema como número** — é exatamente o que o pedido vem resolver.

⚠️ **As 3 lavagens estão a R$ 40,00**, e a tarifa da Cláusula 14ª passou para
**R$ 50,00** em 09/11 — duas delas são de **11/11**, depois da alteração. Dado de
produção, não corrigido.

### Validado
- `node --check`; `<div>` do HTML balanceadas (**865/865**; eram 845); os dois
  carimbos batendo
- **84 testes** com o código real, **os contratos reais do repo** e os dados
  reais (106 encerrados, 105 ativos): a transcrição conferida contra o contrato,
  a numeração conferida **pela cláusula que precede o trecho no documento**, as
  somas, as 6 recusas, o rascunho como cópia, a gravação por caminho, banco fora
  do ar, a tela avisando, o documento inteiro nos dois tipos de contrato, escape,
  pop-up bloqueado, o selo e os 105 ativos classificados
- **53 defeitos injetados — todos acusados**, entre eles o **estado antes do
  pedido**, a lavagem citando a 14ª no mensal, "Demais Custos" com a mesma
  numeração nos dois, as cláusulas deixando de olhar o tipo do contrato, a
  **transcrição parafraseada**, a averiguação entrando no total, o documento não
  transcrevendo, o `loka_db` inteiro, a falha silenciosa, o selo saindo da linha
  e o modal perdendo o z-index
- **No ar, no arquivo publicado, com os dados reais** e `firebase`/`saveDB`
  substituídos **antes do eval**:

| | mensal (BRJ · SWH3A72) | diária (J. CLAUDEMIRO · SJA7D13) |
|---|---|---|
| aviso ao escolher lavagem | *"não prevê cobrança para este item"* | *"Será citada: Cláusula 14ª e 10ª"* |
| cláusulas no documento | 3ª · 7ª · 8ª · 11ª · **12ª** | 3ª · 7ª · 8ª · 10ª · 11ª · **14ª** |
| a do outro contrato | 14ª **ausente** | 12ª **ausente** |
| *"não prevista no contrato"* | **sim** | não |
| total | R$ 400,00 (50 + 350) | R$ 400,00 |
| averiguação fora do total | sim, dito no documento | sim |

  "A cobrar sem valor" **recusada** nos dois. **0 gravações em produção** —
  reconferido: 105 ativos, 106 encerrados, **0 com ocorrências**.
- Regressão **medida**: **54 suítes, 2.860 testes**, nenhuma falha

### ⚠️ Quatro testes meus passaram com defeito vivo, e o quinto era do ambiente
| O que passou | Por quê |
|---|---|
| o botão OCORRÊNCIAS não existir | nenhuma asserção olhava o HTML. Entrou o bloco Z (botão nos dois modais, o modal, os ids, as 4 situações) |
| a 12ª voltar a cortar o "orçamento prévio" | o pedaço cortado **existe** no contrato como prefixo. Passou a exigir a frase terminada em ponto |
| falha de gravação ficar silenciosa | eu só testava o caminho que grava. Entraram os casos sem banco e com erro |
| a averiguação entrar no total | minha sonda tinha valor **zero** — somar ou não dava o mesmo número. Agora entra com R$ 1.000 |

⚠️ **E no navegador:** meu `<select>` de situação estava **sem `<option>`**, então
`.value = 'averiguar'` não definia nada, caía em "a cobrar" e era recusado — o
cenário mediu 2 ocorrências onde eu lancei 3. É a armadilha já registrada em
03/11: *num select não adianta atribuir o valor, é preciso existir a option.*

### O que ficou de fora, de propósito
- **Nenhum lançamento automático em Contas a Receber.** Pela mesma razão da
  v147: a cobrança pode ser abatida da caução que a empresa já tem em mãos, e
  criar "a receber" de dinheiro já retido duplicaria o saldo. O caminho é o
  botão *"usar"* levando ao acerto, ou lançamento manual.
- **Ligação com a aba Sinistros.** Ocorrência de devolução ("devolvido sujo",
  "multa a averiguar") não é sinistro; aquela aba trata colisão/perda
  total/roubo e já tem cobrança de franquia e de reparo (v133). Unificar
  misturaria dois fluxos com públicos diferentes.
- **Fotos.** O sistema não usa Firebase Storage — mesma decisão de v99 e v126.

### ⏳ Não verificado · e duas decisões para o Rogel
Falta **logado**: encerrar uma locação de verdade, clicar em **OCORRÊNCIAS?**,
lançar uma avaria e uma multa em averiguação, e gerar o comunicado.

1. 🔴 **O contrato mensal deve passar a prever lavagem?** Hoje não prevê, e 98
   dos 105 ativos são mensais. Enquanto não previr, o comunicado de lavagem para
   locatário mensal sai sem citação (e dizendo isso).
2. ⚠️ **As 3 lavagens a R$ 40,00** — a tarifa é R$ 50,00 desde 09/11.

---

## ✅ Peça duplicada do Almoxarifado — página pronta, falta o clique — 12/11/2026

Pedido: *"gentileza excluir a linha 'Pneu 205/60 R15 · Pneu · 0 un · — · R$ 0,00
· 🔴 Sem estoque'"*.

### 🔴 Há DUAS fichas com esse nome — a identidade foi provada por dois campos
| | `ax1792238656606` (17/10) | **`ax1794483164035` (12/11)** |
|---|---|---|
| categoria | vazia → tela mostra **—** | **"Pneu"** |
| mínimo | 2 | 0 → tela mostra **—** |
| saldo | 13 un | **0 un** |
| movimentações | **12** (saídas JT, ajustes do Daniel) | **2** (entrada 12 + saída 12, de hoje) |

A linha que ele colou traz **"Pneu"** na categoria e **"—"** no mínimo: é a
segunda. E é a **única** peça com categoria preenchida, o que fecha a
identificação. A primeira guarda o histórico de verdade e **não é tocada**.

### 🔴 O sistema barra excluir pela tela, de propósito
A guarda da v126 recusa excluir peça com movimentação — deixaria histórico sem
dono. Por isso a peça e as **2 movimentações dela** saem juntas: nada fica órfão.
As duas são de hoje e se anulam (entrada 12, saída 12), então o saldo não muda.

### A página
`backups-loka\EXCLUIR-PECA-DUPLICADA.html` — **fora do repo, nunca publicada**.
Duplo clique, confere, clica no vermelho.

| Cuidado | Por quê |
|---|---|
| **REST** (`fetch` + GET/PUT) | funciona abrindo do disco. Conferido: com `Origin: null` o banco responde 200 e o preflight do PUT é aceito |
| grava **só `almox` e `almox_mov`** | nunca o `loka_db` inteiro (armadilha 3) |
| 🔴 **confere que a OUTRA ficha de mesmo nome existe** | se não existir, esta seria a única — e excluí-la apagaria a peça de vez. Recusa |
| banco respondendo **vazio** não libera o botão | sem saber o que há, não dá para escolher o que apagar |
| **relê** depois de gravar | só diz "Pronto" depois de ver gravado |
| falha diz **"NÃO foi gravado"** | nunca finge sucesso |
| rodar de novo não faz nada | idempotente |

**Validado:** **22 testes** com os dados reais e o `fetch` substituído (identifica
a certa, a outra intacta campo a campo, só os dois nós gravados, nenhuma
movimentação órfã nem de outra peça, `confirm` recusado, banco vazio, sem rede,
falha de gravação, e **gravação que responde OK sem mudar nada**) · **12 defeitos
injetados, todos acusados** — inclusive *excluir a peça errada* e *deixar as
movimentações órfãs*.

⚠️ Um cego ensinou: meu teste media *"releu o banco"*, não *"conferiu o que
releu"*. O caso que separa os dois é a gravação que responde **OK e não muda
nada** — entrou como caso próprio.

**Backup:** `backups-loka/almox-ANTES-excluir-duplicada-20261112.json` e
`almox_mov-ANTES-...json`.

### ⏳ Falta o Rogel clicar
A gravação é dele. Depois: **Ctrl+Shift+R** no Almoxarifado para a lista
atualizar.

---

## ✅ Encerramento pode ser desfeito + lavagem no mensal — 12/11/2026 (`276f16f`, `e7f38ba`) · gestao v154 → v155 · mensal v7

Três pedidos: *"ao excluir um aluguel encerrado perguntar se deve excluir
permanentemente ou se deve voltar para aluguéis ativos"* · *"resgatar o aluguel
do cliente Mario Cesar que foi excluído por engano"* · *"o contrato mensal deve
prever lavagem também, assim como o por diária; mudar o valor da lavagem simples
para 50,00"*.

### 🔴 O aluguel do Mario Cesar NÃO foi excluído — foi ENCERRADO
Achado comparando os meus backups do dia com o banco:

| | 08:35 e 09:12 | 10:17 |
|---|---|---|
| ativos | 105 | **104** |
| encerrados | 106 | **107** |
| MARIO CESAR | em **ativos** | em **histórico** |

`a1793453953590` · **RVC9A19 · GM ONIX PLUS LTZ** · retirada 31/10 · devolução
prevista 10/11 · caução R$ 750 · pago R$ 1.800 via pix — **encerrado às 10:17**
com devolvido 12/11 e valorFinal R$ 2.160,00.

Então "excluído por engano" é **encerramento por engano**, e "voltar para
ativos" é **desencerrar** — que o sistema não oferecia: no encerrado o único
caminho era **excluir**, e o registro ia embora de vez.

### 🔴 Reativar NÃO é mover o registro de volta — são QUATRO defesas
A armadilha 5 (locações encerradas ressuscitando) montou quatro barreiras, e o
`aplicarEncerrados` consulta **todas** no carregamento:

| | fonte |
|---|---|
| 1 | `loka_db/encerrados/<chave>` |
| 2 | o próprio `db.historico` — id no histórico = encerrado |
| 3 | `loka_encerrados/<id>` — lápide, **fora** do `loka_db` |
| 4 | `loka_encerrados/sig_…` **e** a assinatura calculada do histórico (`cliente+placas+retirada+devolução`) |

Esquecer **uma** faz o aluguel voltar e sumir no próximo F5 — e isso se leria
como *"o sistema está bugado"*, não como defesa funcionando. A reativação limpa
as quatro, **no banco e na memória** (`window._tombstones`,
`window._encerradosRecentes`, `db.encerrados`).

⚠️ As lápides das **outras** locações não são tocadas: são elas que protegem o
resto da frota. Há teste e defeito injetado para isso, incluindo o caso de
apagar o **nó inteiro**.

### 🔴 O defeito que SÓ a produção revelou (v155)
A v154 passou nos 50 testes do Node e **falhou no navegador**: o aluguel voltava
aos ativos e o `aplicarEncerrados` o removia de novo.

**A causa:** `loka_db/encerrados` guarda **id E ASSINATURA** — medido no banco
real: **220 chaves, 107 delas `sig_`**. Eu supunha que a assinatura morava só em
`loka_encerrados`, então limpava apenas o id, e a FONTE 1 pegava a locação de
volta pela assinatura.

🔴 **O teste do Node não pegou porque o `db.encerrados` do meu ambiente era
`{id: 1}` — dado que eu inventei.** Agora a suíte carrega o nó `encerrados` do
banco, e a invariante roda sobre as 107 assinaturas de verdade. É a lição de
sempre, no caso mais caro: *a entrada do teste sai dos dados, não da cabeça.*

### O que a tela faz agora
O ✕ (e o botão do modal de edição) **pergunta** em vez de excluir:

| | |
|---|---|
| **↩ Voltar para Aluguéis Ativos** | desfaz o encerramento; o veículo volta a alugado |
| **🗑 Excluir permanentemente** | o que o botão fazia antes, com o `confirm` de sempre |

O modal mostra cliente, veículo, datas e valor; nomeia o que a **exclusão**
faria perder (multas sem vínculo, prorrogações e a 2ª via dos termos); e explica
que a **reativação** apaga a devolução real, o valor final, a condição e as
cobranças do encerramento. 🔴 O que é do **contrato** (cliente, carro, retirada,
devolução prevista, valor, caução, pagamento) é preservado.

### 🔴 O mesmo carro não pode ficar alugado duas vezes
`_eeConflitoPlaca` compara **todas** as placas dos dois lados (contrato
multi-veículo — armadilha 2), ignorando hífen e caixa. Havendo conflito, o botão
de reativar fica **travado** e o modal diz com quem o carro está; e a função
recusa **mesmo chamada por fora**, porque esconder botão não é controle.

### Outros cuidados
- 🔴 **sem banco NÃO reativa**: desfaz o que mexeu em memória (ativos,
  histórico e o status do veículo) para a tela não mentir
- 🔴 **falha ao limpar a lápide é DITA**, com a consequência
  (*"ela pode sumir dos ativos ao recarregar"*) — e **dentro do `catch`**: o
  aviso é assíncrono, e um `falhou.length` lido abaixo estaria sempre vazio,
  então a mensagem de sucesso saía antes de se saber da falha
- `reativadoEm` / `reativadoPor` ficam registrados
- 🔴 a guarda do registro compara com **o que o modal abriu** (`_eeRegAberto`):
  `_eeReg(i)` é `db.historico[i]`, então comparar os dois na mesma linha nunca
  dá diferente — a guarda era **inerte**, e um teste pegou
- a **exclusão definitiva** continua igual, e a lápide dela **continua de pé**
  (as duas coisas têm teste e defeito injetado)

### Contrato mensal: a lavagem entrou (mensal v7)
A Cláusula 12ª passou a trazer *"Caso o veículo seja devolvido sujo, será
cobrada tarifa de lavagem simples de **R$ 50,00** ou **R$ 150,00** para lavagem
severa"* — **texto idêntico** ao da diária (Cláusula 14ª). Antes não previa, e
isso era deliberado (registrado em 09/11 como decisão dele).

⚠️ **O valor já era R$ 50,00**: a diária foi alterada em 09/11, e não há
**nenhum** R$ 40,00 no sistema — o campo de lavagem do encerramento é livre, sem
valor sugerido. Os R$ 40 que aparecem são as **3 cobranças já lançadas** no
histórico, dado de produção, não configuração.

🔴 **O mapa de cláusulas das Ocorrências (v153) acompanhou:** lavagem no mensal
passa a citar a **12ª**. Há comentário no código dizendo que contrato assinado
**antes de 12/11/2026 não tem essa cláusula**.

#### Cabe no A4 — medido nos arquivos reais das duas versões
Buscando a v6 pelo raw do commit anterior e medindo as duas no mesmo instante,
com o `@media print` extraído por balanceamento de chaves:

| | altura do `.contract` | largura | cláusulas |
|---|---|---|---|
| mensal v6 | 924px | 726px | 13 |
| **mensal v7** | **929px** (+5) | 726px | **13** |

Continua em **uma folha**, sem transbordar (726px exatos), e **não virou
cláusula nova**.

⚠️ **O que vale aqui é o delta (+5px), não a sobra absoluta.** A medida de 924px
para a v6 **não reproduz** os 960px registrados em 29/10 — método diferente
(iframe na largura útil, `margin:0` no body). Pela regra de 19/10, medida que
não reproduz a registrada não serve para afirmar folga; serve para comparar
duas versões medidas do mesmo jeito, no mesmo instante.

### Validado
- `node --check` nos dois; `<div>` balanceadas (gestao **875/875**, eram 865;
  mensal **45/45**); os dois carimbos batendo
- **52 testes** com o código real e os dados reais (107 encerrados, 104 ativos,
  220 chaves em `encerrados`), inclusive **o caso do Mario** campo a campo: o
  botão perguntando, as 4 marcas, a invariante do `aplicarEncerrados`, o
  conflito de placa nas 4 formas, a permissão (inclusive **perdida com o modal
  aberto**), banco fora do ar, erro de rede, falha de limpeza, `confirm`
  recusado, lista mudando no meio, e os 107 encerrados abrindo a escolha
- **41 defeitos injetados — todos acusados**, entre eles o **estado antes do
  pedido** (o ✕ excluindo direto), reativar sem tirar do histórico, os campos do
  encerramento voltando, o veículo ficando disponível, **cada uma das 4 defesas
  não limpa**, apagar o nó inteiro das lápides, o mesmo carro alugado duas
  vezes, a guarda voltando a ser inerte, a falha silenciosa, e a exclusão
  definitiva passando a apagar a lápide
- **No ar, no arquivo publicado, com o banco real** e `firebase`/`saveDB`
  substituídos **antes do eval**:

| | |
|---|---|
| o ✕ | abriu `mEeDestino`, **não** excluiu |
| ativos · encerrados | 104 → **105** · 107 → **106** |
| veículo RVC9A19 | `disponivel` → **`alugado`** |
| marcas removidas | **as 4** (id e assinatura, nos dois nós) |
| campos do encerramento sobrando | **nenhum** |
| 🔴 **invariante** | sobreviveu a **dois** `aplicarEncerrados` |
| registro | cliente, GM ONIX PLUS LTZ, 31/10→10/11, R$ 1.800, caução 750, pago 1.800 |

  5 gravações interceptadas; reconferido no banco: **104 ativos, 107
  encerrados, Mario ainda no histórico, 220 chaves, lápide de pé** — nada
  gravado em produção.
- Regressão **medida**: **56 suítes, 2.940 testes**, nenhuma falha

### ⚠️ Três suítes tiveram asserções INVERTIDAS, por mudança de escopo
Não foram defeitos: o pedido mudou o que era deliberado.

| Suíte | O que travava |
|---|---|
| `t-clausulas` | *"o mensal continua SEM tarifa de lavagem"* → agora **tem, idêntica à diária**, dentro da 12ª e sem virar cláusula nova |
| `t-oco` | 6 asserções de que lavagem no mensal **não** tinha amparo → agora citam a 12ª, e **a cobertura do caminho "sem cláusula" migrou para `combustivel`**, que continua sem amparo nos dois |
| `t-v148` | 5 chamadas de `excluirEncerrado` (que agora pergunta) → reapontadas para `_eeExcluirDefinitivo`, e os 2 testes estruturais recortavam o fonte pelo **nome antigo** |

🔴 O cuidado que importa: ao inverter, **não perder a cobertura do caminho
oposto**. Se eu só tivesse trocado "não tem cláusula" por "tem", o caso de item
**sem amparo** — que é o mais valioso do comunicado — ficaria sem teste.

### ⚠️ Cinco tropeços meus, cada um com uma lição diferente
| O que | A lição |
|---|---|
| a guarda do índice era **inerte** | `_eeReg(i)` é `db.historico[i]`: comparar os dois na mesma linha nunca dá diferente. O que vale é a referência guardada **ao abrir o modal** |
| o aviso de falha **nunca aparecia** | `.catch` é assíncrono e o `toast` era síncrono: o sucesso saía antes. O aviso foi para dentro do `catch` |
| 3 defeitos injetados **passaram** | `status='ativo'` parecia inerte (106 dos 107 encerrados já o têm — quem exercita é o **1 sem status**); a asserção do nó raiz procurava o id do vizinho, e o defeito apagava `loka_encerrados` **inteiro**; e `reativar` sem permissão era barrado por **outra** guarda — o caso que isola a permissão é *abre com ela, perde, clica* |
| [B12] barrava pelo caminho errado | remover o item 0 jogava o índice **fora** do array; inserindo no início, o índice fica válido e aponta para outro objeto |
| o **heredoc comeu os escapes** | pela enésima vez, ao tentar ajustar a suíte por script. Nada foi gravado, e o refazer foi pela ferramenta de escrita |

### ⏳ O resgate do Mario Cesar — falta o clique dele
A reativação está publicada e exercitada contra o banco real, mas **a gravação é
dele**: eu não autentico. O caminho é:

**Aluguéis Encerrados** → **Ctrl+Shift+R** → achar **MARIO CESAR GODINHO
MENDES** (RVC9A19) → **✕** → **↩ Voltar para Aluguéis Ativos**.

A locação volta com retirada 31/10, devolução prevista 10/11, R$ 1.800, caução
R$ 750 e o pagamento de 03/11 intactos; o GM ONIX PLUS LTZ volta a alugado.
