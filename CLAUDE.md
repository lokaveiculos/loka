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
   navegador e verificar se a funcionalidade está OK (console, rede, render).
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
| `C:\...\Github\deploy` | Backend Cloud Functions e-Frotas — **NÃO é repo git** |

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
| `gestao.html` | **v84-20260817-1130** |
| `fatura.html` | v75-20260812-1700 |
| `multas.html` | **sem carimbo de versão** (pendência) |

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
| 4 | `multas.html` tem erros conhecidos + não tem carimbo de versão | 🟠 |
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
