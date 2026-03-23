# Manual de Instalação do Ambiente de Desenvolvimento

## Projeto: PitReport — Aplicação de Denúncia de Problemas Urbanos

Este documento descreve **todo o software e configurações necessárias** para correr o projeto `pitreport` localmente.

---

# 1. Requisitos de Sistema

| Componente | Versão mínima |
|---|---|
| Flutter SDK | 3.11.3 |
| Dart SDK | 3.11.3 (incluído no Flutter) |
| Android Gradle Plugin | 8.11.1 |
| Kotlin | 2.2.20 |
| Java (JDK) | 17 |
| Android SDK | API 35+ (compileSdk) |
| Android SDK Platform Tools | mais recente |

---

# 2. Software a Instalar

## 2.1 Flutter SDK

Instalar Flutter (inclui Dart):

https://docs.flutter.dev/get-started/install

Após instalar, adicionar Flutter ao PATH do sistema.

Verificar instalação:

```bash
flutter doctor
```

Todos os itens devem estar marcados como OK (exceto plataformas que não vais usar, como iOS/macOS se estiveres em Windows).

---

## 2.2 Android Studio

Instalar: https://developer.android.com/studio

Necessário para:
- Android SDK
- Android SDK Platform Tools
- Android Build Tools
- Criação e gestão de emuladores

Após instalar, abrir o Android Studio e instalar os seguintes componentes em **SDK Manager**:

- Android SDK Platform (API 35)
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator

Configurar a variável de ambiente `ANDROID_HOME` apontando para a pasta do Android SDK (normalmente `C:\Users\<user>\AppData\Local\Android\Sdk` no Windows).

---

## 2.3 Java Development Kit (JDK 17)

O JDK 17 é necessário para compilar o projeto Android.

O Android Studio instala o JDK automaticamente. Podes usar o JDK embutido do Android Studio ou instalar manualmente:

https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html

Verificar versão:

```bash
java -version
```

---

## 2.4 Git

Instalar: https://git-scm.com/

Verificar instalação:

```bash
git --version
```

---

## 2.5 Node.js (necessário para Firebase CLI)

Instalar a versão LTS: https://nodejs.org/

Verificar instalação:

```bash
node --version
npm --version
```

---

## 2.6 Firebase CLI

Instalar:

```bash
npm install -g firebase-tools
```

Fazer login:

```bash
firebase login
```

---

## 2.7 FlutterFire CLI

Instalar:

```bash
dart pub global activate flutterfire_cli
```

Garantir que `~/.pub-cache/bin` (Linux/macOS) ou `%APPDATA%\Pub\Cache\bin` (Windows) está no PATH.

---

## 2.8 Visual Studio Code (opcional, recomendado)

https://code.visualstudio.com/

Extensões a instalar:
- **Flutter** (inclui Dart)
- **Dart**

---

# 3. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd pitreport/pitreport
```

---

# 4. Instalar Dependências do Projeto

Dentro da pasta `pitreport/pitreport` (onde está o `pubspec.yaml`):

```bash
flutter pub get
```

Dependências instaladas automaticamente:

| Package | Versão | Finalidade |
|---|---|---|
| `firebase_core` | ^4.5.0 | Inicialização Firebase |
| `firebase_auth` | ^6.2.0 | Autenticação de utilizadores |
| `cloud_firestore` | ^6.1.3 | Base de dados NoSQL |
| `firebase_storage` | ^13.1.0 | Upload de imagens |
| `geolocator` | ^14.0.2 | Localização GPS |
| `geocoding` | ^4.0.0 | Conversão coordenadas/morada |
| `image_picker` | ^1.2.1 | Câmara e galeria |
| `flutter_map` | ^8.2.2 | Mapa (OpenStreetMap) |
| `latlong2` | ^0.9.1 | Coordenadas geográficas |
| `provider` | ^6.1.5+1 | Gestão de estado |
| `flutter_compass` | ^0.8.0 | Bússola em tempo real |
| `google_mlkit_face_detection` | ^0.13.2 | Deteção de rostos nas fotos (on-device) |
| `intl` | ^0.20.2 | Formatação de datas |
| `fl_chart` | ^1.2.0 | Gráficos estatísticos |

---

# 5. Configuração Firebase

O projeto Firebase `pit-report` já está configurado. O ficheiro `lib/firebase_options.dart` já existe com as chaves para Android, iOS, macOS, Windows e Web.

**Não é necessário correr `flutterfire configure`** a menos que mudes de projeto Firebase.

Se precisares de reconfigurar:

```bash
flutterfire configure
```

Selecionar o projeto `pit-report` e as plataformas desejadas.

## 5.1 Índice Composto Firestore

A query de listagem de denúncias por utilizador requer um índice composto. Criar em:

**Firebase Console → Firestore → Indexes → Add index**

| Coleção | Campo 1 | Campo 2 | Ordem |
|---|---|---|---|
| `reports` | `userId` (Ascending) | `createdAt` (Descending) | — |

O link direto para criar o índice aparece nos logs do Android quando a query falha pela primeira vez.

## 5.2 Firebase Storage — Plano de Preços

O Firebase Storage requer o plano **Blaze (pay-as-you-go)**. Para uso académico o custo é efetivamente zero (generous free tier: 5 GB storage, 1 GB/dia download).

---

# 6. Dispositivo de Teste

Escolher uma das opções:

### Opção A — Emulador Android

1. Abrir Android Studio
2. Ir a **Device Manager**
3. Criar um novo dispositivo virtual (AVD)
4. Recomendado: Pixel 8, API 35

> **Nota**: O emulador não tem sensor de bússola físico. A orientação das fotografias ficará como "não disponível" no emulador. Testar num dispositivo real para funcionalidade completa.

### Opção B — Telemóvel Android Real

Ativar no telemóvel:

**Definições → Opções de Programador → Depuração USB**

Ligar por USB e confirmar a autorização no telemóvel.

Verificar se o dispositivo é reconhecido:

```bash
flutter devices
```

---

# 7. Correr o Projeto

```bash
flutter run
```

Para correr num dispositivo específico:

```bash
flutter run -d <device-id>
```

Listar dispositivos disponíveis:

```bash
flutter devices
```

---

# 8. Permissões Android Configuradas

O ficheiro `AndroidManifest.xml` já tem as permissões necessárias declaradas:

- `ACCESS_FINE_LOCATION` — GPS preciso
- `ACCESS_COARSE_LOCATION` — GPS aproximado
- `CAMERA` — acesso à câmara
- `READ_MEDIA_IMAGES` — acesso à galeria (Android 13+)

Não é necessário alterar o `AndroidManifest.xml`.

---

# 9. Estrutura de Dados Firebase

### Coleção: `reports`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único (gerado pelo Firestore) |
| `title` | string | Título da denúncia |
| `description` | string | Descrição detalhada |
| `category` | string | Categoria do problema |
| `imageUrls` | array\<string\> | URLs das imagens no Storage |
| `photoMetadata` | array\<object\> | Metadados por foto (ver abaixo) |
| `latitude` | number | Latitude GPS da denúncia |
| `longitude` | number | Longitude GPS da denúncia |
| `address` | string | Morada resolvida por geocoding |
| `heading` | number | Orientação em graus (0–360) no momento de submissão |
| `headingLabel` | string | Direção cardeal (ex: "Norte", "Sudoeste") |
| `status` | string | `pending` \| `in_progress` \| `resolved` |
| `createdAt` | timestamp | Data de criação |
| `userId` | string | ID do utilizador Firebase Auth |

#### Estrutura de `photoMetadata` (por foto)

| Campo | Tipo | Descrição |
|---|---|---|
| `url` | string | URL da foto no Firebase Storage |
| `latitude` | number | Latitude GPS no momento da foto |
| `longitude` | number | Longitude GPS no momento da foto |
| `heading` | number | Orientação em graus no momento da foto |
| `headingLabel` | string | Direção cardeal no momento da foto |

### Coleção: `users`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Identificador único |
| `name` | string | Nome do utilizador |
| `email` | string | Email |
| `createdAt` | timestamp | Data de registo |

---

# 10. Comandos Úteis

```bash
# Instalar dependências
flutter pub get

# Atualizar dependências
flutter pub upgrade --major-versions

# Correr a app
flutter run

# Listar dispositivos
flutter devices

# Executar testes
flutter test

# Analisar código (lint)
flutter analyze

# Build APK Android (debug)
flutter build apk

# Build APK Android (release)
flutter build apk --release

# Reconfigurar Firebase
flutterfire configure

# Verificar ambiente
flutter doctor
```

---

# 11. Checklist de Verificação

Antes de correr o projeto, confirmar:

- [ ] Flutter SDK instalado e no PATH (`flutter doctor` sem erros críticos)
- [ ] Android Studio instalado com Android SDK (API 35)
- [ ] JDK 17 disponível
- [ ] Git instalado
- [ ] Node.js e npm instalados
- [ ] Firebase CLI instalado e com login feito (`firebase login`)
- [ ] FlutterFire CLI instalado
- [ ] Repositório clonado
- [ ] `flutter pub get` executado com sucesso
- [ ] Índice composto Firestore criado (`userId` + `createdAt`)
- [ ] Firebase Storage ativo (plano Blaze)
- [ ] Emulador criado ou telemóvel ligado por USB com depuração ativa
- [ ] `flutter devices` mostra pelo menos um dispositivo disponível

---

# 12. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Flutter (Dart) |
| Autenticação | Firebase Authentication |
| Base de dados | Cloud Firestore |
| Armazenamento de imagens | Firebase Storage |
| Mapa | OpenStreetMap via `flutter_map` (gratuito, sem API Key) |
| Localização GPS | `geolocator` + `geocoding` |
| Bússola | `flutter_compass` |
| Câmara/Galeria | `image_picker` |
| Deteção de rostos | `google_mlkit_face_detection` (on-device, offline) |
| Gráficos | `fl_chart` |
| Estado | `provider` |

---

*Projeto académico — Mestrado*
