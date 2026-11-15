# Frontend

## Подключение

После `pnpm build` разместите `dist/widget.js` на сервере и добавьте перед `</body>`:

```html
<script src="/widget.js"></script>
<script>
  EnergyToolAssistant.mount();
</script>
```

Виджет сам создаёт контейнер в `document.body`. React и стили включены в `widget.js`.

Настройки необязательны:

```html
<div id="assistant"></div>
<script src="/widget.js"></script>
<script>
  const assistant = EnergyToolAssistant.mount({
    container: document.getElementById("assistant"),
    debug: true,
  });
</script>
```

- `container?: HTMLElement` — отдельный пустой элемент с поддержкой Shadow DOM.
  Без него контейнер создаётся автоматически; вызывайте `mount()` после появления `document.body`.
- `debug?: boolean` — по умолчанию `false`: отладочные данные и переключатель скрыты.
  `true` включает показ времени ответа, входных/выходных токенов (если API их вернул) и источников, а также переключатель отладки.
- Начальный маршрут всегда `/`; навигация внутри виджета не меняет URL сайта.
- На странице допускается один виджет. Перед повторным подключением отключите текущий.

Отключение: `assistant.unmount()` или `EnergyToolAssistant.unmount()`.
Также доступен `EnergyToolAssistant.unmount(container)` для конкретного контейнера.
Автоматический контейнер удаляется; переданный контейнер сохраняется для повторного подключения.

API backend задаётся при сборке через `VITE_API_BASE_URL`, по умолчанию `/api` домена сайта.

## API и идентификатор посетителя

В `pnpm dev` запросы `/api/*` проксируются на `http://localhost:8080/*`.
Для production настройте такой же proxy на домене сайта либо задайте `VITE_API_BASE_URL`
при сборке; при обращении к другому origin backend должен разрешать CORS.
`pnpm preview` использует готовый бандл и не включает dev proxy.

FingerprintJS вычисляет идентификатор браузера один раз на загрузку страницы.
Результат остаётся в памяти, без записи идентификатора в localStorage или cookies;
проверка поддержки cookies кратковременно создаёт и удаляет тестовую cookie.
Статистика FingerprintJS отключена. Отпечаток может изменяться или совпадать
у разных посетителей и не заменяет авторизацию.

Чат создаётся при первом вопросе. История и сообщения загружаются через
`dialogsQueryOptions(fingerprint)` и `chatQueryOptions(id)` из `entities/*/model`;
страницы вызывают `useQuery` с этими опциями. Создание и отправка используют
`useCreateChat` и `useSendMessage`. POST не повторяются автоматически.
После отправки, в том числе неуспешной, переписка сверяется с сервером.
Таймаут генерации — 190 секунд, остальных запросов — 15 секунд.

Backend должен иметь применённую миграцию
`modules\generation\infrastructure\migrations\m261113_000013_create_generation_chat_tables`.
Список истории показывает номер чата, дату создания и число сообщений:
текущий backend не возвращает заголовок, превью и статус заявки.
Кнопка «Связаться с менеджером» появляется после завершения консультации (`is_completed: true`).
Форма отправляет контакты, готовое `summary`, `conversation_id` и `fingerprint` в `POST /leads`.
При пустом резюме форма недоступна. При ошибке контакты сохраняются, POST автоматически не повторяется.
Экран успеха открывается только после успешного ответа API.

## Демо

```bash
pnpm build
pnpm preview
```

Откройте `/demo/index.html` на адресе preview-сервера.

## Тесты

Все команды выполняются из `frontend/`. Используйте Node.js 24 и pnpm из `packageManager`.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm test:e2e
pnpm test:visual
```

- `pnpm test` — юнит-тесты Vitest в jsdom, расположенные рядом с исходниками в `src/**/*.test.ts(x)`.
- `pnpm test:watch` — Vitest в режиме наблюдения.
- `pnpm test:e2e` — интерактивные проверки Playwright из `e2e/interactive`.
- `pnpm test:visual` — сравнение скриншотов из `e2e/visual`.
- `pnpm test:visual:update` — явное обновление эталонов после намеренных изменений интерфейса.

Браузерные команды сначала собирают production-виджет, затем автоматически запускают
`e2e/server.mjs` на `127.0.0.1:4175`. Порт должен быть свободен. Тестовая страница подключает
готовый `dist/widget.js` обычным `<script>`; React на странице хостера отсутствует.
API подменяется через Playwright: история, генерация и заявки существуют только в памяти теста.
Внешние запросы и неизвестные обращения к API приводят к ошибке. Живой бэкенд и нейронка не нужны.

Скриншотные эталоны рассчитаны на **macOS 26 ARM64 и Chromium из зафиксированного pnpm-lock.yaml**.
Размеры окна — 1280×900 и 390×844; locale `ru-RU`, timezone `Asia/Yekaterinburg`, reduced motion.
Даты фиксированы; время запроса для debug-снимка управляется тестовыми часами.
Эталоны находятся в `e2e/visual/__screenshots__` и входят в Git.
Linux и другие версии macOS могут иначе рисовать шрифты: обновляйте эталоны только в согласованной среде.

После обновления просмотрите PNG и diff, затем выполните `pnpm test:visual` без обновления.
Не принимайте новые изображения только ради зелёной проверки. При обновлении Playwright/Chromium
эталоны также нужно проверить заново. Установка пакетов не устанавливает браузер автоматически.

```bash
pnpm exec playwright show-report
pnpm exec playwright show-trace test-results/<failed-test>/trace.zip
```

HTML-отчёт (`playwright-report`), traces и изображения различий (`test-results`) не входят в Git.
Оба браузерных набора используют эти каталоги: запускайте их последовательно при локальной работе.
На Linux перед браузерными тестами установите зависимости: `pnpm exec playwright install --with-deps chromium`.
Чтобы переопределённый локальный API не влиял на тесты, браузерные команды собирают виджет с `VITE_API_BASE_URL=/api`.

### GitHub Actions

`.github/workflows/frontend.yml` запускается на push, pull request и вручную.
Четыре независимые джобы: `lint-stage` (ESLint, Prettier, TypeScript), `unit-tests` (Vitest),
`interactive-tests` (Chromium, Ubuntu 24.04), `screenshot-tests` (Chromium, macOS 26 ARM64).
Устаревшие запуски одной ветки отменяются. При падении браузерной джобы её отчёт, trace и снимки
загружаются отдельным артефактом на семь дней. CI не обновляет эталоны и запрещает `test.only`.
