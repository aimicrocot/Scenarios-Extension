import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup";
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

// Инициализация настроек
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { characters: {} };
}

function getCharacterScenarios() {
    const context = getContext();
    const charId = context.character_id;
    if (!charId) return [];
    
    if (!extension_settings[extensionName].characters[charId]) {
        extension_settings[extensionName].characters[charId] = [];
    }
    return extension_settings[extensionName].characters[charId];
}

function renderScenarios() {
    const scenarios = getCharacterScenarios();
    const listContainer = $("#scenario-list");
    listContainer.empty();

    if (scenarios.length === 0) {
        listContainer.append('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em; padding: 10px;">Список сценариев пуст...</p>');
        return;
    }

    scenarios.forEach((scenario, index) => {
        const scenarioHtml = `
            <div class="scenario-item" style="border: 1px solid var(--smart-line-color); margin-bottom: 10px; padding: 10px; border-radius: 5px; background: rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 0.8em; opacity: 0.7;">Сценарий #${index + 1}</span>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="checkbox" class="scenario-toggle" data-index="${index}" ${scenario.enabled ? 'checked' : ''}>
                        <i class="fa-solid fa-trash-can delete-scenario" data-index="${index}" style="cursor: pointer; color: var(--red);"></i>
                    </div>
                </div>
                <textarea class="text_pole edit-scenario-text" data-index="${index}" rows="3" style="width: 100%; font-size: 0.9em; background: rgba(0,0,0,0.3);">${scenario.text}</textarea>
            </div>
        `;
        listContainer.append(scenarioHtml);
    });
}

async function showScenarioMenu() {
    try {
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        const popupHtml = await response.text();
        
        callPopup(popupHtml, "text");
        renderScenarios();

        // Логика кнопки "Добавить"
        $("#add_scenario_btn").off("click").on("click", () => {
            const text = $("#new_scenario_text").val().trim();
            if (!text) return toastr.warning("Введите текст сценария");

            const scenarios = getCharacterScenarios();
            scenarios.push({ text: text, enabled: true });
            
            saveSettingsDebounced();
            renderScenarios();
            $("#new_scenario_text").val("");
            toastr.success("Сценарий добавлен");
        });

        // Логика удаления
        $(document).off("click", ".delete-scenario").on("click", ".delete-scenario", function() {
            const index = $(this).data("index");
            const scenarios = getCharacterScenarios();
            scenarios.splice(index, 1);
            saveSettingsDebounced();
            renderScenarios();
        });

        // Логика включения/выключения
        $(document).off("change", ".scenario-toggle").on("change", ".scenario-toggle", function() {
            const index = $(this).data("index");
            const scenarios = getCharacterScenarios();
            scenarios[index].enabled = $(this).is(":checked");
            saveSettingsDebounced();
        });

        // Логика редактирования существующего текста
        $(document).off("input", ".edit-scenario-text").on("input", ".edit-scenario-text", function() {
            const index = $(this).data("index");
            const scenarios = getCharacterScenarios();
            scenarios[index].text = $(this).val();
            saveSettingsDebounced();
        });

    } catch (error) {
        console.error("Scenario Setup Error:", error);
    }
}

function injectPuzzleButton() {
    if ($("#scenario-setup-button").length > 0) return;
    const targetButton = $("#advanced_div");
    if (targetButton.length > 0) {
        const puzzleButton = $('<div id="scenario-setup-button" class="menu_button fa-solid fa-puzzle-piece interactable" title="Scenario Setup" tabindex="0" role="button" style="display: flex; align-items: center; justify-content: center;"></div>');
        targetButton.parent().prepend(puzzleButton);
        puzzleButton.on("click", (e) => { e.stopPropagation(); showScenarioMenu(); });
    }
}

jQuery(async () => {
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPuzzleButton();
});
