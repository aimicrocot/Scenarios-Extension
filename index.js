import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup"; // должно совпадать с именем папки
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

const defaultSettings = {
    scenarios: [] // массив объектов { id: string, text: string, created: number }
};

function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {};
    }
    // Если в настройках нет scenarios, инициализируем пустым массивом
    if (!extension_settings[extensionName].scenarios) {
        extension_settings[extensionName].scenarios = [...defaultSettings.scenarios];
        saveSettingsDebounced();
    }
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const scenarios = extension_settings[extensionName].scenarios || [];
    
    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>');
        return;
    }
    
    // Простой вывод: каждый сценарий как элемент списка с текстом и датой
    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const date = new Date(scenario.created).toLocaleString();
        // Экранируем текст, чтобы избежать XSS
        const safeText = escapeHtml(scenario.text);
        html += `<li style="margin-bottom: 8px;">
                    <strong>${date}</strong><br>
                    ${safeText}
                 </li>`;
    });
    html += '</ul>';
    $listContainer.html(html);
}

// Простая функция экранирования HTML
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

async function showScenarioMenu() {
    try {
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const popupHtml = await response.text();
        
        callPopup(popupHtml, "text");
        console.log("Scenario Setup: Окно открыто");

        // Загружаем актуальные настройки перед отрисовкой
        loadSettings();
        renderScenarioList();
        
        // Обработчик кнопки добавления
        $("#add_scenario_btn").off("click").on("click", () => {
            const $textarea = $("#new_scenario_text");
            const text = $textarea.val().trim();
            if (!text) {
                toastr.warning("Введите текст сценария");
                return;
            }
            
            const newScenario = {
                id: Date.now().toString(),
                text: text,
                created: Date.now()
            };
            
            extension_settings[extensionName].scenarios.push(newScenario);
            saveSettingsDebounced();
            
            // Обновляем список
            renderScenarioList();
            
            // Очищаем поле
            $textarea.val("");
            
            // Обновляем счётчик токенов (опционально)
            updateTokenCounter();
            
            toastr.success("Сценарий добавлен");
        });
        
        // Привязываем обновление счётчика токенов (можно реализовать позже)
        $("#new_scenario_text").on("input", updateTokenCounter);
        updateTokenCounter();
        
    } catch (error) {
        console.error("Scenario Setup: Ошибка загрузки окна:", error);
        toastr.error(`Не удалось загрузить файл окна. Проверьте консоль F12.`);
    }
}

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    // Простая оценка: количество слов * 1.3 (можно заменить на реальный токенизатор)
    const estimatedTokens = Math.ceil(text.length / 4);
    $(".token-counter").text(estimatedTokens);
}

function injectPuzzleButton() {
    if ($("#scenario-setup-button").length > 0) return;

    const targetButton = $("#advanced_div");
    if (targetButton.length > 0) {
        const buttonContainer = targetButton.parent();
        const puzzleButton = $(`
            <div id="scenario-setup-button" 
                 class="menu_button fa-solid fa-puzzle-piece interactable" 
                 title="Scenario Setup" 
                 tabindex="0" 
                 role="button"
                 style="display: flex; align-items: center; justify-content: center;">
            </div>
        `);
        buttonContainer.prepend(puzzleButton);
        puzzleButton.on("click", (e) => {
            e.stopPropagation();
            showScenarioMenu();
        });
    }
}

jQuery(async () => {
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPuzzleButton();
    
    // Инициализируем настройки при старте
    loadSettings();
});
