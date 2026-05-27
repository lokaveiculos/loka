# 🔥 Configuração Firebase — LOKÁ Sistema

## 1. Criar projeto Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Nome: `loka-sistema`
4. Desative Google Analytics (opcional)
5. Clique em **"Criar projeto"**

---

## 2. Ativar Realtime Database

1. No menu lateral → **Realtime Database**
2. Clique em **"Criar banco de dados"**
3. Escolha localização: **us-central1** (ou southamerica-east1)
4. Modo: **Iniciar no modo de teste** (por enquanto)
5. Clique em **"Ativar"**

---

## 3. Aplicar as regras de segurança

1. Na aba **Regras** do Realtime Database
2. Substitua o conteúdo pelo arquivo `database.rules.json`
3. Clique em **"Publicar"**

---

## 4. Obter as credenciais

1. Na engrenagem ⚙️ → **Configurações do projeto**
2. Role até **"Seus aplicativos"**
3. Clique em **"</> Web"**
4. Nome do app: `loka-web`
5. Copie o objeto `firebaseConfig`

---

## 5. Colar as credenciais

Abra o arquivo **`firebase-config.js`** e substitua:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "COLE_AQUI_SUA_API_KEY",
  authDomain:        "COLE_AQUI.firebaseapp.com",
  databaseURL:       "https://COLE_AQUI-default-rtdb.firebaseio.com",
  projectId:         "COLE_AQUI",
  storageBucket:     "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI"
};
```

pelos valores reais copiados do Firebase.

---

## 6. Deploy no GitHub Pages

1. Faça upload de **todos os arquivos** para o repositório `lokaveiculos/loka`
2. O `firebase-config.js` deve estar na mesma pasta que o `index.html`
3. Aguarde o Pages publicar

---

## ✅ Verificação

Após o deploy, abra o console do navegador (F12) e verifique:
- Sem erros de `Firebase`
- Mensagem "Sincronizando dados..." aparece ao abrir o painel
- Dados persistem ao fechar e reabrir o navegador

---

## 📊 Estrutura de dados no Firebase

```
loka_db/
  clients/    ← cadastro de clientes
  veiculos/   ← frota de veículos
  ativos/     ← aluguéis ativos
  contratos/  ← contratos gerados
  vistorias/  ← checklists de vistoria

loka_users/   ← usuários do sistema

_pass/
  client/     ← passagem temporária de dados entre páginas
```

---

## 🔒 Próximo passo (autenticação)

Quando quiser adicionar login, basta ativar o **Firebase Authentication**
no console e configurar os provedores desejados (e-mail, Google, etc.).
