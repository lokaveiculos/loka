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

# SISTEMA AUTO MAIS (CRM de venda de veículos)

AUTO MAIS COMERCIO E CORRETORA DE VEÍCULOS LTDA · CNPJ 05.622.137/0001-00
Rua Juarez Távora, 346 — São João — Feira de Santana/BA.
Mesmo dono (Rogel). **Empresa e banco separados da LOKÁ.**

Origem: pacote `AutoMais_Deploy.zip` entregue pronto pelo Rogel (13 arquivos).
Publicado sem reescrever o sistema — só ajustes pontuais.

## Linha do tempo (importante para não repetir confusão)

| Data | O quê |
|---|---|
| 19/08/2026 | Publicado em `/automais` (commit `494dadc`) |
| 21/08/2026 | **Removido do ar a pedido do Rogel** (revert `4b8de64`) |
| 26/08/2026 | Rogel reportou "a tela do CRM não abre" — era o próprio revert. Republicado como **v2** (`a38f002`) já sem senha no código |
| 26/08/2026 | Rogel: "abriu sem o CRM". Diagnóstico: **o `AutoMais_Deploy.zip` nunca teve CRM** (zero ocorrências da palavra nos 13 arquivos). O CRM foi então **criado do zero** — `crm.html`, **v3** (`4e2df17`) |

## Onde está

| Onde | O quê |
|---|---|
| `loka/automais/index.html` | Site institucional "Em Breve" (público) |
| `loka/automais/sistema/` | O CRM, 9 páginas |

- Site: https://lokaveiculos.com.br/automais/
- CRM: https://lokaveiculos.com.br/automais/sistema/login.html

⚠️ Mora **dentro do repo `loka`** para aproveitar o GitHub Pages existente.
O domínio próprio `automaiscar.com.br` ainda **não** aponta pra cá.

## Stack (diferente da LOKÁ — não confundir)

| | LOKÁ | Auto Mais |
|---|---|---|
| Banco | Realtime Database | **Firestore** |
| Projeto Firebase | `loka-b8dd2` | **`automais-6afbb`** |
| SDK | compat 9.23.0 | compat **10.7.1** |
| Carimbo | `LOKA deploy:` / `LOKA_BUILD` | `AUTOMAIS deploy:` / `AUTOMAIS_BUILD` |

Coleções: `veiculos clientes fornecedores contratos vendas manutencoes
usuarios despesas` + `config/empresa`.
Compartilhado: `sistema/firebase-shared.js` (cache localStorage `automais_v3`,
sessão `am_user` válida por 8h, helpers `fsave`/`fdel`). CSS em `sistema/ds.css`.
⚠️ `login.html` **não** carrega o `firebase-shared.js` — inicializa o Firebase
sozinho no fim do arquivo. Por isso `AUTOMAIS_BUILD` não existe nessa página.

## Build atual

| Arquivo | Build |
|---|---|
| todos os HTML de `automais/` | **v3-20260826-1310** |

## CRM (`automais/sistema/crm.html`) — criado em 26/08/2026

**Não veio no zip — foi escrito do zero.** Reaproveita o esqueleto real do
`cadastros.html` (head, sidebar, topbar, modal e utilitários das linhas 1–235),
com o miolo de JS próprio. Se o layout comum mudar, essa página não acompanha
sozinha — foi cópia, não include.

Coleção Firestore nova: **`leads`**.
⚠️ `leads` **não está em `COLS`** do `firebase-shared.js`, então
`loadFromFirestore()` não a carrega — `crm.html` lê por conta própria em
`carregarLeads()`. Se um dia entrar em `COLS`, remover a leitura duplicada.

Etapas do funil (escolhidas pelo Rogel, com a análise do banco no meio):
`novo → contato → visita → proposta → banco → fechado` + `perdido`.

Campos do lead: `nome telefone email veiculo_id origem vendedor etapa
proximo_contato valor_proposta troca troca_desc obs motivo_perda
criadoEm atualizadoEm fechadoEm`.

Recursos: quadro estilo kanban com **arrastar e soltar** entre colunas,
filtro por vendedor/origem/busca, marcação de **retorno atrasado** (data de
`proximo_contato` vencida e lead ainda em aberto), link direto de WhatsApp
(`wa.me/55` + telefone sem máscara) e três indicadores no topo.

O item **CRM** foi adicionado ao menu lateral das 7 páginas com sidebar.
`despesa_form.html` não tem menu — ficou de fora de propósito.

## Autenticação (reescrita na v2 — 26/08/2026)

Antes: `USERS_FIXOS` no `login.html` com `rogel` / `daniel01` em texto puro,
num arquivo servido publicamente. **Removido.**

Agora o `login.html`:
1. consulta a coleção `usuarios` do Firestore (`where login == u`);
2. confere a senha por **SHA-256 + salt aleatório** (`senhaHash` + `salt`),
   via `crypto.subtle` — exige HTTPS, o que o site tem;
3. aceita registros **legados em texto puro** (campo `senha`) e os **converte
   para hash no primeiro login certo**, apagando o texto puro do banco
   (`_migrarParaHash`);
4. cai no cache `localStorage` só se o Firestore estiver fora do ar.

**Primeiro acesso:** como não sobrou admin no código, o `login.html` mostra um
bloco "Nenhum administrador cadastrado" **enquanto não existir nenhum usuário
com `perfil:'admin'`**. Criado o admin, o bloco some sozinho. Há dupla checagem
antes de gravar, para não criar dois.

Em 26/08/2026 a coleção tinha 3 usuários — `thaina`, `sandro`, `bruno`, todos
`perfil:'atendimento'` e senha em texto puro. Nenhum admin.

## Pendências abertas — Auto Mais

| # | Pendência | Prioridade |
|---|---|---|
| A1 | 🔴 Regras do Firestore **abertas** — `GET .../documents/usuarios` responde **HTTP 200 sem login**. Qualquer um lê e grava. O hash protege a senha, mas não impede alguém de criar/alterar registros. **É a pendência mais séria da Auto Mais.** | 🔴 |
| A2 | 🟠 Migrar login para **Firebase Auth** — resolve A1 de vez e elimina senha guardada por conta própria | 🟠 |
| A3 | 🟠 `appId` do `firebaseConfig` parece placeholder (`...web:1e9c3d7e5b5b5b5b5b5b5b`). Firestore só precisa de `projectId`+`apiKey`, então não quebrou — conferir antes de usar Analytics/Auth | 🟠 |
| A4 | 🟡 Apontar `automaiscar.com.br` para cá, ou mover pra repo próprio **privado** | 🟡 |
| A5 | 🟡 Trocar as senhas de `thaina`, `sandro` e `bruno` — estiveram em texto puro num banco aberto, considerar comprometidas | 🟡 |

## Correções aplicadas no deploy

- `index.html` vinha com `href="/sistema/login.html"` (**absoluto**): numa
  subpasta isso mandava o visitante pro sistema da **LOKÁ**. Corrigido para
  relativo. ✅ verificado no navegador.

## Testado em 26/08/2026 (navegador, sem login)

- ✅ `USERS_FIXOS` não existe mais na página publicada; `grep daniel01` = 0
- ✅ `crypto.subtle` disponível, funções de hash carregadas
- ✅ bloco de primeiro acesso aparece (confirma que não há admin no banco)
- ✅ console sem erros
- ✅ 14 testes de senha passando (hash, senha errada, legado em texto puro)
- ⏳ **falta testar logado** — Rogel precisa criar o admin; eu não digito senha
