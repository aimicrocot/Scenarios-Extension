import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup";

const defaultSettings = {
    scenarios: []
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
    });
}

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    const estimatedTokens = Math.ceil(text.length / 4);
    $(".token-counter").text(estimatedTokens);
}

// Главная функция установки текста Scenario
function setScenarioField(text) {
    // Способ 1: через window.promptManager.setPromptValue
    if (window.promptManager && typeof window.promptManager.setPromptValue === 'function') {
        try {
            window.promptManager.setPromptValue('scenario', text);
            console.log("[Scenario Setup] Установлено через promptManager.setPromptValue");
            return;
        } catch (e) { console.warn(e); }
    }
    
    // Способ 2: через window.promptManager.setPrompt
    if (window.promptManager && typeof window.promptManager.setPrompt === 'function') {
        try {
            window.promptManager.setPrompt('scenario', text);
            console.log("[Scenario Setup] Установлено через promptManager.setPrompt");
            return;
        } catch (e) { console.warn(e); }
    }
    
    // Способ 3: через window.PromptManager.updatePrompt
    if (window.PromptManager && typeof window.PromptManager.updatePrompt === 'function') {
        try {
            window.PromptManager.updatePrompt('scenario', text);
            console.log("[Scenario Setup] Установлено через PromptManager.updatePrompt");
            return;
        } catch (e) { console.warn(e); }
    }
    
    // Способ 4: работа с localStorage и событием
    try {
        const promptsKey = 'prompt_manager_prompts';
        let prompts = JSON.parse(localStorage.getItem(promptsKey) || '{}');
        if (!prompts.scenario) prompts.scenario = { text: '' };
        prompts.scenario.text = text;
        localStorage.setItem(promptsKey, JSON.stringify(prompts));
        
        // Триггерим обновление интерфейса
        if (window.promptManager && typeof window.promptManager.refresh === 'function') {
            window.promptManager.refresh();
        } else if (window.PromptManager && typeof window.PromptManager.refresh === 'function') {
            window.PromptManager.refresh();
        } else {
            // Запасной вариант: отправить кастомное событие
            window.dispatchEvent(new CustomEvent('promptManagerRefresh'));
        }
        console.log("[Scenario Setup] Установлено через localStorage + событие");
    } catch (e) {
        console.error("[Scenario Setup] Не удалось установить Scenario:", e);
        toastr.warning("Не удалось автоматически установить сценарий. Попробуйте открыть Prompt Manager и нажать карандаш рядом с Scenario.");
    }
}

function getCombinedScenarioText() {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const activeScenarios = scenarios.filter(s => s.enabled);
    if (activeScenarios.length === 0) return "";
    return activeScenarios.map(s => s.text).join("\n\n");
}

function updateScenarioFromActive() {
    const combined = getCombinedScenarioText();
    setScenarioField(combined);
}

function deleteScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const index = scenarios.findIndex(s => String(s.id) === String(scenarioId));
    if (index !== -1) {
        scenarios.splice(index, 1);
        extension_settings[extensionName].scenarios = scenarios;
        saveSettingsDebounced();
        renderScenarioList();
        updateScenarioFromActive();
        toastr.info("Сценарий удалён");
    } else {
        toastr.warning("Не удалось найти сценарий для удаления");
    }
}

function toggleScenario(scenarioId, enabled) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const targetIndex = scenarios.findIndex(s => String(s.id) === String(scenarioId));
    if (targetIndex === -1) return;
    
    scenarios[targetIndex].enabled = enabled;
    extension_settings[extensionName].scenarios = scenarios;
    saveSettingsDebounced();
    renderScenarioList();
    updateScenarioFromActive();
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
        const checked = scenario.enabled ? "checked" : "";
        html += `
            <li style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <strong>${date}</strong><br>
                    ${safeText}
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <input type="checkbox" class="scenario-toggle" data-id="${scenario.id}" ${checked} style="transform: scale(1.2); cursor: pointer;">
                    <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);
    
    $(".scenario-toggle").off("change").on("change", function() {
        const id = $(this).data("id");
        const enabled = $(this).prop("checked");
        toggleScenario(id, enabled);
    });
    
    $(".delete-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        deleteScenario(id);
    });
}

function showScenarioMenu() {
    const popupHtml = `
<div id="scenario-manager-window" style="min-width: 350px;">
    <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <i class="fa-solid fa-puzzle-piece"></i> 
        <span>Управление сценариями</span>
    </h3>
    
    <div id="scenario-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; border-bottom: 1px solid var(--smart-line-color);">
        <p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>
    </div>

    <div class="scenario-edit-area">
        <textarea 
            id="new_scenario_text" 
            placeholder="(Обстоятельства и контекст этого диалога)" 
            class="text_pole" 
            rows="5" 
            style="width: 100%; background: rgba(0,0,0,0.3); color: white;"
        ></textarea>
    </div>

    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
        <span class="token-counter" style="font-size: 0.8em; opacity: 0.6;">0</span>
        <button id="add_scenario_btn" class="menu_button" style="display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-plus"></i>
            <span>Добавить сценарий</span>
        </button>
    </div>
</div>
    `;
    
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
            id: String(Date.now()),
            text: text,
            created: Date.now(),
            enabled: false
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
