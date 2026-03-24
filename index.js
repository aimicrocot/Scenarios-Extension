import { getContext, extension_settings } from '../../extensions.js';
import { characters, saveCharacter, getCharacterDraft, setCharacterDraft } from '../../characters.js';
import { eventSource, event_types } from '../../events.js';
import { callGenericPopup, POPUP_TYPE } from '../../popup.js';

// Константы
const MODULE_NAME = "multiple-scenarios";

// Функция отрисовки интерфейса (окна)
async function openScenarioManager() {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char) return;

    // Инициализация данных, если их нет
    if (!char.extra_data) char.extra_data = {};
    if (!char.extra_data.scenarios) char.extra_data.scenarios = [];

    const scenarios = char.extra_data.scenarios;

    const renderList = () => {
        return scenarios.map((s, i) => `
            <div class="ms-scenario-card" data-id="${i}">
                <div class="ms-card-header">
                    <input class="text_aligned ms-title-input" type="text" value="${s.name || ''}" placeholder="Название сценария...">
                    <div style="display:flex; gap:12px; align-items:center;">
                        <label class="checkbox_label">
                            <input type="checkbox" class="ms-enable-toggle" ${s.enabled ? 'checked' : ''}>
                            <span>Вкл</span>
                        </label>
                        <i class="fa-solid fa-trash-can ms-delete-btn" style="cursor:pointer; color:var(--red);"></i>
                    </div>
                </div>
                <textarea class="ms-text-area">${s.content || ''}</textarea>
            </div>
        `).join('') || '<p style="text-align:center;">Сценариев пока нет. Нажмите "+".</p>';
    };

    const popupHtml = `
        <div id="ms-manager-popup">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Менеджер сценариев</h3>
                <div id="ms-add-new-btn" class="menu_button fa-solid fa-plus" title="Добавить сценарий"></div>
            </div>
            <div id="ms-list-container">${renderList()}</div>
        </div>
    `;

    await callGenericPopup(popupHtml, POPUP_TYPE.TEXT, '', { okButton: "Сохранить", cancelButton: "Отмена" });
    
    // Сохраняем все данные при закрытии
    saveCharacter();
}

// Функция добавления кнопки в редактор персонажа
function addPuzzleButton() {
    // Ищем контейнер кнопок (Image 5)
    const btnContainer = document.querySelector('#character_edit_form .character_details_buttons');
    
    if (btnContainer && !document.getElementById('ms-puzzle-btn')) {
        const puzzleBtn = document.createElement('div');
        puzzleBtn.id = 'ms-puzzle-btn';
        puzzleBtn.className = 'menu_button fa-solid fa-puzzle-piece ms-puzzle-icon';
        puzzleBtn.title = 'Setup scenarios';
        
        // Вставляем кнопку в начало ряда
        btnContainer.prepend(puzzleBtn);
        puzzleBtn.onclick = () => openScenarioManager();
    }
}

// Логика внедрения в промпт (как лорбуки)
eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char?.extra_data?.scenarios) return;

    const activeScenarios = char.extra_data.scenarios
        .filter(s => s.enabled && s.content?.trim())
        .map(s => s.content)
        .join('\n\n');

    if (activeScenarios) {
        // Подмешиваем текст в начало промпта
        if (typeof data.prompt === 'string') {
            data.prompt = `[Scenario Context:]\n${activeScenarios}\n\n` + data.prompt;
        } else if (Array.isArray(data.prompt)) {
            data.prompt.unshift({ role: 'system', content: `[Scenario Context:]\n${activeScenarios}` });
        }
    }
});

// Слушаем события, чтобы кнопка не пропадала при переключении ботов
eventSource.on(event_types.CHARACTER_SELECTED, () => {
    setTimeout(addPuzzleButton, 100);
});

eventSource.on(event_types.CHARACTER_EDITED, () => {
    addPuzzleButton();
});

// Глобальное делегирование кликов для динамического окна
$(document).on('click', '#ms-add-new-btn', function() {
    const char = characters[getContext().characterId];
    char.extra_data.scenarios.push({ name: 'Новый сюжет', content: '', enabled: true });
    // Обновляем список (простой способ — перерисовать всё окно или DOM)
    $('#ms-list-container').append(`
        <div class="ms-scenario-card" data-id="${char.extra_data.scenarios.length - 1}">...</div>
    `); 
    // Рекомендую просто перезапустить renderList()
});

$(document).on('input', '.ms-title-input, .ms-text-area', function() {
    const id = $(this).closest('.ms-scenario-card').data('id');
    const field = $(this).hasClass('ms-title-input') ? 'name' : 'content';
    const char = characters[getContext().characterId];
    char.extra_data.scenarios[id][field] = $(this).val();
});

$(document).on('change', '.ms-enable-toggle', function() {
    const id = $(this).closest('.ms-scenario-card').data('id');
    const char = characters[getContext().characterId];
    char.extra_data.scenarios[id].enabled = $(this).is(':checked');
});

// Запуск
$(document).ready(() => {
    addPuzzleButton();
});
