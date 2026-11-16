document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('admin-app');
    if (!appRoot) return;

    const API_BASE = appRoot.dataset.apiBase || '';
    const isEmbedded = new URLSearchParams(window.location.search).get('embedded') === '1' || window.self !== window.top;

    const btnCloseEmbedded = document.getElementById('btn-close-embedded');
    if (isEmbedded && btnCloseEmbedded) {
        btnCloseEmbedded.classList.remove('hidden');
        btnCloseEmbedded.addEventListener('click', () => {
            window.parent.postMessage({ type: 'SA_ADMIN_CLOSE' }, '*');
        });
    }

    const state = {
        activeTab: 'leads',
        leads: { page: 1, limit: 15, total: 0, items: [] },
        chats: { page: 1, limit: 20, total: 0, items: [], activeChatId: null, activeMessages: [] },
        knowledge: {
            items: [],
            categories: [],
            meta: { total: 0 },
            parts: { docId: null, items: [] }
        },
    };

    const loader = document.getElementById('global-loader');
    function setLoading(v) { if (loader) loader.classList.toggle('hidden', !v); }

    /**
     * Рендер истории диалога лида (поле `messages`).
     * Поддерживает: array of {role, content}, JSON-строку, null.
     */
    function renderLeadMessages(messages) {
        let list = messages;

        // если пришло строкой — пробуем распарсить
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (_) { list = null; }
        }

        if (!Array.isArray(list) || list.length === 0) {
            return `
            <div>
                <div class="text-xs text-ink-secondary mb-1">История диалога</div>
                <div class="p-3.5 rounded-xl bg-surface border border-line-subtle text-ink-secondary text-xs text-center">
                    <i class="fa-regular fa-comment-slash mr-1"></i>
                    История переписки отсутствует
                </div>
            </div>`;
        }

        const items = list.map(m => {
            const role    = m.role || 'user';
            const isUser  = role === 'user';
            const isSys   = role === 'system';

            const label = isSys
                ? '<i class="fa-solid fa-gear mr-1"></i>Система'
                : isUser
                    ? '<i class="fa-regular fa-user mr-1"></i>Клиент'
                    : '<i class="fa-solid fa-robot mr-1"></i>AI Ассистент';

            const labelClass = isSys
                ? 'text-ink-secondary'
                : isUser ? 'text-brand' : 'text-success';

            const bubbleClass = isSys
                ? 'bg-surface-muted border border-dashed border-line-strong text-ink-secondary rounded-bl-[6px]'
                : isUser
                    ? 'bg-brand text-on-brand rounded-br-[6px]'
                    : 'bg-surface text-ink rounded-bl-[6px]';

            const align = isUser ? 'items-end' : 'items-start';

            return `
            <div class="flex flex-col ${align}">
                <div class="text-[11px] font-semibold ${labelClass} mb-1 px-1">${label}</div>
                <div class="max-w-[85%] rounded-[20px] px-3.5 py-2 text-xs whitespace-pre-wrap leading-relaxed ${bubbleClass}">
                    ${escapeHtml(m.content || '')}
                </div>
            </div>`;
        }).join('');

        return `
        <div>
            <div class="text-xs text-ink-secondary mb-1">
                История диалога
                <span class="text-ink-secondary">(${list.length} сообщ.)</span>
            </div>
            <div class="p-3 space-y-2.5 rounded-xl bg-white border border-line max-h-72 overflow-y-auto">
                ${items}
            </div>
        </div>`;
    }

    // FIX: правильные HTML-сущности (в исходнике было сломано)
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, "&#039;");
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        const bgClass = type === 'error'
            ? 'bg-white border-danger text-danger'
            : 'bg-white border-line text-ink';
        const icon = type === 'error' ? 'fa-circle-exclamation text-danger' : 'fa-circle-check text-success';

        toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 ${bgClass}`;
        toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i><span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    async function apiRequest(path, options = {}) {
        setLoading(true);
        try {
            const url = `${API_BASE}${path}`;
            const headers = Object.assign({}, options.headers || {});
            if (!(options.body instanceof FormData) && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            headers['Accept'] = 'application/json';

            const response = await fetch(url, { ...options, headers });

            if (!response.ok) {
                let errMsg = `Ошибка HTTP ${response.status}`;
                try {
                    const errJson = await response.json();
                    errMsg = errJson.message || errJson.error || errMsg;
                } catch (_) {}
                throw new Error(errMsg);
            }

            const ct = response.headers.get('content-type') || '';
            return ct.includes('application/json') ? await response.json() : await response.text();
        } finally {
            setLoading(false);
        }
    }

    // ==================== НАВИГАЦИЯ ====================
    const tabTitles = {
        leads: 'Управление лидами',
        chats: 'Чаты пользователей (Generation AI)',
        knowledge: 'База знаний (RAG Документы)'
    };

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            state.activeTab = tab;

            document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
            document.getElementById(`tab-${tab}`).classList.remove('hidden');
            document.getElementById('current-tab-title').textContent = tabTitles[tab] || '';

            refreshCurrentTab();
        });
    });

    document.getElementById('btn-refresh-current').addEventListener('click', refreshCurrentTab);

    function refreshCurrentTab() {
        if (state.activeTab === 'leads') loadLeads();
        if (state.activeTab === 'chats') loadChats();
        if (state.activeTab === 'knowledge') loadKnowledge();
    }

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById(btn.dataset.closeModal);
            if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        });
    });

    function openModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
    }
    function closeModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    }

    // ==================== 1. ЛИДЫ ====================
    const statusLabels = {
        new: { label: 'Новый', classes: 'bg-brand-soft text-brand' },
        in_process: { label: 'В работе', classes: 'bg-surface text-ink-secondary' },
        done: { label: 'Завершен', classes: 'bg-success-bg text-success' },
        cancelled: { label: 'Отклонен', classes: 'bg-danger-bg text-danger' }
    };

    async function loadLeads() {
        try {
            const limit = state.leads.limit;
            const offset = (state.leads.page - 1) * limit;

            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            });

            const search   = document.getElementById('lead-filter-search').value.trim();
            const status   = document.getElementById('lead-filter-status').value;
            const dateFrom = document.getElementById('lead-filter-from').value;
            const dateTo   = document.getElementById('lead-filter-to').value;

            if (search)   params.set('fullName', search);
            if (status)   params.set('status', status);
            if (dateFrom) params.set('createdFrom', `${dateFrom}T00:00:00`);
            if (dateTo)   params.set('createdTo',   `${dateTo}T23:59:59`);

            const res = await apiRequest(`/admin/leads?${params.toString()}`);

            state.leads.items = res.items || [];
            state.leads.total = res._meta?.total ?? state.leads.items.length;

            document.getElementById('badge-leads').textContent = state.leads.total;
            renderLeadsTable();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderLeadsTable() {
        const tbody = document.getElementById('leads-table-body');
        tbody.innerHTML = '';

        if (state.leads.items.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-ink-secondary">
                    <i class="fa-solid fa-inbox text-2xl mb-2 block"></i>
                    Лиды не найдены
                </td>
            </tr>`;
        } else {
            state.leads.items.forEach(lead => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-muted transition';
                tr.innerHTML = `
                <td class="py-3 px-4 font-mono text-xs text-ink-secondary">#${lead.id}</td>
                <td class="py-3 px-4">
                    <div class="font-medium text-ink">${escapeHtml(lead.full_name || '—')}</div>
                    ${lead.company
                    ? `<div class="text-[11px] text-ink-secondary mt-0.5"><i class="fa-regular fa-building mr-1"></i>${escapeHtml(lead.company)}</div>`
                    : ''}
                </td>
                <td class="py-3 px-4 text-xs space-y-0.5">
                    ${lead.phone
                    ? `<div class="text-icon"><i class="fa-solid fa-phone text-ink-secondary mr-1.5"></i>${escapeHtml(lead.phone)}</div>`
                    : ''}
                    ${lead.manager_note
                    ? `<div class="text-ink-secondary italic truncate max-w-[180px]" title="${escapeHtml(lead.manager_note)}"><i class="fa-regular fa-note-sticky text-ink-secondary mr-1.5"></i>${escapeHtml(lead.manager_note)}</div>`
                    : ''}
                </td>
                <td class="py-3 px-4 text-xs text-icon max-w-xs truncate" title="${escapeHtml(lead.summary || '')}">
                    ${escapeHtml(lead.summary || '—')}
                </td>
                <td class="py-3 px-4">
                    <select data-lead-status="${lead.id}" class="px-2.5 py-1 rounded-[10px] text-xs font-medium bg-white border border-line text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                        <option value="new"         ${lead.status === 'new'         ? 'selected' : ''}>🔵 Новый (new)</option>
                        <option value="in_progress" ${lead.status === 'in_progress' ? 'selected' : ''}>🟡 В работе (in_progress)</option>
                        <option value="closed"      ${lead.status === 'closed'      ? 'selected' : ''}>🟢 Закрыт (closed)</option>
                        <option value="cancelled"   ${lead.status === 'cancelled'   ? 'selected' : ''}>🔴 Отклонен (cancelled)</option>
                    </select>
                </td>
                <td class="py-3 px-4 text-xs text-ink-secondary">${escapeHtml(lead.created_at || '')}</td>
                <td class="py-3 px-4 text-right">
                    <button data-lead-view="${lead.id}" class="px-2.5 py-1 rounded-[10px] bg-surface hover:bg-brand-soft text-icon hover:text-brand border border-line text-xs transition" title="Подробнее">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </td>`;
                tbody.appendChild(tr);
            });
        }

        // --- Обновление статуса ---
        tbody.querySelectorAll('[data-lead-status]').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.leadStatus;
                const newStatus = e.target.value;
                try {
                    await apiRequest(`/admin/leads/${id}/status`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: newStatus })
                    });
                    showToast(`Статус лида #${id} обновлён на «${newStatus}»`);
                    loadLeads();
                } catch (err) {
                    showToast(err.message, 'error');
                    loadLeads();
                }
            });
        });

        // --- Просмотр ---
        tbody.querySelectorAll('[data-lead-view]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.leadView;
                try {
                    const res  = await apiRequest(`/admin/leads/${id}`);
                    const item = res.item || res;

                    // Поле messages может прийти в разных вариантах — нормализуем
                    const messages = item.messages ?? item.chat_messages ?? null;

                    document.getElementById('modal-lead-title').textContent = `Лид #${item.id}`;
                    document.getElementById('modal-lead-body').innerHTML = `
                <div class="grid grid-cols-2 gap-3 bg-surface-muted p-3.5 rounded-xl border border-line-subtle">
                    <div><div class="text-[11px] text-ink-secondary">ФИО</div><div class="font-medium text-ink">${escapeHtml(item.full_name || '—')}</div></div>
                    <div><div class="text-[11px] text-ink-secondary">Компания</div><div class="text-ink">${escapeHtml(item.company || '—')}</div></div>
                    <div><div class="text-[11px] text-ink-secondary">Телефон</div><div class="text-ink">${escapeHtml(item.phone || '—')}</div></div>
                    <div><div class="text-[11px] text-ink-secondary">Статус</div><div class="font-medium text-brand">${escapeHtml(item.status || '—')}</div></div>
                    <div><div class="text-[11px] text-ink-secondary">Создан</div><div class="text-icon text-xs">${escapeHtml(item.created_at || '—')}</div></div>
                    <div><div class="text-[11px] text-ink-secondary">Обновлён</div><div class="text-icon text-xs">${escapeHtml(item.updated_at || '—')}</div></div>
                </div>
                ${item.manager_note ? `
                <div>
                    <div class="text-xs text-ink-secondary mb-1">Комментарий менеджера</div>
                    <div class="p-3.5 rounded-xl bg-surface border border-line-subtle text-ink whitespace-pre-wrap">${escapeHtml(item.manager_note)}</div>
                </div>` : ''}
                <div>
                    <div class="text-xs text-ink-secondary mb-1">Резюме диалога</div>
                    <div class="p-3.5 rounded-xl bg-surface border border-line-subtle text-ink whitespace-pre-wrap">${escapeHtml(item.summary || 'Нет резюме')}</div>
                </div>
                ${renderLeadMessages(messages)}`;

                    openModal('modal-lead');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        // --- Пагинация ---
        const totalPages = Math.max(1, Math.ceil(state.leads.total / state.leads.limit));
        document.getElementById('leads-pagination-info').textContent =
            `Всего записей: ${state.leads.total} (Стр. ${state.leads.page} из ${totalPages})`;
        document.getElementById('leads-page-indicator').textContent = state.leads.page;
        document.getElementById('leads-prev-page').disabled = state.leads.page <= 1;
        document.getElementById('leads-next-page').disabled = state.leads.page >= totalPages;
    }

    document.getElementById('btn-lead-apply-filter').addEventListener('click', () => { state.leads.page = 1; loadLeads(); });
    document.getElementById('btn-lead-reset-filter').addEventListener('click', () => {
        document.getElementById('lead-filter-search').value = '';
        document.getElementById('lead-filter-status').value = '';
        document.getElementById('lead-filter-from').value = '';
        document.getElementById('lead-filter-to').value = '';
        state.leads.page = 1;
        loadLeads();
    });
    document.getElementById('leads-prev-page').addEventListener('click', () => { if (state.leads.page > 1) { state.leads.page--; loadLeads(); } });
    document.getElementById('leads-next-page').addEventListener('click', () => { state.leads.page++; loadLeads(); });

    document.getElementById('btn-lead-create-open').addEventListener('click', () => {
        document.getElementById('modal-lead-title').textContent = 'Создать нового лида';
        document.getElementById('modal-lead-body').innerHTML = `
        <form id="form-create-lead" class="space-y-3">
            <div><label class="block text-xs text-ink-secondary mb-1">Компания *</label>
                <input type="text" id="new-lead-company" required maxlength="255" placeholder="ООО Ромашка"
                       class="w-full px-3 py-2 bg-white border border-line rounded-xl text-sm text-ink"></div>
            <div><label class="block text-xs text-ink-secondary mb-1">ФИО клиента *</label>
                <input type="text" id="new-lead-fullname" required maxlength="255" placeholder="Иванов Иван Иванович"
                       class="w-full px-3 py-2 bg-white border border-line rounded-xl text-sm text-ink"></div>
            <div><label class="block text-xs text-ink-secondary mb-1">Телефон *</label>
                <input type="tel" id="new-lead-phone" required maxlength="20" pattern="^\\+?[\\d\\s\\-\\(\\)]+$"
                       placeholder="+7 999 123-45-67"
                       class="w-full px-3 py-2 bg-white border border-line rounded-xl text-sm text-ink"></div>
            <div><label class="block text-xs text-ink-secondary mb-1">Резюме диалога *</label>
                <textarea id="new-lead-summary" rows="3" required
                          placeholder="Клиент интересуется внедрением CRM, бюджет 500к..."
                          class="w-full px-3 py-2 bg-white border border-line rounded-xl text-sm text-ink"></textarea></div>
            <div class="pt-2 flex justify-end">
                <button type="submit" class="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-xs font-medium">Создать лид</button>
            </div>
        </form>`;
        openModal('modal-lead');

        document.getElementById('form-create-lead').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const payload = {
                    company:   document.getElementById('new-lead-company').value.trim(),
                    full_name: document.getElementById('new-lead-fullname').value.trim(),
                    phone:     document.getElementById('new-lead-phone').value.trim(),
                    summary:   document.getElementById('new-lead-summary').value.trim()
                };
                await apiRequest('/leads', { method: 'POST', body: JSON.stringify(payload) });
                closeModal('modal-lead');
                showToast('Лид успешно создан');
                loadLeads();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });

    // ==================== 2. ЧАТЫ ====================
    async function loadChats() {
        try {
            // Бэкенд отдаёт ПОЛНЫЙ массив всех чатов без {items,total} и без учёта page/limit.
            // Поэтому сначала тянем всё, затем режем на страницы на клиенте.
            const res = await apiRequest('/generation/chat/list');

            const raw = Array.isArray(res) ? res : (res.items || []);
            const all = raw.map(normalizeChat); // приводим к {chatId, fingerprint, createdAt, messageCount}

            state.chats.total = all.length;

            // Клиентская пагинация
            const start = (state.chats.page - 1) * state.chats.limit;
            state.chats.items = all.slice(start, start + state.chats.limit);

            document.getElementById('badge-chats').textContent = state.chats.total;
            renderChatsList();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function normalizeChat(c) {
        return {
            chatId: c.id ?? c.chatId,
            fingerprint: c.fingerprint ?? '',
            createdAt: c.created_at ?? c.createdAt ?? '',
            messageCount: c.message_count ?? c.messageCount ?? 0,
        };
    }

    function normalizeMessage(m) {
        return {
            role: m.role ?? 'assistant',
            content: m.content ?? m.text ?? '',
            createdAt: m.created_at ?? m.createdAt ?? '',
        };
    }

    function generateFingerprint() {
        // 32-hex-символьный хеш (16 байт энтропии) — типичный формат для fingerprint
        if (window.crypto && window.crypto.getRandomValues) {
            const arr = new Uint8Array(16);
            window.crypto.getRandomValues(arr);
            return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        }
        // Fallback для очень старых браузеров
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function renderChatsList() {
        const container = document.getElementById('chats-list-container');
        container.innerHTML = '';

        if (state.chats.items.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-xs text-ink-secondary">Список чатов пуст</div>`;
        } else {
            state.chats.items.forEach(chat => {
                const isActive = Number(state.chats.activeChatId) === Number(chat.chatId);
                const item = document.createElement('button');
                item.className = `w-full text-left p-3.5 transition flex items-start justify-between gap-2 ${
                    isActive ? 'bg-brand-soft border-l-2 border-brand' : 'hover:bg-surface'
                }`;
                item.innerHTML = `
                <div class="min-w-0">
                    <div class="font-medium text-sm text-ink truncate">
                        Чат #${chat.chatId}
                        ${chat.fingerprint ? `<span class="text-[11px] text-ink-secondary font-normal ml-1">· ${escapeHtml(chat.fingerprint)}</span>` : ''}
                    </div>
                    <div class="text-[11px] text-ink-secondary mt-0.5">
                        <i class="fa-regular fa-clock mr-1"></i>${escapeHtml(chat.createdAt)}
                        <span class="ml-2"><i class="fa-regular fa-message mr-1"></i>${chat.messageCount} сообщ.</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-ink-secondary mt-1"></i>`;
                item.addEventListener('click', () => selectChat(chat.chatId));
                container.appendChild(item);
            });
        }

        const totalPages = Math.max(1, Math.ceil(state.chats.total / state.chats.limit));
        document.getElementById('chats-page-info').textContent = `Стр. ${state.chats.page} / ${totalPages}`;
        document.getElementById('chats-prev-page').disabled = state.chats.page <= 1;
        document.getElementById('chats-next-page').disabled = state.chats.page >= totalPages;
    }

    async function selectChat(chatId) {
        state.chats.activeChatId = chatId;
        renderChatsList();

        try {
            const res = await apiRequest(`/generation/chat/${chatId}`);
            const detail = res.item || res;

            const chat = normalizeChat(detail);
            const messages = Array.isArray(detail.messages)
                ? detail.messages.map(normalizeMessage)
                : [];

            state.chats.activeMessages = messages;

            document.getElementById('chat-active-title').textContent =
                `Диалог с пользователем #${chat.chatId}` +
                (chat.fingerprint ? ` · ${chat.fingerprint}` : '');
            document.getElementById('chat-active-meta').textContent =
                `Создан: ${chat.createdAt} • Сообщений: ${messages.length}`;

            const badge = document.getElementById('chat-active-badge');
            badge.textContent = `ID: ${chat.chatId}`;
            badge.classList.remove('hidden');

            document.getElementById('chat-message-input').disabled = false;
            document.getElementById('chat-send-btn').disabled = false;

            renderChatMessages();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderChatMessages() {
        const viewport = document.getElementById('chat-messages-viewport');
        viewport.innerHTML = '';

        if (state.chats.activeMessages.length === 0) {
            viewport.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-ink-secondary text-xs">
                    <i class="fa-regular fa-paper-plane text-2xl mb-2"></i>
                    <span>В этом чате пока нет сообщений. Напишите первым!</span>
                </div>`;
            return;
        }

        state.chats.activeMessages.forEach(msg => {
            const isUser = msg.role === 'user';
            const wrapper = document.createElement('div');
            wrapper.className = `flex flex-col ${isUser ? 'items-end' : 'items-start'}`;
            wrapper.innerHTML = `
                <div class="flex items-center gap-2 mb-1 px-1">
                    <span class="text-[11px] font-semibold ${isUser ? 'text-brand' : 'text-success'}">
                        ${isUser ? '<i class="fa-regular fa-user mr-1"></i>Пользователь' : '<i class="fa-solid fa-robot mr-1"></i>AI Ассистент'}
                    </span>
                    <span class="text-[10px] text-ink-secondary">${escapeHtml(msg.createdAt || '')}</span>
                </div>
                <div class="max-w-2xl rounded-[20px] px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                isUser
                    ? 'bg-brand text-on-brand rounded-br-[6px]'
                    : 'bg-surface text-ink rounded-bl-[6px]'
            }">${escapeHtml(msg.content)}</div>`;
            viewport.appendChild(wrapper);
        });

        viewport.scrollTop = viewport.scrollHeight;
    }

    const chatCreateForm = document.getElementById('form-create-chat');
    const chatFingerprintInput = document.getElementById('new-chat-fingerprint');
    const chatFingerprintError = document.getElementById('new-chat-error');
    const chatCreateSubmit = document.getElementById('btn-chat-create-submit');

    function setChatFingerprintError(message) {
        chatFingerprintError.textContent = message || '';
        chatFingerprintError.classList.toggle('hidden', !message);
        if (message) {
            chatFingerprintInput.setAttribute('aria-invalid', 'true');
        } else {
            chatFingerprintInput.removeAttribute('aria-invalid');
        }
    }

    function fillChatFingerprint() {
        chatFingerprintInput.value = generateFingerprint();
        setChatFingerprintError('');
        chatFingerprintInput.focus();
        chatFingerprintInput.select();
    }

    document.getElementById('btn-create-chat').addEventListener('click', () => {
        openModal('modal-chat-create');
        fillChatFingerprint();
    });

    document.getElementById('btn-chat-fingerprint-regenerate').addEventListener('click', fillChatFingerprint);
    chatFingerprintInput.addEventListener('input', () => setChatFingerprintError(''));

    chatCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fingerprint = chatFingerprintInput.value.trim();
        if (!fingerprint) {
            setChatFingerprintError('Fingerprint обязателен');
            return;
        }
        if (!/^[a-f0-9]{8,128}$/i.test(fingerprint)) {
            setChatFingerprintError('Fingerprint должен быть hex-строкой от 8 до 128 символов');
            return;
        }

        chatCreateSubmit.disabled = true;
        try {
            const res = await apiRequest('/generation/chat/new', {
                method: 'POST',
                body: JSON.stringify({ fingerprint })
            });
            const item = res.item || res;
            const chatId = item.id ?? item.chatId;

            closeModal('modal-chat-create');
            showToast(`Создан новый чат #${chatId} (fp: ${fingerprint.slice(0, 8)}…)`);
            await loadChats();
            if (chatId) selectChat(chatId);
        } catch (err) {
            setChatFingerprintError(err.message);
        } finally {
            chatCreateSubmit.disabled = false;
        }
    });

    document.getElementById('chat-send-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const conversationId = state.chats.activeChatId;
        const input = document.getElementById('chat-message-input');
        const question = input.value.trim();

        if (!conversationId || !question) return;

        input.value = '';
        input.disabled = true;
        document.getElementById('chat-send-btn').disabled = true;

        try {
            // FIX: контракт бэкенда — { question, conversation_id }.
            // conversation_id — id чата, полученный при создании (или из списка).
            await apiRequest('/generation/chat', {
                method: 'POST',
                body: JSON.stringify({
                    question,
                    conversation_id: Number(conversationId)
                })
            });
            // после ответа агента перечитываем историю, чтобы увидеть и вопрос, и ответ
            await selectChat(conversationId);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            input.disabled = false;
            document.getElementById('chat-send-btn').disabled = false;
            input.focus();
        }
    });

    document.getElementById('chats-prev-page').addEventListener('click', () => { if (state.chats.page > 1) { state.chats.page--; loadChats(); } });
    document.getElementById('chats-next-page').addEventListener('click', () => { state.chats.page++; loadChats(); });

    // ==================== 3. БАЗА ЗНАНИЙ ====================
    // Контракт (Swagger):
    //   GET    /admin/knowledge/categories                     -> {items:[KnowledgeCategory]}
    //   POST   /admin/knowledge/categories                     -> {name, slug, description?, is_active?}
    //   PATCH  /admin/knowledge/categories/{id}
    //   DELETE /admin/knowledge/categories/{id}                -> 204
    //   GET    /admin/knowledge/documents?limit&offset&...     -> {items:[KnowledgeDocument], _meta:{total}}
    //   POST   /admin/knowledge/documents                      -> multipart (file + title?/description?/categoryId?)
    //   PATCH  /admin/knowledge/documents/{id}                 -> {title?, description?, categoryId?, status?}
    //   DELETE /admin/knowledge/documents/{id}                 -> 204
    //   GET    /admin/knowledge/documents/{id}/file            -> binary
    //   GET    /admin/knowledge/documents/{id}/parts           -> {items:[KnowledgePart]}
    //   POST   /admin/knowledge/documents/{id}/parts           -> {title?, content, position?}
    //   PATCH  /admin/knowledge/parts/{id}                     -> {title?, content?, position?}
    //   DELETE /admin/knowledge/parts/{id}                     -> 204

    const docStatusMap = {
        draft:      { label: 'Черновик',   classes: 'bg-surface text-ink-secondary' },
        processing: { label: 'Обработка…', classes: 'bg-brand-soft text-brand' },
        ready:      { label: 'Готов',      classes: 'bg-success-bg text-success' },
        failed:     { label: 'Ошибка',     classes: 'bg-danger-bg text-danger' }
    };

    function humanFileSize(bytes) {
        if (!bytes) return '—';
        const units = ['Б', 'КБ', 'МБ', 'ГБ'];
        let i = 0, n = Number(bytes);
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
    }

    function getCategoryById(id) {
        if (id == null) return null;
        return state.knowledge.categories.find(c => Number(c.id) === Number(id));
    }

    async function loadKnowledgeCategories() {
        try {
            const res = await apiRequest('/admin/knowledge/categories');
            state.knowledge.categories = res.items || [];
        } catch (_) {
            state.knowledge.categories = [];
        }
    }

    async function loadKnowledge() {
        try {
            // Категории и документы — параллельно
            const [docsRes] = await Promise.all([
                apiRequest('/admin/knowledge/documents?limit=200&offset=0'),
                loadKnowledgeCategories()
            ]);

            const docs = docsRes.items || [];
            state.knowledge.items = docs;
            state.knowledge.meta = { total: docsRes._meta?.total ?? docs.length };

            document.getElementById('badge-knowledge').textContent = state.knowledge.meta.total;
            renderKnowledgeGrid();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderKnowledgeGrid() {
        const grid = document.getElementById('knowledge-grid');
        grid.innerHTML = '';

        if (state.knowledge.items.length === 0) {
            grid.innerHTML = `
            <div class="col-span-full py-16 text-center text-ink-secondary bg-white rounded-xl border border-line">
                <i class="fa-solid fa-book-open text-3xl mb-2 block text-line-strong"></i>
                База знаний пуста. Загрузите первый документ.
            </div>`;
            return;
        }

        state.knowledge.items.forEach(doc => {
            const cat = getCategoryById(doc.category_id);
            const status = docStatusMap[doc.status] || docStatusMap.draft;

            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl border border-line p-5 flex flex-col justify-between hover:border-line-strong transition';

            card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1.5">
                            ${cat
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-soft text-brand">
                                        <i class="fa-solid fa-folder-tree text-[10px]"></i>
                                        <span>${escapeHtml(cat.name)}</span>
                                   </span>`
                : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface text-ink-secondary">
                                        <i class="fa-solid fa-folder text-[10px]"></i>
                                        <span>Без категории</span>
                                   </span>`}
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${status.classes}">
                                ${escapeHtml(status.label)}
                            </span>
                        </div>
                        <h3 class="font-semibold text-base text-ink truncate" title="${escapeHtml(doc.title || '')}">${escapeHtml(doc.title || '(без названия)')}</h3>
                        ${doc.description ? `<p class="text-xs text-ink-secondary mt-1 line-clamp-2">${escapeHtml(doc.description)}</p>` : ''}
                    </div>
                    <span class="font-mono text-xs text-ink-secondary shrink-0">#${doc.id}</span>
                </div>

                <div class="text-[11px] text-ink-secondary grid grid-cols-2 gap-1.5 mb-4 p-3 rounded-[10px] bg-surface-muted border border-line-subtle">
                    <div class="flex items-center gap-1.5 min-w-0" title="${escapeHtml(doc.filename || '')}">
                        <i class="fa-regular fa-file text-ink-secondary shrink-0"></i>
                        <span class="truncate">${escapeHtml(doc.filename || '—')}</span>
                    </div>
                    <div class="flex items-center gap-1.5 justify-end">
                        <i class="fa-regular fa-hard-drive text-ink-secondary"></i>
                        <span>${humanFileSize(doc.size)}</span>
                    </div>
                    <div class="flex items-center gap-1.5 col-span-2">
                        <i class="fa-regular fa-calendar text-ink-secondary"></i>
                        <span>Создан: ${escapeHtml(doc.created_at || '—')}</span>
                    </div>
                </div>
            </div>

            <div class="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-secondary gap-1.5">
                <span class="truncate">Обновлён: ${escapeHtml(doc.updated_at || doc.created_at || '—')}</span>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button data-kn-parts="${doc.id}" class="px-2.5 py-1.5 rounded-[10px] bg-surface hover:bg-brand-soft text-ink hover:text-brand border border-line transition" title="Части документа">
                        <i class="fa-solid fa-layer-group"></i>
                    </button>
                    <button data-kn-file="${doc.id}" class="px-2.5 py-1.5 rounded-[10px] bg-surface hover:bg-brand-soft text-ink hover:text-brand border border-line transition" title="Скачать файл">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button data-kn-edit="${doc.id}" class="px-2.5 py-1.5 rounded-[10px] bg-surface hover:bg-brand-soft text-ink hover:text-brand border border-line transition" title="Редактировать метаданные">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button data-kn-delete="${doc.id}" class="px-2.5 py-1.5 rounded-[10px] bg-surface hover:bg-danger-bg text-ink-secondary hover:text-danger border border-line transition" title="Удалить">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-kn-parts]').forEach(b => b.addEventListener('click', () => openPartsModal(Number(b.dataset.knParts))));
        grid.querySelectorAll('[data-kn-file]').forEach(b => b.addEventListener('click', () => {
            window.open(`${API_BASE}/admin/knowledge/documents/${b.dataset.knFile}/file`, '_blank');
        }));
        grid.querySelectorAll('[data-kn-edit]').forEach(b => b.addEventListener('click', () => {
            const id = Number(b.dataset.knEdit);
            const doc = state.knowledge.items.find(i => Number(i.id) === id);
            if (doc) openKnowledgeModal(doc);
        }));
        grid.querySelectorAll('[data-kn-delete]').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.knDelete;
            if (!confirm(`Удалить документ #${id} и все его части?`)) return;
            try {
                await apiRequest(`/admin/knowledge/documents/${id}`, { method: 'DELETE' });
                showToast(`Документ #${id} удалён`);
                loadKnowledge();
            } catch (err) { showToast(err.message, 'error'); }
        }));
    }

    // ---------- Модалка документа ----------

    function openKnowledgeModal(doc = null) {
        const isEdit = !!doc;
        document.getElementById('modal-knowledge-title').textContent = isEdit
            ? `Редактирование документа #${doc.id}`
            : 'Загрузка нового документа';

        const catOptions = state.knowledge.categories.map(c =>
            `<option value="${c.id}" ${doc && Number(doc.category_id) === Number(c.id) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        ).join('');

        document.getElementById('modal-knowledge-body').innerHTML = isEdit
            ? `
            <form id="form-knowledge" class="space-y-4">
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Название</label>
                    <input type="text" id="kn-title" value="${escapeHtml(doc.title || '')}" maxlength="255" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-ink-secondary mb-1">Категория</label>
                        <select id="kn-category" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                            <option value="">— Без категории —</option>
                            ${catOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-ink-secondary mb-1">Статус</label>
                        <select id="kn-status" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                            ${['draft','processing','ready','failed'].map(s =>
                `<option value="${s}" ${doc.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Описание</label>
                    <textarea id="kn-description" rows="3" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">${escapeHtml(doc.description || '')}</textarea>
                </div>
                <div class="text-[11px] text-ink-secondary p-2.5 rounded-[10px] bg-surface-muted border border-line-subtle">
                    <i class="fa-solid fa-circle-info mr-1"></i>
                    Текущий файл: <span class="font-mono">${escapeHtml(doc.filename || '—')}</span> (${humanFileSize(doc.size)}).
                    Файл меняется отдельно (см. замену файла в API), здесь — только метаданные.
                </div>
                <div class="pt-3 border-t border-line-subtle flex justify-end gap-3">
                    <button type="button" data-close-modal="modal-knowledge" class="px-4 py-2 rounded-xl bg-surface hover:bg-line text-icon text-sm">Отмена</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-sm font-medium">Сохранить</button>
                </div>
            </form>`
            : `
            <form id="form-knowledge" class="space-y-4" enctype="multipart/form-data">
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Файл документа *</label>
                    <input type="file" id="kn-file" required class="w-full text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-[10px] file:border-0 file:bg-brand file:text-on-brand file:text-xs hover:file:bg-brand-hover file:cursor-pointer">
                    <div class="text-[11px] text-ink-secondary mt-1">PDF, DOCX, TXT, Markdown и др. После загрузки документ уходит в обработку (статус <span class="font-mono">processing</span> → <span class="font-mono">ready</span>).</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs text-ink-secondary mb-1">Название</label>
                        <input type="text" id="kn-title" maxlength="255" placeholder="Политика возврата" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                    </div>
                    <div>
                        <label class="block text-xs text-ink-secondary mb-1">Категория</label>
                        <select id="kn-category" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                            <option value="">— Без категории —</option>
                            ${catOptions}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Описание</label>
                    <textarea id="kn-description" rows="3" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"></textarea>
                </div>
                <div class="pt-3 border-t border-line-subtle flex justify-end gap-3">
                    <button type="button" data-close-modal="modal-knowledge" class="px-4 py-2 rounded-xl bg-surface hover:bg-line text-icon text-sm">Отмена</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-sm font-medium">Загрузить документ</button>
                </div>
            </form>`;

        document.getElementById('form-knowledge').addEventListener('submit', isEdit
            ? (e) => saveKnowledgeEdit(e, doc.id)
            : (e) => saveKnowledgeCreate(e)
        );
        openModal('modal-knowledge');
    }

    async function saveKnowledgeCreate(e) {
        e.preventDefault();
        const file = document.getElementById('kn-file').files[0];
        if (!file) return showToast('Выберите файл', 'error');

        const fd = new FormData();
        fd.append('file', file);
        const title = document.getElementById('kn-title').value.trim();
        const desc = document.getElementById('kn-description').value.trim();
        const cat = document.getElementById('kn-category').value;
        if (title) fd.append('title', title);
        if (desc) fd.append('description', desc);
        if (cat) fd.append('categoryId', cat);

        try {
            await apiRequest('/admin/knowledge/documents', { method: 'POST', body: fd });
            closeModal('modal-knowledge');
            showToast('Документ загружен, начинается обработка');
            loadKnowledge();
        } catch (err) { showToast(err.message, 'error'); }
    }

    async function saveKnowledgeEdit(e, id) {
        e.preventDefault();
        const title = document.getElementById('kn-title').value.trim();
        const desc = document.getElementById('kn-description').value.trim();
        const cat = document.getElementById('kn-category').value;
        const status = document.getElementById('kn-status').value;

        try {
            await apiRequest(`/admin/knowledge/documents/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    title: title || null,
                    description: desc || null,
                    categoryId: cat ? Number(cat) : null,
                    status
                })
            });
            closeModal('modal-knowledge');
            showToast(`Документ #${id} обновлён`);
            loadKnowledge();
        } catch (err) { showToast(err.message, 'error'); }
    }

    // ---------- Модалка частей документа ----------

    async function openPartsModal(documentId) {
        const doc = state.knowledge.items.find(d => Number(d.id) === documentId);
        document.getElementById('modal-parts-title').textContent = doc
            ? `Части документа #${doc.id} — ${doc.title || doc.filename || ''}`
            : `Части документа #${documentId}`;
        state.knowledge.parts = { docId: documentId, items: [] };
        document.getElementById('parts-container').innerHTML =
            `<div class="p-6 text-center text-ink-secondary text-xs"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Загрузка частей…</div>`;
        openModal('modal-parts');
        await refreshParts(documentId);
    }

    async function refreshParts(documentId) {
        try {
            const res = await apiRequest(`/admin/knowledge/documents/${documentId}/parts`);
            const parts = (res.items || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            state.knowledge.parts = { docId: documentId, items: parts };
            renderPartsList();
        } catch (err) {
            showToast(err.message, 'error');
            document.getElementById('parts-container').innerHTML =
                `<div class="p-6 text-center text-danger text-xs">Не удалось загрузить части: ${escapeHtml(err.message)}</div>`;
        }
    }

    function renderPartsList() {
        const container = document.getElementById('parts-container');
        const parts = state.knowledge.parts.items;

        if (parts.length === 0) {
            container.innerHTML = `
            <div class="p-8 text-center text-ink-secondary text-xs bg-surface-muted rounded-xl border border-dashed border-line">
                <i class="fa-regular fa-file-lines text-2xl mb-2 block text-line-strong"></i>
                Частей пока нет. Добавьте вручную или дождитесь обработки файла.
            </div>`;
            return;
        }

        container.innerHTML = parts.map(p => `
        <div class="p-4 rounded-xl bg-surface-muted border border-line-subtle space-y-2">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <div class="font-medium text-sm text-ink">${escapeHtml(p.title || `Часть #${p.id}`)}</div>
                    <div class="text-[11px] text-ink-secondary mt-0.5">
                        <span class="font-mono">#${p.id}</span>
                        · позиция ${p.position ?? '—'}
                        · ревизия ${p.revision ?? 0}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button data-part-edit="${p.id}" class="px-2 py-1 rounded-[10px] bg-white hover:bg-brand-soft text-icon hover:text-brand border border-line text-xs">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button data-part-delete="${p.id}" class="px-2 py-1 rounded-[10px] bg-white hover:bg-danger-bg text-ink-secondary hover:text-danger border border-line text-xs">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-icon whitespace-pre-wrap line-clamp-4 max-h-32 overflow-y-auto">${escapeHtml(p.content || '(пусто)')}</div>
        </div>
    `).join('');

        container.querySelectorAll('[data-part-edit]').forEach(b => b.addEventListener('click', () => {
            const id = Number(b.dataset.partEdit);
            const part = state.knowledge.parts.items.find(p => Number(p.id) === id);
            if (part) openPartEditModal(part);
        }));
        container.querySelectorAll('[data-part-delete]').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.partDelete;
            if (!confirm(`Удалить часть #${id}?`)) return;
            try {
                await apiRequest(`/admin/knowledge/parts/${id}`, { method: 'DELETE' });
                showToast(`Часть #${id} удалена`);
                await refreshParts(state.knowledge.parts.docId);
            } catch (err) { showToast(err.message, 'error'); }
        }));
    }

    function openPartEditModal(part = null) {
        const isEdit = !!part;
        document.getElementById('modal-part-title').textContent = isEdit
            ? `Редактирование части #${part.id}`
            : `Новая часть документа #${state.knowledge.parts.docId}`;

        document.getElementById('part-edit-body').innerHTML = `
        <form id="form-part" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Заголовок</label>
                    <input type="text" id="part-title" value="${escapeHtml(part?.title || '')}" maxlength="255" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                </div>
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Позиция</label>
                    <input type="number" id="part-position" value="${part?.position ?? ''}" class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                </div>
            </div>
            <div>
                <label class="block text-xs text-ink-secondary mb-1">Содержимое *</label>
                <textarea id="part-content" rows="10" required class="w-full px-3.5 py-2 bg-white border border-line rounded-xl text-sm text-ink font-mono focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">${escapeHtml(part?.content || '')}</textarea>
            </div>
            <div class="pt-3 border-t border-line-subtle flex justify-end gap-3">
                <button type="button" data-close-modal="modal-part" class="px-4 py-2 rounded-xl bg-surface hover:bg-line text-icon text-sm">Отмена</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-on-brand text-sm font-medium">${isEdit ? 'Сохранить' : 'Создать'}</button>
            </div>
        </form>`;

        document.getElementById('form-part').addEventListener('submit', (e) => savePart(e, part));
        openModal('modal-part');
    }

    async function savePart(e, part) {
        e.preventDefault();
        const title = document.getElementById('part-title').value.trim();
        const content = document.getElementById('part-content').value;
        const positionRaw = document.getElementById('part-position').value.trim();
        if (!content.trim()) return showToast('Содержимое обязательно', 'error');

        const payload = { title: title || null, content };
        if (positionRaw !== '') payload.position = Number(positionRaw);

        try {
            if (part) {
                await apiRequest(`/admin/knowledge/parts/${part.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
                showToast(`Часть #${part.id} обновлена`);
            } else {
                await apiRequest(`/admin/knowledge/documents/${state.knowledge.parts.docId}/parts`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast('Часть создана');
            }
            closeModal('modal-part');
            await refreshParts(state.knowledge.parts.docId);
        } catch (err) { showToast(err.message, 'error'); }
    }

    // ---------- Категории ----------

    async function openCategoriesModal() {
        document.getElementById('categories-body').innerHTML =
            `<div class="p-6 text-center text-ink-secondary text-xs"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Загрузка категорий…</div>`;
        openModal('modal-categories');
        await refreshCategories();
    }

    async function refreshCategories() {
        try {
            const res = await apiRequest('/admin/knowledge/categories');
            state.knowledge.categories = res.items || [];
            renderCategoriesList();
        } catch (err) { showToast(err.message, 'error'); }
    }

    function renderCategoriesList() {
        const body = document.getElementById('categories-body');
        const cats = state.knowledge.categories;

        const itemsHtml = cats.length === 0
            ? `<div class="p-6 text-center text-ink-secondary text-xs">Категорий пока нет</div>`
            : cats.map(c => `
            <div class="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-surface-muted border border-line-subtle">
                <div class="min-w-0">
                    <div class="font-medium text-sm text-ink">${escapeHtml(c.name)} <span class="text-[11px] text-ink-secondary font-mono">(${escapeHtml(c.slug)})</span></div>
                    ${c.description ? `<div class="text-[11px] text-ink-secondary mt-0.5 truncate">${escapeHtml(c.description)}</div>` : ''}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="text-[11px] ${c.is_active ? 'text-success' : 'text-ink-secondary'}">${c.is_active ? 'активна' : 'скрыта'}</span>
                    <button data-cat-delete="${c.id}" class="px-2 py-1 rounded-[10px] bg-white hover:bg-danger-bg text-ink-secondary hover:text-danger border border-line text-xs">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`).join('');

        body.innerHTML = `
        <div class="space-y-2 mb-4">${itemsHtml}</div>
        <form id="form-category" class="space-y-3 p-4 rounded-xl bg-surface-muted border border-line-subtle">
            <div class="text-xs font-semibold text-icon mb-1"><i class="fa-solid fa-plus mr-1"></i>Добавить категорию</div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Название *</label>
                    <input type="text" id="cat-name" required maxlength="255" placeholder="Инструкции" class="w-full px-3 py-2 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                </div>
                <div>
                    <label class="block text-xs text-ink-secondary mb-1">Slug * <span class="text-[10px]">(a-z0-9-_)</span></label>
                    <input type="text" id="cat-slug" required pattern="^[a-z0-9\\-_]+$" maxlength="255" placeholder="instructions" class="w-full px-3 py-2 bg-white border border-line rounded-[10px] text-sm text-ink font-mono focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                </div>
            </div>
            <div>
                <label class="block text-xs text-ink-secondary mb-1">Описание</label>
                <input type="text" id="cat-description" class="w-full px-3 py-2 bg-white border border-line rounded-[10px] text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand">
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="cat-active" checked class="accent-brand">
                <label for="cat-active" class="text-xs text-icon">Активна</label>
                <div class="flex-1"></div>
                <button type="submit" class="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-on-brand text-xs font-medium">Создать</button>
            </div>
        </form>`;

        body.querySelectorAll('[data-cat-delete]').forEach(b => b.addEventListener('click', async () => {
            const id = b.dataset.catDelete;
            if (!confirm(`Удалить категорию #${id}?`)) return;
            try {
                await apiRequest(`/admin/knowledge/categories/${id}`, { method: 'DELETE' });
                showToast(`Категория #${id} удалена`);
                await refreshCategories();
            } catch (err) { showToast(err.message, 'error'); }
        }));

        document.getElementById('form-category').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiRequest('/admin/knowledge/categories', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('cat-name').value.trim(),
                        slug: document.getElementById('cat-slug').value.trim(),
                        description: document.getElementById('cat-description').value.trim() || null,
                        is_active: document.getElementById('cat-active').checked
                    })
                });
                showToast('Категория создана');
                await refreshCategories();
            } catch (err) { showToast(err.message, 'error'); }
        });
    }

    // ---------- Привязки ----------
    document.getElementById('btn-knowledge-create').addEventListener('click', () => openKnowledgeModal(null));
    document.getElementById('btn-add-part').addEventListener('click', () => openPartEditModal(null));
    document.getElementById('btn-categories-manage').addEventListener('click', openCategoriesModal);

    // ==================== ПЕРВИЧНАЯ ЗАГРУЗКА ====================
    loadLeads();
});