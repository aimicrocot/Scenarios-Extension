import { getContext } from '../../extensions.js';
import { characters, saveCharacter } from '../../characters.js';
import { eventSource, event_types } from '../../events.js';
import { callGenericPopup, POPUP_TYPE } from '../../popup.js';

// Функция для добавления кнопки в ряд
function tryInjectButton() {
    // Ищем ряд кнопок (в нем кнопка удаления, избранного и т.д.)
    const targetRow = document.querySelector('.character_details_buttons');
    
    if (targetRow && !document.getElementById('ms-open-manager-btn')) {
        const newBtn = document.createElement('div');
        newBtn.id = 'ms-open-manager-btn';
        newBtn.className = 'menu_button fa-solid fa-puzzle-piece';
        newBtn.title = 'Открыть менеджер сценариев';
        newBtn.style.color = '#ffa500'; // Оранжевый, чтобы выделялся

        newBtn.onclick = function() {
            showManagerPopup();
        };

        // Вставляем кнопку в начало ряда
        targetRow.prepend(newBtn);
    }
}

// Окно управления сценариями
async function showManagerPopup() {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char) return;

    if (!char.extra_data) char.extra_data = {};
    if (!char.extra_data.scenarios) char.extra_data.scenarios = [];

    const scenarios = char.extra_data.scenarios;

    const renderItems = () => {
        return scenarios.map((s, i) => `
            <div class="ms-item-box" data-id="${i}">
                <div class="ms-header-row">
                    <input class="ms-title-input" value="${s.name}" placeholder="Название сценария...">
                    <div class="ms-controls">
                        <input type="checkbox" class="ms-item-toggle" ${s.enabled ? 'checked' : ''}>
                        <i class="fa-solid fa-trash-can ms-item-delete" style="cursor:pointer; color:#ff4444;"></i>
                    </div>
                </div>
                <textarea class="ms-content-area" placeholder="Описание сценария...">${s.content}</textarea>
            </div>
        `).join('') || '<p style="text-align:center;">Нажмите +, чтобы создать первый сценарий</p>';
    };

    const html = `
        <div class="ms-popup-content">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Менеджер Сценариев</h2>
                <div id="ms-add-new" class="menu_button fa-solid fa-plus" title="Добавить новый"></div>
            </div>
            <div id="ms-list-container">${renderItems()}</div>
        </div>
    `;

    // Вызываем окно
    await callGenericPopup(html, POPUP_TYPE.TEXT, '', { okButton: 'Закрыть и сохранить' });

    // После закрытия или во время работы сохраняем данные обратно в персонажа
    saveCharacter();
}

// Логика внедрения сценария в промпт
eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char?.extra_data?.scenarios) return;

    const activeScenarios = char.extra_data.scenarios
        .filter(s => s.enabled && s.content.trim())
        .map(s => `[Scenario: ${s.name}]\n${s.content}`)
        .join('\n\n');

    if (activeScenarios) {
        // Добавляем в начало промпта
        if (typeof data.prompt === 'string') {
            data.prompt = activeScenarios + '\n\n' + data.prompt;
        } else if (Array.isArray(data.prompt)) {
            data.prompt.unshift({ role: 'system', content: activeScenarios });
        }
    }
});

// Слушатель событий изменения в DOM (чтобы кнопка не пропадала)
const observer = new MutationObserver(() => {
    tryInjectButton();
});

// Запуск
$(document).ready(() => {
    tryInjectButton();
    observer.observe(document.body, { childList: true, subtree: true });
});

// Обработка кликов внутри динамического окна (делегирование)
$(document).on('click', '#ms-add-new', function() {
    const context = getContext();
    const char = characters[context.characterId];
    char.extra_data.scenarios.push({ name: 'Новый сценарий', content: '', enabled: true });
    // Перерисовываем список внутри открытого окна
    $('#ms-list-container').html(char.extra_data.scenarios.map((s, i) => `...`).join('')); // Упрощено для краткости
});
