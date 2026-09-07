# Конфигурация Modbus-устройств

Этот каталог содержит описание Modbus-устройств СИЗОД: какие параметры читать, из каких регистров, как преобразовывать значения и в каких единицах их показывать.

Отдельные сервисы для каждого устройства не нужны. Все конфиги исполняет общий модуль `@sorbent/platform-kit/modbus`:

```text
features/monitoring/data/config/polling/modbus/modbusPollingDevices.config.js
    ↓ подключение к COM-порту и периодический опрос
конфиг устройства
    ↓ адреса, типы, единицы и преобразования
@sorbent/platform-kit/modbus
    ↓ чтение и обработка
MongoDB → API → фронтенд
```

Устройство слоёв модуля (transport, polling, device), формат ошибок и хранилище описаны в README самого пакета: `node_modules/@sorbent/platform-kit/src/modbus/README.md`.

## Где что находится

- `features/monitoring/data/config/polling/modbus/modbusPorts.config.js` — настройки физических COM-портов: скорость, таймаут запроса и интервалы worker'а.
- `features/monitoring/data/config/polling/modbus/modbusPollingDevices.config.js` — какие Modbus-устройства реально опрашиваются: COM-порт, Modbus ID и объектный конфиг.
- `features/monitoring/data/config/devices/**` — описание данных конкретных устройств, по подпапке на группу. Сейчас здесь только `example/` — заготовка, которую нужно заменить реальными устройствами.
- `features/monitoring/data/config/devices/index.js` — общий каталог описанных устройств.
- `features/monitoring/data/config/graphicDevices.config.js` — какие источники истории доступны маршруту графиков.
- `features/monitoring/data/routes/deviceDataRoutes.js` — маршруты текущих данных `/api/<deviceId>-data`.
- `features/monitoring/diagnostics/convertersConfig.js` — преобразователи MOXA по COM-портам для дерева мониторинга.
- `startup/modbusPolling.js` — склейка конфигов, модуля и диагностики: по одному worker'у на порт.

## Описание устройства и его включение — разные вещи

Наличие файла конфига не запускает опрос устройства.

```text
DEVICE_CONFIGS         — все устройства, для которых существует описание
MODBUS_POLLING_DEVICES — Modbus-устройства, которые сервер действительно опрашивает
GRAPHIC_DEVICE_MODELS  — источники, по которым можно построить график
```

Устройство с `pollingEnabled: false` в `MODBUS_POLLING_DEVICES` остаётся в диагностике как offline с причиной `polling_disabled`, но не опрашивается.

## Минимальный конфиг

```js
import { ExampleModel } from '#features/monitoring/data/models/telemetryModels.js';

const config = {
  id: 'example',
  label: 'Пример устройства',
  group: 'СИЗОД',
  model: ExampleModel,

  sections: [
    {
      id: 'parameters',
      title: 'Параметры',
      params: [
        {
          key: 'Температура',
          address: 0x0000,
          registerType: 'holding',
          dataType: 'float32',
          byteOrder: 'CDAB',
          unit: '°C',
          precision: 1,
        },
      ],
    },
  ],
};

export default config;
```

`id` секции становится полем документа MongoDB и ключом в ответе API, `key` параметра — ключом внутри секции. Фронтенд читает те же названия.

Каждый параметр описывается полным объектом прямо в `params`. Не используйте локальные фабрики вроде `float(key, address, unit)`: явное повторение `registerType`, `dataType`, `unit` делает карту регистров длиннее, но позволяет понять её без перехода к вспомогательной функции.

## План чтения

План чтения строится из явных блоков `readPlan.blocks` и автоматической сборки соседних адресов. Явные блоки всегда главнее, автоматика разбирает только то, что в них не попало.

По умолчанию соседние адреса одного slave и одного типа регистров склеиваются в один запрос, разрыв в один регистр уже разрывает блок:

```js
readPlan: {
  auto: { maxGapRegisters: 0, maxBlockRegisters: 125 },
},
```

- `auto: false` — отключить сборку целиком, всё читается поодиночке. Нужно, если прибор отклоняет длинные запросы.
- `maxGapRegisters` — сколько подряд идущих неиспользуемых регистров разрешено проглотить внутри блока.
- `maxBlockRegisters` — предел размера автоблока, от 1 до 125.

Явные блоки нужны там, где выгодно прочитать диапазон целиком, включая промежуточные адреса:

```js
readPlan: {
  blocks: [
    { id: 'main', slaveId: 'default', registerType: 'holding', startAddress: 0x0000, registerCount: 19 },
  ],
},
```

Параметр, выходящий за край блока, отклоняется при проверке конфига. Повторное использование одного регистра несколькими параметрами (битовые флаги) не создаёт повторный запрос.

## Адреса, типы регистров и данных

В `address` указывается фактический адрес с нулевой базой, который принимает библиотека Modbus. Документация производителей часто пишет `40001` для holding-регистра с адресом 0 — источник истины карта прибора или проверка на устройстве.

```text
holding       — holding register, функция 03
input         — input register, функция 04
coil          — coil, функция 01
discreteInput — discrete input, функция 02
```

```text
int16 / uint16      — 1 регистр
int32 / uint32      — 2 регистра
int64 / uint64      — 4 регистра
float32 / float64   — 2 / 4 регистра
boolean             — false при 0, true при ненулевом значении, 1 регистр
string              — текст, длина задаётся registerCount
```

Для значения длиннее одного регистра `byteOrder` обязателен: `ABCD` (стандарт Modbus), `CDAB` (ОВЕН и многие ПЛК), `BADC`, `DCBA`.

## Битовые флаги, перечисления, преобразования

Слово состояния описывается несколькими параметрами с одного адреса, регистр читается один раз за цикл:

```js
{ key: 'Работа', address: 0x0006, registerType: 'holding', dataType: 'uint16', bit: 0, unit: '' },
{ key: 'Авария', address: 0x0006, registerType: 'holding', dataType: 'uint16', bit: 1, unit: '' },
```

`bit` нумеруется от нуля с младшего бита, результат всегда boolean. Несколько бит, кодирующих число, вынимаются полем `bitField: { start, length }`.

- `enum: { 0: 'Стоп', 1: 'Работа' }` — код состояния заменяется подписью.
- `invert: true` — дискретный сигнал с обратной логикой.
- `scale`, `offset`, `absolute`, `precision` — порядок: сырое значение → `absolute` → `value * scale + offset` → округление.
- `outputType: 'boolean'` — числовой регистр со смыслом «включено/выключено».
- `outputs: { value: { scale: 10 }, percent: {} }` — несколько представлений одного регистра.
- `displayAs: 'hoursMinutes'` — секунды в строку `чч:мм`.
- `stability: { maxDelta, acceptAfter }` — фильтр резкого скачка входных данных.
- `calculate: ({ data, sectionData }) => ...` — вычисляемый параметр, описывается после тех, от которых зависит.
- `slaveId: 8` — параметр с другого Modbus-адреса на той же линии.

Секция с `internal: true` сохраняется в MongoDB, но не отдаётся `/api/<deviceId>-data`. Поле `afterPoll: async ({ config, deviceId, document })` вызывается после сохранения документа, его ошибка пишется в лог и не влияет на опрос.

## Единицы измерения и API

`unit` обязателен у каждого параметра (пустая строка, если единицы нет). В MongoDB и в ответах `/api/<deviceId>-data` хранятся обычные значения без единиц — единицы для отображения задаёт фронтенд.

## Подключение нового устройства

1. Создать Mongoose-модель: `createTelemetryModel('Имя', 'коллекция')` в `features/monitoring/data/models/telemetryModels.js`.
2. Создать файл `features/monitoring/data/config/devices/<group>/<device>.config.js` и добавить его в групповой `index.js` (ключ строго равен `config.id`), а группу — в общий `devices/index.js`.
3. Описать только параметры, которые реально нужны API и фронтенду. Начать без `readPlan`, пока поведение прибора не проверено.
4. Добавить устройство в `modbusPollingDevices.config.js`, а порт — в `modbusPorts.config.js` и `convertersConfig.js`.
5. Добавить маршрут в `deviceDataRoutes.js`, обновить ожидания в `backend/test` и добавить страницу на фронтенд.
6. Проверить значения на реальном приборе.

Порт описывается один раз в `MODBUS_PORTS`:

```js
COM3: {
  baudRate: 9_600,
  requestTimeoutMs: 3_000,
}
```

Линия по умолчанию 8N1; другая настройка задаётся полями `dataBits`, `parity`, `stopBits`. Сетевые каналы: `transport: 'tcp' | 'rtu-over-tcp'`, `host`, `tcpPort`. Необязательные предохранители: `hardTimeoutMs`, `cycleWatchdogMs`, `connectTimeoutMs`, `pollIntervalMs` (по умолчанию 10 секунд), `slowRequestMs`.

`requestTimeoutMs` не ускоряет живое устройство: это цена одной неудачной попытки. Фактическое время ответа каждого slave показывает `GET /api/monitoring/modbus-timings`, там же появляется `suggestedTimeoutMs` после 100 успешных чтений. Заниженный таймаут опаснее завышенного.

## Проверка

Из каталога `backend`:

```powershell
npm.cmd test
```

Тесты проверяют валидность всех конфигов, совпадение ключа каталога с `config.id`, план чтения, преобразования значений, симулятор, маршруты данных и модели телеметрии.
