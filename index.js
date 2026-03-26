import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

// Умное определение пути к папке расширения
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

// Имя расширения должно совпадать с именем папки
const extensionName = "scenario-setup"; // ⚠️ ПРОВЕРЬТЕ: если папка называется иначе, замените здесь

// Настройки по умолчанию
const defaultSettings = {
    scenarios: [] // массив объектов { id: string, text: string, created: number }
};

function loadSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {};
    }
    if (!extension_settings[extensionName].scenarios) {
        extension_settings[extensionName].scenarios = [...defaultSettings.scenarios];
        saveSettingsDebounced();
    }
}

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

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    const estimatedTokens = Math.ceil(text.length / 4);
    $(".token-counter").text(estimatedTokens);
}

function deleteScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const index = scenarios.findIndex(s => s.id === scenarioId);
    if (index !== -1) {
        scenarios.splice(index, 1);
        extension_settings[extensionName].scenarios = scenarios;
        saveSettingsDebounced();
        renderScenarioList();
        toastr.info("Сценарий удалён");
    }
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const scenarios = extension_settings[extensionName].scenarios || [];
    
    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>');
        return;
    }
    
    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const date = new Date(scenario.created).toLocaleString();
        const safeText = escapeHtml(scenario.text);
        html += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <strong>${date}</strong><br>
                    ${safeText}
                </div>
                <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; margin-left: 8px; opacity: 0.7; flex-shrink: 0;"></i>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);
    
    // Привязываем обработчики к кнопкам удаления
    $(".delete-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        deleteScenario(id);
    });
}

async function showScenarioMenu() {
    try {
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const popupHtml = await response.text();
        
        callPopup(popupHtml, "text");
        console.log("Scenario Setup: Окно открыто");

        loadSettings();
        renderScenarioList();
        
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
            renderScenarioList();
            $textarea.val("");
            updateTokenCounter();
            toastr.success("Сценарий добавлен");
        });
        
        $("#new_scenario_text").off("input").on("input", updateTokenCounter);
        updateTokenCounter();
        
    } catch (error) {
        console.error("Scenario Setup: Ошибка загрузки окна:", error);
        toastr.error(`Не удалось загрузить файл окна. Проверьте консоль F12.`);
    }
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
    loadSettings();
});
