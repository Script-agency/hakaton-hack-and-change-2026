<?php

declare(strict_types=1);

use yii\helpers\Html;
use yii\web\View;

/** @var View $this */
/** @var string $apiBaseUrl */

$this->title = 'Admin Center';
?>
<div id="admin-app" data-api-base="<?= Html::encode($apiBaseUrl) ?>" class="flex h-screen w-screen overflow-hidden">

    <!-- Боковая навигация -->
    <aside class="w-64 bg-white border-r border-line flex flex-col justify-between shrink-0">
        <div>
            <!-- Брендинг -->
            <div class="h-16 px-6 flex items-center gap-3 border-b border-line">
                <div class="w-9 h-9 rounded-full bg-brand flex items-center justify-center p-2">
                    <svg viewBox="0 0 61 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M47.344 39.4508L42.465 32.7966L35.4023 23.1654L48.7893 23.1492L55.7934 32.7815L60.8197 39.6914L48.7449 55.815L35.8982 55.8301V55.7622L43.8214 44.472L47.344 39.4508Z" fill="#E6E9EE"/>
                        <path d="M14.116 16.4873L18.8686 23.0278L25.8713 32.6659L11.9217 32.681L4.97479 23.0451L0 16.143L11.97 0.0172691L25.4633 0V0.169448L17.444 11.7006L14.116 16.4873Z" fill="#E6E9EE"/>
                    </svg>
                </div>
                <div>
                    <div class="font-bold text-sm tracking-wide text-ink">ADMIN WIDGET</div>
                    <div class="text-[11px] text-brand font-medium">By Script Agency</div>
                </div>
            </div>

            <!-- Меню разделов -->
            <nav class="p-3 space-y-1.5">
                <button data-tab="leads" class="nav-tab-btn active w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all">
                    <span class="flex items-center gap-3">
                        <i class="fa-solid fa-users-viewfinder w-5 text-center"></i>
                        <span>Лиды</span>
                    </span>
                    <span id="badge-leads" class="nav-badge text-xs px-2 py-0.5 rounded-full font-semibold">0</span>
                </button>

                <button data-tab="chats" class="nav-tab-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all">
                    <span class="flex items-center gap-3">
                        <i class="fa-solid fa-comments w-5 text-center"></i>
                        <span>Чаты пользователей</span>
                    </span>
                    <span id="badge-chats" class="nav-badge text-xs px-2 py-0.5 rounded-full font-semibold">0</span>
                </button>

                <button data-tab="knowledge" class="nav-tab-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all">
                    <span class="flex items-center gap-3">
                        <i class="fa-solid fa-book-atlas w-5 text-center"></i>
                        <span>База знаний</span>
                    </span>
                    <span id="badge-knowledge" class="nav-badge text-xs px-2 py-0.5 rounded-full font-semibold">0</span>
                </button>
            </nav>
        </div>

        <div class="p-4 border-t border-line space-y-2">
            <div class="flex items-center gap-2 text-xs text-ink-secondary bg-surface-muted px-3 py-2 rounded-[10px] border border-line-subtle">
                <i class="fa-solid fa-wheelchair-alt w-5 text-center"></i>
                <span class="truncate">Помним, что это прототип <span class="text-brand">♥</span></span>
            </div>
        </div>
    </aside>

    <!-- Основной контент -->
    <main class="flex-1 flex flex-col bg-canvas overflow-hidden">

        <!-- Верхний тулбар -->
        <header class="h-16 px-6 bg-white border-b border-line flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
                <h1 id="current-tab-title" class="text-lg font-semibold text-ink">Управление лидами</h1>
                <span id="global-loader" class="hidden text-brand text-sm">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                </span>
            </div>

            <div class="flex items-center gap-2.5">
                <button id="btn-refresh-current" class="px-3.5 py-2 rounded-[10px] bg-surface hover:bg-line text-icon text-xs font-medium border border-line transition flex items-center gap-2">
                    <i class="fa-solid fa-rotate"></i>
                    <span>Обновить</span>
                </button>
            </div>
        </header>

        <!-- Контейнеры вкладок -->
        <div class="flex-1 overflow-hidden relative">

            <!-- ==================== ВКЛАДКА 1: ЛИДЫ ==================== -->
            <section id="tab-leads" class="tab-pane h-full flex flex-col p-6 overflow-hidden">
                <!-- Фильтры лидов -->
                <div class="bg-white p-4 rounded-xl border border-line mb-4 flex flex-wrap items-end gap-3 shrink-0">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-xs text-ink-secondary mb-1">ФИО клиента</label>
                        <div class="relative">
                            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-ink-secondary text-xs"></i>
                            <input type="text" id="lead-filter-search" placeholder="Иванов Иван…"
                                   class="w-full pl-8 pr-3 py-1.5 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                        </div>
                    </div>

                    <div class="w-44">
                        <label class="block text-xs text-ink-secondary mb-1">Статус</label>
                        <select id="lead-filter-status"
                                class="w-full px-3 py-1.5 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                            <option value="">Все статусы</option>
                            <option value="new">Новый (new)</option>
                            <option value="in_progress">В работе (in_progress)</option>
                            <option value="closed">Закрыт (closed)</option>
                            <option value="cancelled">Отклонен (cancelled)</option>
                        </select>
                    </div>

                    <div class="w-40">
                        <label class="block text-xs text-ink-secondary mb-1">Дата с</label>
                        <input type="date" id="lead-filter-from" class="w-full px-3 py-1.5 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                    </div>

                    <div class="w-40">
                        <label class="block text-xs text-ink-secondary mb-1">Дата по</label>
                        <input type="date" id="lead-filter-to" class="w-full px-3 py-1.5 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                    </div>

                    <div class="flex items-center gap-2">
                        <button id="btn-lead-apply-filter" class="px-4 py-1.5 rounded-[10px] bg-brand hover:bg-brand-hover text-on-brand text-sm font-medium transition">
                            Применить
                        </button>
                        <button id="btn-lead-reset-filter" class="px-3 py-1.5 rounded-[10px] bg-surface hover:bg-line text-icon text-sm border border-line transition" title="Сбросить">
                            <i class="fa-solid fa-filter-circle-xmark"></i>
                        </button>
                        <button id="btn-lead-create-open" class="px-3.5 py-1.5 rounded-[10px] bg-success-bg hover:brightness-95 text-success border border-transparent text-sm font-medium transition flex items-center gap-1.5">
                            <i class="fa-solid fa-plus"></i>
                            <span>Тест-лид</span>
                        </button>
                    </div>
                </div>

                <!-- Таблица лидов -->
                <div class="flex-1 bg-white rounded-xl border border-line overflow-hidden flex flex-col">
                    <div class="overflow-y-auto flex-1">
                        <table class="w-full text-left border-collapse">
                            <thead>
                            <tr class="border-b border-line-subtle text-[11px] font-semibold uppercase tracking-wider text-ink-secondary bg-surface-muted sticky top-0 z-10">
                                <th class="py-3 px-4 w-16">ID</th>
                                <th class="py-3 px-4">Клиент</th>
                                <th class="py-3 px-4">Контакты</th>
                                <th class="py-3 px-4">Сообщение</th>
                                <th class="py-3 px-4 w-44">Статус</th>
                                <th class="py-3 px-4 w-40">Создан</th>
                                <th class="py-3 px-4 w-24 text-right">Действия</th>
                            </tr>
                            </thead>
                            <tbody id="leads-table-body" class="divide-y divide-line-subtle text-sm">
                            <!-- Наполняется через JS -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Пагинация лидов -->
                    <div class="h-12 px-4 border-t border-line-subtle bg-white flex items-center justify-between text-xs text-ink-secondary shrink-0">
                        <div id="leads-pagination-info">Показано 0 из 0</div>
                        <div class="flex items-center gap-2">
                            <button id="leads-prev-page" class="px-2.5 py-1 rounded bg-surface enabled:hover:bg-line disabled:opacity-40 border border-line">
                                <i class="fa-solid fa-chevron-left"></i>
                            </button>
                            <span id="leads-page-indicator" class="px-2 font-medium text-ink">1</span>
                            <button id="leads-next-page" class="px-2.5 py-1 rounded bg-surface enabled:hover:bg-line disabled:opacity-40 border border-line">
                                <i class="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ==================== ВКЛАДКА 2: ЧАТЫ ПОЛЬЗОВАТЕЛЕЙ ==================== -->
            <section id="tab-chats" class="tab-pane hidden h-full flex overflow-hidden p-6 gap-5">
                <!-- Левая колонка: список чатов -->
                <div class="w-80 bg-white rounded-xl border border-line flex flex-col overflow-hidden shrink-0">
                    <div class="p-3.5 border-b border-line-subtle flex items-center justify-between">
                        <span class="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Сессии диалогов</span>
                        <button id="btn-create-chat" class="px-2.5 py-1 rounded-[10px] bg-brand hover:bg-brand-hover text-on-brand text-xs font-medium transition flex items-center gap-1.5">
                            <i class="fa-solid fa-plus"></i>
                            <span>Новый чат</span>
                        </button>
                    </div>

                    <div id="chats-list-container" class="flex-1 overflow-y-auto divide-y divide-line-subtle">
                        <!-- Список чатов -->
                    </div>

                    <div class="p-2.5 border-t border-line-subtle flex items-center justify-between text-xs text-ink-secondary">
                        <button id="chats-prev-page" class="px-2 py-1 rounded bg-surface enabled:hover:bg-line disabled:opacity-40">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <span id="chats-page-info">Стр. 1</span>
                        <button id="chats-next-page" class="px-2 py-1 rounded bg-surface enabled:hover:bg-line disabled:opacity-40">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <!-- Правая колонка: активный диалог -->
                <div class="flex-1 bg-white rounded-xl border border-line flex flex-col overflow-hidden">
                    <!-- Шапка чата -->
                    <div id="chat-active-header" class="h-14 px-5 border-b border-line-subtle flex items-center justify-between shrink-0">
                        <div>
                            <div id="chat-active-title" class="font-semibold text-sm text-ink">Выберите чат слева</div>
                            <div id="chat-active-meta" class="text-[11px] text-ink-secondary">История сообщений с AI-ассистентом</div>
                        </div>
                        <div id="chat-active-badge" class="hidden text-xs px-2.5 py-1 rounded-[10px] bg-brand-soft border border-transparent text-brand font-mono"></div>
                    </div>

                    <!-- Поток сообщений -->
                    <div id="chat-messages-viewport" class="flex-1 p-5 overflow-y-auto space-y-4 bg-white">
                        <div class="h-full flex flex-col items-center justify-center text-ink-secondary text-sm">
                            <i class="fa-regular fa-comments text-3xl mb-2 text-line-strong"></i>
                            <p>Выберите существующий чат или создайте новый диалог</p>
                        </div>
                    </div>

                    <!-- Форма отправки сообщения -->
                    <form id="chat-send-form" class="p-3.5 border-t border-line-subtle bg-white flex items-end gap-3 shrink-0">
                        <textarea id="chat-message-input" rows="2" disabled placeholder="Введите сообщение для проверки генерации ответа..." class="flex-1 px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none disabled:opacity-50"></textarea>
                        <button type="submit" id="chat-send-btn" disabled class="h-10 px-5 rounded-xl bg-brand enabled:hover:bg-brand-hover text-on-brand text-sm font-medium transition disabled:opacity-40 flex items-center gap-2 shrink-0">
                            <span>Отправить</span>
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                    </form>
                </div>
            </section>

            <!-- ==================== ВКЛАДКА 3: БАЗА ЗНАНИЙ ==================== -->
            <section id="tab-knowledge" class="tab-pane hidden h-full flex flex-col p-6 overflow-hidden">
                <!-- Верхняя панель действий базы знаний -->
                <div class="bg-white p-4 rounded-xl border border-line mb-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <div>
                        <h2 class="text-sm font-semibold text-ink">Документы и категории RAG / Knowledge Base</h2>
                        <p class="text-xs text-ink-secondary">Управление Markdown-документами, категориями и частями (`parts`) для контекста ИИ</p>
                    </div>

                    <div class="flex items-center gap-2.5">
                        <button id="btn-categories-manage" class="px-3.5 py-2 rounded-[10px] bg-surface hover:bg-line text-ink text-xs font-medium border border-line transition flex items-center gap-2">
                            <i class="fa-solid fa-folder-tree text-brand"></i>
                            <span>Категории</span>
                        </button>
                        <button id="btn-knowledge-create" class="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-on-brand text-xs font-medium transition flex items-center gap-2">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            <span>Загрузить документ</span>
                        </button>
                    </div>
                </div>

                <!-- Список документов базы знаний -->
                <div id="knowledge-grid" class="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4 pr-1">
                    <!-- Карточки документов рендерятся через JS -->
                </div>
            </section>

        </div>
    </main>
</div>

<!-- ==================== МОДАЛЬНОЕ ОКНО: ДЕТАЛИ ЛИДА / СОЗДАНИЕ ТЕСТ-ЛИДА ==================== -->
<div id="modal-lead" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-lg w-full overflow-hidden shadow-2xl">
        <div class="px-5 py-4 border-b border-line-subtle flex items-center justify-between">
            <h3 id="modal-lead-title" class="font-semibold text-base text-ink">Карточка лида</h3>
            <button data-close-modal="modal-lead" class="text-ink-secondary hover:text-ink">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div id="modal-lead-body" class="p-5 space-y-4 text-sm max-h-[75vh] overflow-y-auto"></div>
    </div>
</div>

<!-- ==================== МОДАЛЬНОЕ ОКНО: СОЗДАНИЕ / РЕДАКТИРОВАНИЕ БАЗЫ ЗНАНИЙ ==================== -->
<div id="modal-knowledge" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
            <h3 id="modal-knowledge-title" class="font-semibold text-base text-ink">Документ</h3>
            <button data-close-modal="modal-knowledge" class="text-ink-secondary hover:text-ink">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div id="modal-knowledge-body" class="p-6 overflow-y-auto flex-1"></div>
    </div>
</div>

<!-- ЧАСТИ ДОКУМЕНТА -->
<div id="modal-parts" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
            <div>
                <h3 id="modal-parts-title" class="font-semibold text-base text-ink">Части документа</h3>
                <p class="text-[11px] text-ink-secondary mt-0.5">Отдельные секции контента, извлечённые из файла или созданные вручную</p>
            </div>
            <div class="flex items-center gap-2">
                <button id="btn-add-part" class="px-3 py-1.5 rounded-[10px] bg-brand-soft hover:brightness-95 text-brand text-xs font-medium transition flex items-center gap-1.5">
                    <i class="fa-solid fa-plus"></i><span>Добавить часть</span>
                </button>
                <button data-close-modal="modal-parts" class="text-ink-secondary hover:text-ink ml-2">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
        </div>
        <div id="parts-container" class="p-6 overflow-y-auto flex-1 space-y-3"></div>
    </div>
</div>

<!-- РЕДАКТИРОВАНИЕ ЧАСТИ -->
<div id="modal-part" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
            <h3 id="modal-part-title" class="font-semibold text-base text-ink">Часть документа</h3>
            <button data-close-modal="modal-part" class="text-ink-secondary hover:text-ink">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div id="part-edit-body" class="p-6 overflow-y-auto flex-1"></div>
    </div>
</div>

<!-- КАТЕГОРИИ -->
<div id="modal-categories" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div class="px-6 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
            <h3 class="font-semibold text-base text-ink">Категории базы знаний</h3>
            <button data-close-modal="modal-categories" class="text-ink-secondary hover:text-ink">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div id="categories-body" class="p-6 overflow-y-auto flex-1"></div>
    </div>
</div>

<div id="modal-chat-create" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 hidden items-center justify-center p-4">
    <div class="bg-white border border-line rounded-[20px] max-w-md w-full overflow-hidden shadow-2xl">
        <div class="px-5 py-4 border-b border-line-subtle flex items-center justify-between">
            <h3 class="font-semibold text-base text-ink">Новый чат</h3>
            <button type="button" data-close-modal="modal-chat-create" class="text-ink-secondary hover:text-ink">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <form id="form-create-chat" class="p-5 space-y-4" novalidate>
            <div>
                <label for="new-chat-fingerprint" class="block text-xs text-ink-secondary mb-1">Fingerprint клиента</label>
                <div class="flex items-center gap-2">
                    <input type="text" id="new-chat-fingerprint" autocomplete="off" spellcheck="false" maxlength="128"
                           class="flex-1 min-w-0 px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                    <button type="button" id="btn-chat-fingerprint-regenerate" title="Сгенерировать новый"
                            class="h-10 w-10 shrink-0 rounded-xl bg-surface hover:bg-line text-icon border border-line transition">
                        <i class="fa-solid fa-shuffle"></i>
                    </button>
                </div>
                <p id="new-chat-error" class="hidden text-xs text-danger mt-1"></p>
                <p class="text-[11px] text-ink-secondary mt-1.5">Hex-строка от 8 до 128 символов. Оставьте сгенерированный, чтобы создать тестовый чат, или вставьте fingerprint реального клиента.</p>
            </div>
            <div class="pt-3 border-t border-line-subtle flex justify-end gap-3">
                <button type="button" data-close-modal="modal-chat-create" class="px-4 py-2 rounded-xl bg-surface hover:bg-line text-icon text-sm transition">Отмена</button>
                <button type="submit" id="btn-chat-create-submit" class="px-5 py-2 rounded-xl bg-brand enabled:hover:bg-brand-hover text-on-brand text-sm font-medium transition disabled:opacity-40">Создать чат</button>
            </div>
        </form>
    </div>
</div>

<!-- Контейнер всплывающих уведомлений -->
<div id="toast-container" class="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none"></div>