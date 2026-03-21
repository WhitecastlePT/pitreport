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
| `latlong2` | ^0.9.1 | Coordenadas geograficas |
| `provider` | ^6.1.5+1 | Gestão de estado |

---

# 5. Configuração Firebase

O projeto Firebase `pit-report` ja esta configurado. O ficheiro `lib/firebase_options.dart` ja existe com as chaves para Android, iOS, macOS, Windows e Web.

**Nao e necessario correr `flutterfire configure`** a menos que mudes de projeto Firebase.

Se precisares de reconfigurar:

```bash
flutterfire configure
```

Selecionar o projeto `pit-report` e as plataformas desejadas.

---

# 6. Dispositivo de Teste

Escolher uma das opcoes:

### Opcao A — Emulador Android

1. Abrir Android Studio
2. Ir a **Device Manager**
3. Criar um novo dispositivo virtual (AVD)
4. Recomendado: Pixel 8, API 35

### Opcao B — Telemovel Android Real

Ativar no telemovel:

**Definicoes > Opcoes de Programador > Depuracao USB**

Ligar por USB e confirmar a autorizacao no telemovel.

Verificar se o dispositivo e reconhecido:

```bash
flutter devices
```

---

# 7. Correr o Projeto

```bash
flutter run
```

Para correr num dispositivo especifico:

```bash
flutter run -d <device-id>
```

Listar dispositivos disponiveis:

```bash
flutter devices
```

---

# 8. Permissoes Android Configuradas

O ficheiro `AndroidManifest.xml` ja tem as permissoes necessarias declaradas:

- `ACCESS_FINE_LOCATION` — GPS preciso
- `ACCESS_COARSE_LOCATION` — GPS aproximado
- `CAMERA` — acesso a camera
- `READ_MEDIA_IMAGES` — acesso a galeria (Android 13+)

Nao e necessario alterar o `AndroidManifest.xml`.

---

# 9. Estrutura de Dados Firebase

### Colecao: `reports`

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | string | Identificador unico |
| `title` | string | Titulo da denuncia |
| `description` | string | Descricao detalhada |
| `category` | string | Categoria do problema |
| `imageUrl` | string | URL da imagem no Storage |
| `latitude` | number | Latitude GPS |
| `longitude` | number | Longitude GPS |
| `address` | string | Morada resolvida |
| `status` | string | Estado da denuncia |
| `createdAt` | timestamp | Data de criacao |
| `userId` | string | ID do utilizador |

### Colecao: `users`

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | string | Identificador unico |
| `name` | string | Nome do utilizador |
| `email` | string | Email |
| `createdAt` | timestamp | Data de registo |

---

# 10. Comandos Uteis

```bash
# Instalar dependencias
flutter pub get

# Correr a app
flutter run

# Listar dispositivos
flutter devices

# Executar testes
flutter test

# Analisar codigo (lint)
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

# 11. Checklist de Verificacao

Antes de correr o projeto, confirmar:

- [ ] Flutter SDK instalado e no PATH (`flutter doctor` sem erros criticos)
- [ ] Android Studio instalado com Android SDK (API 35)
- [ ] JDK 17 disponivel
- [ ] Git instalado
- [ ] Node.js e npm instalados
- [ ] Firebase CLI instalado e com login feito (`firebase login`)
- [ ] FlutterFire CLI instalado
- [ ] Repositorio clonado
- [ ] `flutter pub get` executado com sucesso
- [ ] Emulador criado ou telemovel ligado por USB com depuracao ativa
- [ ] `flutter devices` mostra pelo menos um dispositivo disponivel

---

# 12. Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Frontend | Flutter (Dart) |
| Autenticacao | Firebase Authentication |
| Base de dados | Cloud Firestore |
| Armazenamento de imagens | Firebase Storage |
| Mapa | OpenStreetMap via `flutter_map` (gratuito, sem API Key) |
| Localizacao GPS | `geolocator` + `geocoding` |
| Camara/Galeria | `image_picker` |
| Estado | `provider` |

---

*Projeto academico — Mestrado*
