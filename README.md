# Сервер СИЗОД (sizod-server)

Монорепозиторий для сбора данных с ПЛК цеха СИЗОД по **OPC UA**, записи в MongoDB и визуализации во фронтенде.

- **`backend/`** — Express (ESM), Mongoose, опрос ПЛК на CODESYS по OPC UA через `@sorbent/platform-kit/opcua` (по одному worker'у на ПЛК, в development симулятор), объектные конфиги устройств, диагностика (дерево доступности), логирование Winston, **SSO** с главным сервером (`new-main-server`), раздача собранного SPA.
- **`frontend/`** — React 19 + TypeScript + Vite, `@sorbent/ui-kit`, MUI, SCSS.

Сейчас описана Станция 16 (`station16`, ОВЕН ПЛК210, `opc.tcp://169.254.0.238:4840`). Как добавлять ПЛК: README в каталоге `backend/src/features/monitoring/data/config/devices`.

## Возможности

- Опрос ПЛК из `backend/src/features/monitoring/data/config/polling/opcua` отдельным worker'ом на каждый ПЛК (в development `OpcUaSimulator`, в production `OpcUaClient`). Переменные, названия и преобразования описаны конфигами в `backend/src/features/monitoring/data/config/devices`.
- REST API текущих данных (`/api/<deviceId>-data`) и истории для графиков (`/api/:deviceId/data`).
- **`GET /api/monitoring/status`** — дерево состояния устройств (`schemaVersion: 2`, `ПЛК -> OPC UA -> устройство`); состояние кэшируется в `monitoringStateCache.json` (в `.gitignore`).
- **`npm run opcua:check`** — сверка конфигов устройств с переменными живых ПЛК.
- **SSO** с главным приложением через `@sorbent/platform-kit/sso`, клиент по умолчанию **`sizod`**.
- **`GET /config.js`** — отдаёт `window.NODE_ENV` для встраиваемых сценариев, **`GET /api/server-time`** — время сервера в ISO.

## Структура репозитория

```text
sizod-server/
├─ backend/
│  ├─ src/
│  │  ├─ server.js             # подключение DB, диагностика, запуск опроса, listen, graceful shutdown
│  │  ├─ app.js                # Express: CORS, CSP, маршруты, SPA fallback
│  │  ├─ startup/              # запуск опроса OPC UA (склейка конфигов, platform-kit и диагностики)
│  │  ├─ features/
│  │  │  ├─ monitoring/data/         # конфиги устройств и ПЛК, модели телеметрии, маршруты данных и графиков
│  │  │  ├─ monitoring/diagnostics/  # дерево доступности устройств, /api/monitoring/*
│  │  │  └─ platform/auth/           # настройка SSO-клиента
│  │  ├─ models/database.js    # подключение к MongoDB
│  │  ├─ infrastructure/       # логгер, менеджер соединений Mongo
│  │  └─ configs/env.js, constants/baseUrls.js
│  ├─ scripts/checkOpcUaDevices.js  # npm run opcua:check
│  ├─ test/                    # node --test: конфиги, опрос через симулятор, маршруты, модели
│  └─ package.json
├─ frontend/
│  ├─ src/                     # app, pages, shared, features/platform/sso-auth
│  └─ package.json
├─ scripts/dev.mjs             # корневой dev-раннер: backend + frontend одной командой
├─ package.json                # корневые скрипты dev, dev:backend, dev:frontend
├─ .prettierrc
└─ .prettierignore
```

## Быстрый старт

### 1) Зависимости

Нужен **MongoDB** (см. раздел про БД ниже).

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Переменные окружения — backend

Файл **`backend/.env`** (`.gitignore` скрывает `**/.env`).

- **`NODE_ENV`** — в `production` используется `OpcUaClient` и реальные ПЛК, в любом другом режиме `OpcUaSimulator`.
- **`PORT`** — порт HTTP, по умолчанию `3002`.
- **`EMBED_ALLOWED_ORIGINS`** — список origin через запятую для заголовка **Content-Security-Policy** `frame-ancestors` (iframe). `cors()` подключён без фильтра по origin.
- **`MAIN_AUTH_ENABLED`** — `true` или `false`. Если не задана: в production главная авторизация включена, в development выключена.
- **`SSO_CLIENT_ID`** — идентификатор клиента SSO, по умолчанию `sizod`.
- **`SSO_SIGNING_SECRET`** — секрет подписи SSO; в dev есть запасной `dev-sso-secret`, в production задайте свой.
- **`SSO_INTERNAL_SECRET`** — общий секрет для server-to-server вызова `/sso/introspect` на main (одна и та же строка на main и всех спутниках).
- **`SSO_ACCESS_TOKEN_TTL`**, **`SSO_REFRESH_TOKEN_TTL`** — сроки токенов в формате `30m`, `1h`, `14d`.
- **`TRUSTED_BYPASS_IPS`** — список IP через запятую, которым разрешён доступ без SSO, пока недоступен main.
- **`LOG_LEVEL`** — уровень логгера Winston, по умолчанию `info`.

Пример для локальной разработки:

```env
NODE_ENV=development
PORT=3002

EMBED_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3002

MAIN_AUTH_ENABLED=false

SSO_CLIENT_ID=sizod
SSO_SIGNING_SECRET=change_me_sso_signing
SSO_INTERNAL_SECRET=change_me_sso_internal
```

### 3) Переменные окружения — frontend

Файл **`frontend/.env`** (префикс **`VITE_`**).

- **`VITE_API_URL`** — базовый URL API. Если не задан: в development `http://localhost:3002`, в production хост из `frontend/src/shared/api/config.ts`.
- **`VITE_MAIN_AUTH_ENABLED`** — `true` или `false`, должно совпадать по смыслу с `MAIN_AUTH_ENABLED` на backend.
- **`VITE_EMBED_ALLOWED_ORIGINS`** — origins родительского окна через запятую (аналог `EMBED_ALLOWED_ORIGINS`).

### 4) Запуск в разработке

Из корня репозитория одной командой (backend и frontend поднимаются параллельно, вывод помечается `[backend]` / `[frontend]`, `Ctrl+C` останавливает оба):

```bash
npm run dev
```

По отдельности: `npm run dev:backend`, `npm run dev:frontend` из корня, либо `npm run dev` в каталогах `backend` и `frontend`. Проверка окружения раннера: `node scripts/dev.mjs --check`.

### 5) Production

```bash
cd frontend && npm run build:deploy
```

`build:deploy` прогоняет lint и `tsc`, собирает приложение в `dist-next`, сохраняет текущую сборку в `dist-old` и только затем подменяет **`frontend/dist`**. Затем запуск backend с `NODE_ENV=production`; статика отдаётся из **`frontend/dist`**, остальные запросы получают **`index.html`** (SPA).

С сервера должен быть доступен порт 4840 каждого ПЛК. Перед выкладкой и после изменения проекта ПЛК: `cd backend && npm run opcua:check`.

## MongoDB

URI зашит в `backend/src/models/database.js`: `mongodb://127.0.0.1:27017/sizod`.

## Адреса серверов

`backend/src/constants/baseUrls.js`:

- **`MAIN_API_BASE_URL`** — API главного сервера (dev `http://localhost:3002`, prod узел `NODES.MAIN`).
- **`SERVER_BASE_URL`** — публичный URL этого приложения для SSO callback (dev `http://localhost:3002`, prod `NODES.SERVER`).

Хост `NODES.SERVER` и `DEFAULT_PROD_API_URL` в `frontend/src/shared/api/config.ts` пока заполнены заглушкой `169.254.0.0`: перед выкладкой укажите реальный IP машины СИЗОД.

## Основные маршруты API

- `/api/auth/*` — SSO: callback, refresh, popup-complete и остальные эндпоинты потока.
- `/api/station16-data` — текущие данные Станции 16 (`features/monitoring/data/routes/deviceDataRoutes.js`); при устаревании данных старше 60 с вместо значений отдаются прочерки.
- `/api/:deviceId/data?start&end` — история для графиков по любому описанному устройству.
- `/api/monitoring/status` — диагностика.
- `/api/server-time` — время сервера (ISO).

## Интеграция с главным сервером

На **new-main-server** для клиента **`sizod`** должны быть разрешены callback-URL на базе адреса этого сервера, а для забора данных в архив main нужен узел `SIZOD` в `constants/apiConfig.js` и fetch-конфиг с маршрутами `/api/<deviceId>-data`.

## Скрипты npm

В **корне**: `npm run dev`, `npm run dev:backend`, `npm run dev:frontend`.

В каталоге **`backend`**: `npm run dev` (nodemon), `npm start`, `npm test` (без ПЛК и без MongoDB), `npm run opcua:check` (нужна сеть до ПЛК), `npm run format`, `npm run format:check`.

В каталоге **`frontend`**: `npm run dev`, `npm run build`, `npm run build:deploy`, `npm run preview`, `npm run lint`, `npm run format`, `npm run format:check`.
