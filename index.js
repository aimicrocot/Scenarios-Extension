import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup";
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

// Инициализация настроек
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { characters: {} };
}

// Получаем ID текущего персонажа
function getCharId() {
    return getContext().character_id;
}

// Рендер списка сценариев в окне
function renderScenarios() {
    const charId = getCharId();
    if (!charId) return;

    const scenarios = extension_settings[extensionName].characters[charId] || [];
    const listContainer = $("#scenario-list");
    listContainer.empty();

    if (scenarios.length === 0) {
        listContainer.append('<p style="opacity: 0.5; font-style: italic; text-align: center;">Список сценариев пуст...</p>');
        return;
    }

    scenarios.forEach((s, i) => {
        const item = $(`
            <div class="scenario-item">
                <div class="scenario-item-header">
                    <input type="checkbox" class="scenario-toggle" data-id="${i}" ${s.enabled ? 'checked' : ''}>
                    <span>Сценарий #${i + 1}</span>
                    <i class="fa-solid fa-trash-can delete-scenario" data-id="${i}"></i>
                </div>
                <textarea class="text_pole edit-scenario" data-id="${i}">${s.text}</textarea>
            </div>
        `);
        listContainer.append(item);
    });
}

async function showScenarioMenu() {
    try {
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        const popupHtml = await response.text();
        callPopup(popupHtml, "text");

        renderScenarios();

        // Кнопка Добавить
        $("#add_scenario_btn").off("click").on("click", () => {
            const text = $("#new_scenario_text").val().trim();
            const charId = getCharId();
            if (!text || !charId) return;

            if (!extension_settings[extensionName].characters[charId]) {
                extension_settings[extensionName].characters[charId] = [];
            }

            extension_settings[extensionName].characters[charId].push({
                text: text,
                enabled: true
            });

            saveSettingsDebounced();
            $("#new_scenario_text").val("");
            renderScenarios();
            toastr.success("Сценарий сохранен");
        });

        // Переключатель (чекбокс)
        $(document).off("change", ".scenario-toggle").on("change", ".scenario-toggle", function() {
            const id = $(this).data("id");
            const charId = getCharId();
            extension_settings[extensionName].characters[charId][id].enabled = $(this).is(":checked");
            saveSettingsDebounced();
        });

        // Удаление
        $(document).off("click", ".delete-scenario").on("click", ".delete-scenario", function() {
            const id = $(this).data("id");
            const charId = getCharId();
            extension_settings[extensionName].characters[charId].splice(id, 1);
            saveSettingsDebounced();
            renderScenarios();
        });

        // Редактирование существующего
        $(document).off("input", ".edit-scenario").on("input", ".edit-scenario", function() {
            const id = $(this).data("id");
            const charId = getCharId();
            extension_settings[extensionName].characters[charId][id].text = $(this).val();
            saveSettingsDebounced();
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

function injectPuzzleButton() {
    if ($("#scenario-setup-button").length > 0) return;
    const targetButton = $("#advanced_div");
    if (targetButton.length > 0) {
        const puzzleButton = $(`<div id="scenario-setup-button" class="menu_button fa-solid fa-puzzle-piece interactable" title="Scenario Setup" tabindex="0" role="button"></div>`);
        targetButton.parent().prepend(puzzleButton);
        puzzleButton.on("click", (e) => { e.stopPropagation(); showScenarioMenu(); });
    }
}

jQuery(async () => {
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPuzzleButton();
});
        targetButton.parent().prepend(puzzleButton);
        puzzleButton.on("click", (e) => { e.stopPropagation(); showScenarioMenu(); });
    }
}

jQuery(async () => {
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPuzzleButton();
});
