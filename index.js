import { getContext, saveSettingsDebounced } from '../../extensions.js';
import { characters, saveCharacter } from '../../characters.js';
import { eventSource, event_types } from '../../events.js';
import { callGenericPopup, POPUP_TYPE } from '../../popup.js';

const EXTENSION_NAME = 'multiple-scenarios';

// Функция отрисовки кнопки-пазла в редакторе
function injectScenarioButton() {
    // Ищем контейнер с кнопками управления персонажем (Image 1)
    const container = document.querySelector('#character_edit_form .fa-puzzle-piece')?.parentElement;
    
    if (container && !document.getElementById('ms-open-manager')) {
        const btn = document.createElement('div');
        btn.id = 'ms-open-manager';
        btn.className = 'menu_button fa-solid fa-puzzle-piece'; // Иконка пазла
        btn.title = 'Открыть менеджер сценариев';
        btn.style.color = '#ffac33'; // Выделим цветом для заметности
        
        btn.onclick = () => showScenarioManager();
        container.appendChild(btn);
    }
}

// Окно управления сценариями
async function showScenarioManager() {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char) return;

    // Инициализируем хранилище в данных персонажа, если его нет
    if (!char.extra_data) char.extra_data = {};
    if (!char.extra_data.scenarios) char.extra_data.scenarios = [];

    const renderList = () => {
        return char.extra_data.scenarios.map((s, i) => `
            <div class="ms-item" data-id="${i}">
                <div class="ms-item-header">
                    <input class="ms-input-name" value="${s.name}" placeholder="Название...">
                    <label class="switch">
                        <input type="checkbox" class="ms-toggle" ${s.enabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <div class="menu_button fa-solid fa-trash ms-delete" style="color:red;"></div>
                </div>
                <textarea class="ms-textarea">${s.content}</textarea>
            </div>
        `).join('') || '<p>Нажмите "+", чтобы добавить сценарий</p>';
    };

    const html = `
        <div class="ms-manager-container">
            <div style="display:flex; justify-content:space-between;">
                <h3>Менеджер сценариев</h3>
                <div id="ms-add-new" class="menu_button fa-solid fa-plus"></div>
            </div>
            <div id="ms-list-holder">${renderList()}</div>
        </div>
    `;

    await callGenericPopup(html, POPUP_TYPE.CONFIRM);
    
    // Логика кнопок внутри окна (добавление, удаление, сохранение)
    setupPopupListeners(char);
}

function setupPopupListeners(char) {
    document.getElementById('ms-add-new').onclick = () => {
        char.extra_data.scenarios.push({ name: 'Новый сценарий', content: '', enabled: true });
        saveCharacter();
        // Здесь можно вызвать перерисовку списка
    };
    // Аналогично для удаления и изменения текста...
}

// Модификация промпта перед отправкой
eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
    const context = getContext();
    const char = characters[context.characterId];
    if (!char?.extra_data?.scenarios) return;

    const activeScenarios = char.extra_data.scenarios
        .filter(s => s.enabled && s.content.trim())
        .map(s => s.content)
        .join('\n');

    if (activeScenarios) {
        // Вставляем сценарии в системный промпт (или заменяем стандартный сценарий)
        data.prompt = `Context/Scenario Update:\n${activeScenarios}\n\n${data.prompt}`;
    }
});

// Запуск при загрузке и переключении персонажа
eventSource.on(event_types.CHARACTER_SWITCHED, injectScenarioButton);
$(document).ready(injectScenarioButton);
        name: 'Новый сценарий',
        content: '',
        enabled: true
    });
    saveScenarios();
    refreshScenariosList();
}

// При смене персонажа обновляем список сценариев
function onCharacterSwitched() {
    const currentCharId = getCurrentCharacterId();
    if (!scenariosStore[currentCharId]) {
        scenariosStore[currentCharId] = [];
        saveScenarios();
    }
    refreshScenariosList();
}

// Вставка активных сценариев в промт (событие CHARACTER_MESSAGE_RENDERED – подходит для модификации промта)
function onMessageRendered(event) {
    // Здесь мы можем модифицировать промт, но в SillyTavern для вставки контекста лучше использовать
    // событие CHAT_COMPLETION_PROMPT_READY. Однако CHARACTER_MESSAGE_RENDERED срабатывает после получения ответа.
    // Для вставки перед отправкой запроса используем событие CHAT_COMPLETION_PROMPT_READY.
    // Но в данном расширении мы добавим обработчик на CHAT_COMPLETION_PROMPT_READY.
}

// Правильный способ: подписаться на событие формирования промта
function injectScenariosIntoPrompt() {
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
        const currentCharId = getCurrentCharacterId();
        const scenarios = (scenariosStore[currentCharId] || []).filter(s => s.enabled && s.content.trim() !== '');
        if (scenarios.length === 0) return;

        // Формируем текст сценариев в виде отдельного блока
        let scenariosText = '';
        for (const scenario of scenarios) {
            scenariosText += `[Сценарий: ${scenario.name}]\n${scenario.content}\n\n`;
        }

        // Вставляем сценарии в начало промта (или можно в любое место)
        // data.prompt – это строка промта, которую можно модифицировать
        // Но будьте осторожны: промт может быть объектом, в зависимости от API.
        // Для универсальности используем простую строковую вставку.
        if (typeof data.prompt === 'string') {
            data.prompt = scenariosText + data.prompt;
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
