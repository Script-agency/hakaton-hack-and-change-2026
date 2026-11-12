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
  `true` включает показ времени ответа и источников, а также переключатель отладки.
- Начальный маршрут всегда `/`; навигация внутри виджета не меняет URL сайта.
- На странице допускается один виджет. Перед повторным подключением отключите текущий.

Отключение: `assistant.unmount()` или `EnergyToolAssistant.unmount()`.
Также доступен `EnergyToolAssistant.unmount(container)` для конкретного контейнера.
Автоматический контейнер удаляется; переданный контейнер сохраняется для повторного подключения.

API backend задаётся при сборке через `VITE_API_BASE_URL`, по умолчанию `/api` домена сайта.

## Демо

```bash
pnpm build
pnpm preview
```

Откройте `/demo/index.html` на адресе preview-сервера.
