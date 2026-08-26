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
| `gestao.html` | **v89-20260821-1139** |
| `fatura.html` | v75-20260812-1700 |
| `multas.html` | **v3-20260818-1552** |

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
| 1 | 🐞 `dispararConsultaMultas` **descarta `d.placas`** — o front envia, o backend ignora e varre a frota do índice 0. Custo real em consultas pagas. Ver abaixo. | 🔴 |
| 2 | Senhas em **texto puro** em `sistema/index.html` (inclui master) — considerar comprometidas | 🔴 |
| 3 | Regras do banco abertas (`.read/.write: true`) → exposição LGPD. Aplicar TRANSICAO v11 (exige `_writerBuild`), depois ALVO (exige login) | 🔴 |
| 4 | 🐞 No `gestao.html`, "Testar conexão" e "Diagnóstico" do painel e-Frotas **não avisam que custam** 1 consulta cobrada cada (já corrigido na `multas.html` v2) | 🟠 |
| 5 | Migrar login para **Firebase Auth** | 🟠 |
| 6 | TLS e-Frotas: `validarServidor = false` em `efrotas-client.js:76` — embutir cadeia ICP-Brasil | 🟠 |
| 7 | Reservas/Pré-Cadastro gravam sem login — precisam Auth anônimo ou Cloud Function antes do ALVO | 🟡 |
| 8 | Unificar nomes de oficina no histórico ("JT CAR MECANICA" / "JT CAR MECÂNICA" / "JT Car"…) | 🟡 |
| 9 | Limpar código morto: `mrComprovantes`, `pagDataIni/pagDataFim` | 🟢 |

### Detalhe da pendência 1 (bug confirmado)
- `gestao.html:7877` monta `_params.placas` quando há seleção.
- `functions/index.js:90` — `executarVarredura` **sabe** ler `opts.placas`.
- `functions/index.js:226-235` — o handler do callable repassa só
  `placa`, `inicio`, `tamanhoLote`. **`placas` nunca chega.**
- Correção: acrescentar `placas: d.placas` ao objeto repassado.

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
