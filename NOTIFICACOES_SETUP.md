# Guia de Configuração — Notificações FCM

## Como funciona

```
Admin altera estado (web)
  → escreve em /notifications (Firestore)
  → Backend Node.js deteta e envia FCM
  → Telemóvel recebe notificação (mesmo com app fechada)
```

---

## O que já está feito (código no GitHub)

- **Admin web** (`pitreport-admin`) — ao guardar estado, escreve em `/notifications`
- **Mobile** (`pitreport`) — `firebase_messaging` + `flutter_local_notifications` adicionados, FCM token guardado no login
- **Backend** (`pitreport-backend`) — serviço Node.js que escuta `/notifications` e envia FCM

---

## Passos que tens de fazer

### Passo 1 — Gerar chave de serviço Firebase

1. Vai a [console.firebase.google.com](https://console.firebase.google.com)
2. Seleciona o projeto **pit-report**
3. Clica na **engrenagem** (Definições do projeto) → **Contas de serviço**
4. Clica em **"Gerar nova chave privada"**
5. Confirma → descarrega o ficheiro `.json`
6. **Guarda este ficheiro** — precisas dele no Passo 2

---

### Passo 2 — Criar o backend no Render.com

1. Vai a [dashboard.render.com](https://dashboard.render.com)
2. Clica **New +** → **Web Service**
3. Liga o repositório `WhitecastlePT/pitreport`
4. Preenche as definições:

| Campo | Valor |
|---|---|
| **Name** | `pitreport-backend` |
| **Root Directory** | `pitreport-backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | `Free` |

5. Antes de fazer deploy, vai a **Environment Variables** e adiciona:

| Variável | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | *(ver instruções abaixo)* |

#### Como colocar o JSON na variável de ambiente

O ficheiro JSON descarregado tem várias linhas. Tens de o colocar **numa única linha** sem espaços extra.

No terminal (PowerShell), corre este comando apontando para o ficheiro descarregado:
```powershell
(Get-Content "C:\caminho\para\serviceAccount.json" -Raw) -replace "`r`n","" -replace "`n","" | Set-Clipboard
```
Depois cola no campo do Render. O valor deve começar por `{"type":"service_account",...}`.

6. Clica **Create Web Service** → aguarda o deploy ficar verde ✅

---

### Passo 3 — Manter o backend acordado (UptimeRobot)

O Render no plano gratuito adormece após 15 minutos sem pedidos. Para o backend nunca adormecer:

1. Cria conta gratuita em [uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor**:

| Campo | Valor |
|---|---|
| **Monitor Type** | `HTTP(s)` |
| **Friendly Name** | `PitReport Backend` |
| **URL** | `https://pitreport-backend.onrender.com/health` |
| **Monitoring Interval** | `5 minutes` |

3. Clica **Create Monitor**

> O URL exato do backend aparece no dashboard do Render após o deploy.

---

### Passo 4 — Compilar e instalar o APK atualizado

No terminal, dentro da pasta `pitreport`:

```bash
flutter pub get
flutter build apk --release
```

O APK gerado fica em `build/app/outputs/flutter-apk/app-release.apk`.

Instala no telemóvel e faz **login** — o token FCM é guardado automaticamente no Firestore nesse momento.

---

### Passo 5 — Testar

1. Abre o site admin em [pitreport.onrender.com](https://pitreport.onrender.com)
2. Abre uma denúncia → altera o estado → clica **Guardar**
3. O telemóvel deve receber uma notificação com o texto:
   > **Denúncia atualizada**
   > "Título da denúncia" → Em progresso

---

## Resolução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| Notificação não chega | Backend adormecido | Verificar UptimeRobot + logs no Render |
| Notificação não chega | FCM token não guardado | Fazer logout e login novamente na app |
| Backend não arranca | JSON inválido na variável | Verificar se o JSON está numa linha só |
| App não pede permissão | Permissões negadas anteriormente | Definições do Android → PitReport → Notificações → Ativar |
