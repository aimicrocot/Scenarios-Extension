import { getContext, saveSettingsDebounced } from '../../extensions.js';
import { characters, saveCharacter } from '../../characters.js';
import { eventSource, event_types } from '../../events.js';
import { callGenericPopup, POPUP_TYPE } from '../../popup.js';

// 1. Функция вставки кнопки в ряд управления персонажем
function injectPuzzleButton() {
    // Ищем контейнер с кнопками (тот самый ряд со звездочкой и черепом)
    const buttonRow = document.querySelector('.character_details_buttons');
    
    if (buttonRow && !document.getElementById('ms-open-manager')) {
        const btn = document.createElement('div');
        btn.id = 'ms-open-manager';
        btn.className = 'menu_button fa-solid fa-puzzle-piece'; // Иконка пазла
        btn.title = 'Менеджер сценариев';
        
        // Вставляем кнопку в начало ряда
        buttonRow.prepend(btn);
        btn.addEventListener('click', () => showScenarioManager());
    }
}

// 2. Окно менеджера сценариев
async function showScenarioManager() {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char) return;

    // Инициализируем данные в персонаже, если их нет
    if (!char.extra_data) char.extra_data = {};
    if (!char.extra_data.scenarios) char.extra_data.scenarios = [];

    const scenarios = char.extra_data.scenarios;

    const renderList = () => {
        return scenarios.map((s, i) => `
            <div class="ms-item" data-id="${i}">
                <div class="ms-item-header">
                    <input class="ms-input-name" value="${s.name}" data-field="name">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="checkbox" class="ms-toggle" ${s.enabled ? 'checked' : ''}>
                        <i class="fa-solid fa-trash-can ms-delete-btn" title="Удалить"></i>
                    </div>
                </div>
                <textarea class="ms-textarea" data-field="content">${s.content}</textarea>
            </div>
        `).join('') || '<p>Нажмите "+", чтобы добавить новый сценарий.</p>';
    };

    const popupHtml = `
        <div class="ms-container">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Сценарии</h3>
                <div id="ms-add-btn" class="menu_button fa-solid fa-plus" title="Добавить"></div>
            </div>
            <div id="ms-list">${renderList()}</div>
        </div>
    `;

    await callGenericPopup(popupHtml, POPUP_TYPE.CONFIRM);
    saveCharacter(); // Сохраняем изменения при закрытии
}

// 3. Обработка событий промпта (отправка сценариев ИИ)
eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char?.extra_data?.scenarios) return;

    // Собираем все включенные сценарии
    const activeText = char.extra_data.scenarios
        .filter(s => s.enabled && s.content.trim())
        .map(s => s.content)
        .join('\n\n');

    if (activeText) {
        // Вставляем текст сценариев в начало системного промпта
        if (typeof data.prompt === 'string') {
            data.prompt = `[Scenarios Active:]\n${activeText}\n\n${data.prompt}`;
        } else if (Array.isArray(data.prompt)) {
            data.prompt.unshift({ role: 'system', content: `[Scenarios Active:]\n${activeText}` });
        }
    }
});

// Запуск функций при загрузке страницы и смене персонажа
$(document).ready(() => {
    injectPuzzleButton();
    // Следим за изменениями в UI, если Таверна перерисовывает редактор
    const observer = new MutationObserver(injectPuzzleButton);
    observer.observe(document.body, { childList: true, subtree: true });
});
        } else if (typeof data.prompt === 'object' && data.prompt.messages) {
            // Для некоторых API промт представлен массивом сообщений
            data.prompt.messages.unshift({ role: 'system', content: scenariosText });
        }
    });
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Запуск
init();
injectScenariosIntoPrompt();
