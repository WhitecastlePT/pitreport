# PitReport

Aplicação móvel Flutter para denúncia de problemas urbanos, desenvolvida no âmbito de um projeto académico de Mestrado.

---

## Funcionalidades

### Autenticação
- Registo e login com email/password via Firebase Authentication

### Submissão de Denúncias
- Título, descrição e categoria do problema
- Múltiplas fotografias por denúncia (câmara ou galeria)
- **Deteção automática de rostos** — fotografias com rostos visíveis são rejeitadas (ML Kit on-device)
- Localização GPS automática com conversão para morada legível
- **Bússola em tempo real** — orientação visível durante o preenchimento
- Cada fotografia regista a sua própria localização GPS e orientação no momento em que é tirada

### As Minhas Denúncias
- Lista de todas as denúncias do utilizador autenticado
- Visualização de estado (Pendente / Em análise / Resolvido)
- Atualização em tempo real via Firestore stream

### Detalhe da Denúncia
- Visualização de todas as fotografias da denúncia
- Por cada fotografia: orientação (bússola) e coordenadas GPS registadas no momento da captura

### Mapa
- Mapa OpenStreetMap (gratuito, sem API Key)
- Apenas as denúncias do utilizador autenticado
- Filtro por estado (Pendente / Em análise / Resolvido)
- Filtro por categoria
- Pin principal por denúncia — ao tocar expande os pins de localização de cada fotografia (com seta de orientação)
- Card de informação ao tocar num pin

### Estatísticas
- Resumo: total de denúncias e percentagem de resolução
- Por estado: Pendentes / Em análise / Resolvidas
- Por categoria: gráfico pizza
- Evolução mensal: gráfico de barras (últimos 6 meses)
- Fotografias: total e média por denúncia
- Rosa dos ventos: distribuição das orientações das fotografias (gráfico radar)
- Top zonas com mais denúncias

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Flutter (Dart) |
| Autenticação | Firebase Authentication |
| Base de dados | Cloud Firestore |
| Armazenamento de imagens | Firebase Storage |
| Mapa | OpenStreetMap via `flutter_map` |
| Localização GPS | `geolocator` + `geocoding` |
| Bússola | `flutter_compass` |
| Câmara/Galeria | `image_picker` |
| Deteção de rostos | `google_mlkit_face_detection` (on-device) |
| Gráficos | `fl_chart` |
| Estado | `provider` |

---

## Modelo de Dados Firestore

### Coleção `reports`

```
id              string
title           string
description     string
category        string
imageUrls       array<string>
photoMetadata   array<{url, latitude, longitude, heading, headingLabel}>
latitude        number
longitude       number
address         string
heading         number
headingLabel    string
status          string  (pending | in_progress | resolved)
createdAt       timestamp
userId          string
```

### Coleção `users`

```
id          string
name        string
email       string
createdAt   timestamp
```

---

## Comandos

```bash
# Instalar dependências
flutter pub get

# Correr a app
flutter run

# Build APK debug
flutter build apk

# Analisar código
flutter analyze

# Executar testes
flutter test
```

---

## Configuração

Ver [manual de instalação](../manual_instalacao_app_denuncias.md) para instruções completas de setup do ambiente, Firebase e Firestore indexes necessários.

---

*Projeto académico — Mestrado*
