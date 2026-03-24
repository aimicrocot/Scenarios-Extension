import { getContext, extensionManager, saveSettingsDebounced } from '../../extensions.js';
import { characters, saveCharacter, loadCharacter } from '../../characters.js';
import { eventSource, event_types } from '../../events.js';

// Идентификатор расширения
const EXTENSION_NAME = 'multiple-scenarios';

// Хранилище: объект, где ключ – ID персонажа, значение – массив сценариев
let scenariosStore = {};

// Контекст SillyTavern
let context = null;

// Функция инициализации
async function init() {
    context = getContext();
    // Загружаем сохранённые сценарии
    await loadScenarios();
    // Создаём UI
    addScenarioTab();
    // Подписываемся на события генерации для вставки сценариев в промт
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(event_types.CHARACTER_SWITCHED, onCharacterSwitched);
}

// Загрузка сценариев из localStorage или файла персонажа
async function loadScenarios() {
    const stored = localStorage.getItem(`${EXTENSION_NAME}_store`);
    if (stored) {
        scenariosStore = JSON.parse(stored);
    } else {
        scenariosStore = {};
    }
    // Если для текущего персонажа нет записей – инициализируем пустым массивом
    const currentCharId = getCurrentCharacterId();
    if (!scenariosStore[currentCharId]) {
        scenariosStore[currentCharId] = [];
    }
}

// Сохранение сценариев
function saveScenarios() {
    localStorage.setItem(`${EXTENSION_NAME}_store`, JSON.stringify(scenariosStore));
    saveSettingsDebounced(); // опционально, если используем глобальные настройки
}

// Получение ID текущего персонажа
function getCurrentCharacterId() {
    return characters[context.characterId]?.avatar || context.characterId;
}

// Создание вкладки "Сценарии" в боковой панели (рядом с "Лорбуки", "Инвентарь" и т.д.)
function addScenarioTab() {
    const sidebarHtml = `
        <div id="multiple-scenarios-tab" class="interactable">
            <div class="drawer-header">
                <div class="drawer-title">Сценарии</div>
                <div id="ms-add-scenario-btn" class="menu_button fa-solid fa-plus" title="Добавить сценарий"></div>
            </div>
            <div id="ms-scenarios-list" class="ms-scenarios-container">
                <!-- Список сценариев будет отрисован здесь -->
            </div>
        </div>
    `;
    // Добавляем вкладку в боковое меню (рядом с Lorebook и пр.)
    const sidebar = document.querySelector('#sidebar .drawer-content');
    if (sidebar && !document.getElementById('multiple-scenarios-tab')) {
        sidebar.insertAdjacentHTML('beforeend', sidebarHtml);
        document.getElementById('ms-add-scenario-btn').addEventListener('click', () => addNewScenario());
        refreshScenariosList();
    }
}

// Отрисовка списка сценариев
function refreshScenariosList() {
    const container = document.getElementById('ms-scenarios-list');
    if (!container) return;

    const currentCharId = getCurrentCharacterId();
    const scenarios = scenariosStore[currentCharId] || [];

    if (scenarios.length === 0) {
        container.innerHTML = '<div class="ms-empty">Нет сценариев. Нажмите "+" для добавления.</div>';
        return;
    }

    let html = '';
    scenarios.forEach((scenario, index) => {
        html += `
            <div class="ms-scenario-item" data-index="${index}">
                <div class="ms-scenario-header">
                    <input type="text" class="ms-scenario-name" value="${escapeHtml(scenario.name)}" placeholder="Название сценария">
                    <div class="ms-scenario-controls">
                        <label class="ms-toggle">
                            <input type="checkbox" class="ms-toggle-input" ${scenario.enabled ? 'checked' : ''}>
                            <span class="ms-toggle-slider"></span>
                        </label>
                        <div class="ms-delete-btn fa-solid fa-trash-can" title="Удалить сценарий"></div>
                    </div>
                </div>
                <textarea class="ms-scenario-content" placeholder="Текст сценария...">${escapeHtml(scenario.content)}</textarea>
            </div>
        `;
    });

    container.innerHTML = html;

    // Вешаем обработчики на элементы управления
    document.querySelectorAll('.ms-scenario-item').forEach(item => {
        const idx = item.dataset.index;
        const nameInput = item.querySelector('.ms-scenario-name');
        const contentTextarea = item.querySelector('.ms-scenario-content');
        const toggleCheckbox = item.querySelector('.ms-toggle-input');
        const deleteBtn = item.querySelector('.ms-delete-btn');

        nameInput.addEventListener('change', () => {
            scenarios[idx].name = nameInput.value;
            saveScenarios();
        });
        contentTextarea.addEventListener('change', () => {
            scenarios[idx].content = contentTextarea.value;
            saveScenarios();
        });
        toggleCheckbox.addEventListener('change', (e) => {
            scenarios[idx].enabled = e.target.checked;
            saveScenarios();
        });
        deleteBtn.addEventListener('click', () => {
            scenarios.splice(idx, 1);
            saveScenarios();
            refreshScenariosList();
        });
    });
}

// Добавление нового сценария
function addNewScenario() {
    const currentCharId = getCurrentCharacterId();
    if (!scenariosStore[currentCharId]) scenariosStore[currentCharId] = [];
    scenariosStore[currentCharId].push({
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
