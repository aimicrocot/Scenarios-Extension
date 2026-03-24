import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { getCurrentCharacterId, getCharacter, saveCharacter } from "../../../../char-data.js";
import { eventSource, EventSource } from "../../../../script.js";

const extensionName = "scenario-manager";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

let currentScenarios = [];

// Экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Загрузка сценариев для текущего персонажа
async function loadScenariosForCharacter(characterId) {
    if (!characterId) {
        currentScenarios = [];
        return;
    }
    try {
        const character = await getCharacter(characterId);
        if (character && character.data && character.data.scenarios) {
            currentScenarios = character.data.scenarios;
        } else {
            currentScenarios = [];
        }
    } catch (err) {
        console.error(`[${extensionName}] Ошибка загрузки сценариев:`, err);
        currentScenarios = [];
    }
}

// Сохранение сценариев
async function saveScenariosToCharacter() {
    const characterId = getCurrentCharacterId();
    if (!characterId) return;
    try {
        const character = await getCharacter(characterId);
        if (!character) return;
        if (!character.data) character.data = {};
        character.data.scenarios = currentScenarios;
        await saveCharacter(characterId, character);
        await saveSettingsDebounced();
        console.log(`[${extensionName}] Сценарии сохранены`);
    } catch (err) {
        console.error(`[${extensionName}] Ошибка сохранения сценариев:`, err);
    }
}

// Получить имя персонажа
function getCurrentCharacterName() {
    const charId = getCurrentCharacterId();
    if (!charId) return 'Не выбран';
    const char = getCharacter(charId);
    return char?.name || charId;
}

// Создание модального окна для управления сценариями
function openScenariosWindow() {
    const modal = document.createElement('div');
    modal.className = 'scenario-manager-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Сценарии для ${escapeHtml(getCurrentCharacterName())}</h2>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="scenarios-list"></div>
            <div class="scenario-actions">
                <button id="add-scenario-btn" class="menu_button">+ Добавить сценарий</button>
                <button id="close-modal-footer-btn" class="menu_button">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    function renderScenarios() {
        const container = modal.querySelector('.scenarios-list');
        if (!container) return;
        container.innerHTML = '';

        if (currentScenarios.length === 0) {
            container.innerHTML = '<div class="empty-message">Нет сценариев. Нажмите «+ Добавить сценарий».</div>';
            return;
        }

        currentScenarios.forEach((scenario, idx) => {
            const item = document.createElement('div');
            item.className = 'scenario-item';
            item.innerHTML = `
                <div class="scenario-header">
                    <div class="scenario-title">
                        <input type="checkbox" class="scenario-toggle" data-idx="${idx}" ${scenario.enabled ? 'checked' : ''}>
                        <input type="text" class="scenario-name" data-idx="${idx}" value="${escapeHtml(scenario.name)}" placeholder="Название сценария">
                    </div>
                    <button class="scenario-delete" data-idx="${idx}" title="Удалить">🗑️</button>
                </div>
                <textarea class="scenario-content" data-idx="${idx}" rows="4" placeholder="Текст сценария...">${escapeHtml(scenario.content)}</textarea>
            `;
            container.appendChild(item);
        });

        // Обработчики
        container.querySelectorAll('.scenario-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const idx = parseInt(toggle.dataset.idx);
                if (!isNaN(idx) && currentScenarios[idx]) {
                    currentScenarios[idx].enabled = toggle.checked;
                    saveScenariosToCharacter();
                }
            });
        });

        container.querySelectorAll('.scenario-name').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(input.dataset.idx);
                if (!isNaN(idx) && currentScenarios[idx]) {
                    currentScenarios[idx].name = input.value;
                    saveScenariosToCharacter();
                }
            });
        });

        container.querySelectorAll('.scenario-content').forEach(textarea => {
            textarea.addEventListener('change', (e) => {
                const idx = parseInt(textarea.dataset.idx);
                if (!isNaN(idx) && currentScenarios[idx]) {
                    currentScenarios[idx].content = textarea.value;
                    saveScenariosToCharacter();
                }
            });
        });

        container.querySelectorAll('.scenario-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.idx);
                if (!isNaN(idx) && currentScenarios[idx]) {
                    currentScenarios.splice(idx, 1);
                    renderScenarios();
                    saveScenariosToCharacter();
                }
            });
        });
    }

    function addScenario() {
        currentScenarios.push({
            name: 'Новый сценарий',
            content: '',
            enabled: true,
        });
        renderScenarios();
        saveScenariosToCharacter();
    }

    modal.querySelector('#add-scenario-btn').addEventListener('click', addScenario);
    modal.querySelector('#close-modal-footer-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    renderScenarios();
}

// Обновление счётчика сценариев на вкладке
function updateScenarioCount() {
    const countSpan = document.querySelector('#scenario-count');
    if (countSpan) {
        countSpan.textContent = currentScenarios.length;
    }
}

// Хук на отправку сообщения – добавляем включённые сценарии в системный промпт
function onMessageSend(data) {
    const enabledScenarios = currentScenarios.filter(s => s.enabled && s.content && s.content.trim());
    if (enabledScenarios.length === 0) return data;

    let combined = enabledScenarios.map(s => `### ${s.name}\n${s.content}`).join('\n\n');
    if (data.systemPrompt) {
        data.systemPrompt = combined + '\n\n' + data.systemPrompt;
    } else {
        data.systemPrompt = combined;
    }
    return data;
}

// Смена персонажа
function onCharacterChanged() {
    const newId = getCurrentCharacterId();
    loadScenariosForCharacter(newId).then(() => {
        updateScenarioCount();
    });
}

// Добавление вкладки в редактор персонажа
function addScenarioTab() {
    const tabId = 'scenario-manager-tab';
    const tabLabel = 'Сценарии';
    const tabContent = document.createElement('div');
    tabContent.className = 'scenario-manager-tab';
    tabContent.innerHTML = `
        <div class="scenario-manager-controls">
            <button id="open-scenarios-window-btn" class="menu_button" style="width: 100%;">📖 Setup scenario</button>
            <div class="scenario-stats">
                Сценариев: <span id="scenario-count">0</span>
            </div>
        </div>
    `;

    // Попытка использовать официальный API
    if (window.sillytavern?.characterEditor?.addTab) {
        window.sillytavern.characterEditor.addTab(tabId, tabLabel, tabContent);
    } else {
        // Fallback: ищем стандартные элементы
        const tabsContainer = document.querySelector('.character_editor_tabs');
        const contentContainer = document.querySelector('.character_editor_content');
        if (tabsContainer && contentContainer) {
            const newTab = document.createElement('div');
            newTab.className = 'character_editor_tab';
            newTab.textContent = tabLabel;
            newTab.setAttribute('data-tab-id', tabId);
            const newContent = document.createElement('div');
            newContent.className = 'character_editor_tab_content';
            newContent.id = `tab-${tabId}`;
            newContent.appendChild(tabContent);
            contentContainer.appendChild(newContent);
            tabsContainer.appendChild(newTab);
            newTab.addEventListener('click', () => {
                document.querySelectorAll('.character_editor_tab').forEach(t => t.classList.remove('selected'));
                document.querySelectorAll('.character_editor_tab_content').forEach(c => c.classList.remove('selected'));
                newTab.classList.add('selected');
                newContent.classList.add('selected');
            });
        }
    }

    const openBtn = document.getElementById('open-scenarios-window-btn');
    if (openBtn) {
        openBtn.addEventListener('click', openScenariosWindow);
    }
}

// Инициализация расширения
jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);
    try {
        // Загружаем HTML для настроек (если нужно), но в данном расширении настройки не требуются
        // Можно просто добавить вкладку
        await loadScenariosForCharacter(getCurrentCharacterId());
        addScenarioTab();
        updateScenarioCount();

        // Подписываемся на события
        eventSource.on(EventSource.CHARACTER_CHANGED, onCharacterChanged);
        eventSource.on(EventSource.MESSAGE_SEND, onMessageSend);

        console.log(`[${extensionName}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
