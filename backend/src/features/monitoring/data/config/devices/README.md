# Конфигурация устройств

Этот каталог описывает устройства СИЗОД: какие переменные ПЛК читать, как их назвать и как преобразовывать значения. Все устройства сейчас это ПЛК на CODESYS (ОВЕН ПЛК210), они читаются по OPC UA через `@sorbent/platform-kit/opcua`. Modbus в проекте не используется.

Отдельные сервисы для каждого устройства не нужны, все конфиги исполняет общий модуль:

```text
features/monitoring/data/config/polling/opcua/
    ↓ подключение к OPC UA-серверу ПЛК, опрос раз в 5 секунд
конфиг устройства
    ↓ переменные, названия, преобразования
@sorbent/platform-kit/opcua
    ↓ чтение и обработка
MongoDB → API → фронтенд
```

Как устроен модуль, описано в README пакета: `node_modules/@sorbent/platform-kit/src/opcua/README.md`.

## Где что находится

- `polling/opcua/opcUaEndpoints.config.js`: точки подключения. Адрес `opc.tcp://<IP ПЛК>:4840`, интервал опроса, подпись ПЛК для мониторинга.
- `polling/opcua/opcUaPollingDevices.config.js`: какие устройства реально опрашиваются, через какую точку и по какому конфигу.
- `devices/<устройство>/`: конфиг устройства; `devices/index.js`: общий каталог.
- `graphicDevices.config.js`: какие источники истории доступны маршруту графиков.
- `routes/deviceDataRoutes.js`: маршруты текущих данных `/api/<deviceId>-data`.
- `startup/opcUaPolling.js`: по одному worker'у на точку подключения, в development симулятор вместо ПЛК.
- `scripts/checkOpcUaDevices.js`: сверка конфигов с живыми ПЛК, `npm run opcua:check`.

## Описание устройства и его включение

Наличие файла конфига не запускает опрос устройства.

```text
DEVICE_CONFIGS         все устройства, для которых есть описание
OPCUA_POLLING_DEVICES  устройства, которые сервер действительно опрашивает
GRAPHIC_DEVICE_MODELS  источники, по которым можно построить график
```

Устройство с `pollingEnabled: false` в `OPCUA_POLLING_DEVICES` остаётся в диагностике как offline с причиной `polling_disabled`, но не опрашивается.

## Конфиг

```js
import { Station16Model } from '#features/monitoring/data/models/telemetryModels.js';

const config = {
  id: 'station16',
  label: 'Станция 16',
  group: 'СИЗОД',
  model: Station16Model,
  sections: [
    {
      id: 'process',
      title: 'Процесс',
      params: [
        { key: 'Давление', symbol: 'Application.GVL.AI_Pressure', dataType: 'float32', unit: 'кПа', precision: 2 },
      ],
    },
  ],
};

export default config;
```

`id` секции становится полем документа MongoDB и ключом в ответе API, `key` параметра ключом внутри секции. Фронтенд читает те же названия.

- `symbol`: путь переменной в ПЛК, как его показывает `--list`: `Application.GVL.<имя>` для глобальных переменных, `Application.<POU>.<имя>` для переменных программ.
- `dataType`: `boolean`, `int8`…`uint64`, `float32`, `float64`, `string`, `datetime`. Должен совпадать с типом переменной в ПЛК, это проверяет `npm run opcua:check`.
- `unit`: обязателен у каждого параметра (пустая строка, если единицы нет). В MongoDB и API хранятся значения без единиц, единицы показывает фронтенд.

Каждый параметр описывается полным объектом прямо в `params`, без локальных фабрик.

## Преобразования

- `enum: { 0: 'Ожидание', 4: 'Проверка DOP' }`: код заменяется подписью. Подходит для перечислений CODESYS (шаги).
- `invert: true`: дискретный сигнал с обратной логикой, только для `boolean`.
- `scale`, `offset`, `absolute`, `precision`: сырое значение → `absolute` → `value * scale + offset` → округление.
- `outputType: 'boolean'`: числовая переменная со смыслом «включено/выключено».
- `outputs: { value: { scale: 10 }, percent: {} }`: несколько представлений одной переменной.
- `displayAs: 'hoursMinutes'`: секунды в строку `чч:мм`.
- `stability: { maxDelta, acceptAfter }`: фильтр резкого скачка входных данных.
- `calculate: ({ data, sectionData }) => ...`: вычисляемый параметр, описывается после тех, от которых зависит.

Секция с `internal: true` сохраняется в MongoDB, но не отдаётся `/api/<deviceId>-data`.

## Подключение нового ПЛК

1. В CODESYS: `Application` → «Добавить объект» → «Конфигурация символов», отметить нужные переменные (для мониторинга с доступом «только чтение»), загрузить проект в ПЛК. Без загрузки переменных на OPC UA-сервере нет.
2. Проверить, что ПЛК отдаёт переменные:

   ```powershell
   npx platform-kit-codesys-symbols opc.tcp://<IP ПЛК>:4840 --list
   ```

3. Создать модель `createTelemetryModel('имяModel', 'коллекция')` в `features/monitoring/data/models/telemetryModels.js`.
4. Сгенерировать заготовку конфига и разложить параметры по секциям с русскими ключами:

   ```powershell
   npx platform-kit-codesys-symbols opc.tcp://<IP ПЛК>:4840 --id station14 --label "Станция 14" `
     --model Station14Model --model-import '#features/monitoring/data/models/telemetryModels.js' `
     --out src/features/monitoring/data/config/devices/station14/station14.config.js
   ```

5. Добавить конфиг в `devices/<устройство>/index.js` (ключ строго равен `config.id`), группу в `devices/index.js`.
6. Описать точку подключения в `opcUaEndpoints.config.js` и устройство в `opcUaPollingDevices.config.js`.
7. Добавить маршрут в `deviceDataRoutes.js`, обновить ожидания в `backend/test`, добавить страницу на фронтенд.
8. Сверить конфиг с ПЛК: `npm run opcua:check`.

## Сверка конфигов с ПЛК

```powershell
npm run opcua:check
```

Скрипт подключается к каждому ПЛК из `opcUaEndpoints.config.js`, берёт у него список переменных и сравнивает с конфигами устройств этой точки:

```text
Станция 16: проверено переменных 86, есть расхождения
  Нет в ПЛК 169.254.0.238:4840 (1):
    inputs/LS-3: Application.GVL.DI_10
  Не сходится (1):
    process/Давление: Application.GVL.AI_Pressure, тип в конфиге int16, у переменной float32 (Float)
  Есть в ПЛК 169.254.0.238:4840, но нет в конфиге (86):
    Application.GVL.M1_1 (boolean)
```

Код завершения 1, если хоть одной переменной нет или тип не сходится. Переменные, которые есть только в ПЛК, на код не влияют. Запускать после изменения проекта ПЛК или конфига, с компьютера, откуда видны ПЛК. В `npm test` сверка не входит: тесты работают без ПЛК.

Если переменной нет в ПЛК, опрос не падает: она пропускается с одной записью в лог, остальные значения сохраняются.

## Время

`lastUpdated` ставится по часам сервера, часы ПЛК не используются. Чтобы метки времени OPC UA в логах не расходились, на ПЛК включается синхронизация времени (NTP).

## Проверка

Из каталога `backend`:

```powershell
npm.cmd test
```

Тесты проверяют валидность всех конфигов, совпадение ключа каталога с `config.id`, опрос устройств через симулятор, маршруты данных и модели телеметрии.
