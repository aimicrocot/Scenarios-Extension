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

// Исправлено экранирование спецсимволов
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

function insertIntoDefaultScenario(text) {
    // Используем оба возможных ID для надежности
    const $defaultScenario = $("#scenario_pole, #scenario_field");

    if ($defaultScenario.length === 0) {
        toastr.warning("Could not find the Scenario field SillyTavern");
        return false;
    }

    const currentText = $defaultScenario.val() || "";
    const trimmedNewText = text.trim();

    // Раньше было currentText.includes(text) - это была ошибка.
    // Теперь мы разбиваем текст на блоки по переносу строки и проверяем точное совпадение.
    const existingBlocks = currentText.split(/\n/).map(block => block.trim());

    if (existingBlocks.includes(trimmedNewText)) {
        toastr.warning("This text has already been added to Scenario");
        return false;
    }

    // Формируем новый текст: если поле не пустое, добавляем 2 переноса строки для красоты
    const newText = currentText.trim() ? currentText.trim() + "\n\n" + trimmedNewText : trimmedNewText;
    
    $defaultScenario.val(newText);

    // Уведомляем систему об изменениях
    $defaultScenario.trigger("input");
    $defaultScenario.trigger("change");

    toastr.success("Prompt added to Scenario");
    return true;
}

// Добавлена недостающая функция удаления текста из основного поля
function removeFromDefaultScenario(text) {
    const $scenarioField = $("#scenario_field, [name='scenario_field']");
    if ($scenarioField.length === 0) return;

    let currentText = $scenarioField.val();
    const targetText = text.trim();

    // Удаляем конкретный кусок текста и лишние переносы строк
    const escapedText = targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(\\n|^)' + escapedText + '(\\n|$)', 'g');
    
    currentText = currentText.replace(regex, '$1').trim();
    
    $scenarioField.val(currentText).trigger("input").trigger("change");
}

function deleteScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const index = scenarios.findIndex(s => String(s.id) === String(scenarioId));
    
    if (index !== -1) {
        const scenario = scenarios[index];

        if (!scenario.hidden) {
            removeFromDefaultScenario(scenario.text);
        }

        scenarios.splice(index, 1);
        saveSettingsDebounced();
        renderScenarioList();
        toastr.info("The Scenario has been removed");
    } else {
        toastr.warning("Unable to find Scenario");
    }
}

function editScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const scenario = scenarios.find(s => String(s.id) === String(scenarioId));
    
    if (!scenario) {
        toastr.warning("Scenario not found");
        return;
    }

    const editHtml = `
    <div id="edit-scenario-popup" style="width: 100%; max-width: 500px; margin: 0 auto; box-sizing: border-box; padding: 10px;">
        <h3 style="margin-top: 0; padding-top: 5px; text-align: center;">Editing a Scenario</h3>
        
        <label for="edit-scenario-title" style="font-size: 0.85em; opacity: 0.7; margin-bottom: 5px; display: block;">Scenario Name:</label>
        <input id="edit-scenario-title" type="text" class="text_pole" placeholder="Scenario name" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 15px; box-sizing: border-box; height: 35px;" />

        <label for="edit-scenario-text" style="font-size: 0.85em; opacity: 0.7; margin-bottom: 5px; display: block;">Scenario Context:</label>
        <textarea id="edit-scenario-text" class="text_pole" rows="6" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 10px; box-sizing: border-box; resize: vertical;"></textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <button id="edit-back-btn" class="menu_button">Back</button>
            <button id="edit-save-btn" class="menu_button">Save</button>
        </div>
    </div>
    `;

    callPopup(editHtml, "text", undefined, { okButton: "Close" });

    $("#edit-scenario-title").val(scenario.title || "");
    $("#edit-scenario-text").val(scenario.text || "");

    $("#edit-back-btn").off("click").on("click", () => { showScenarioMenu(); });
    $("#edit-save-btn").off("click").on("click", () => {
        const newTitle = $("#edit-scenario-title").val().trim();
        const newText = $("#edit-scenario-text").val().trim();
        
        if (!newTitle) { toastr.warning("Name cannot be empty"); return; }
        if (!newText) { toastr.warning("Text cannot be empty"); return; }

        scenario.title = newTitle;
        scenario.text = newText;
        scenario.updated = Date.now();

        saveSettingsDebounced();
        toastr.success("Updated");
        showScenarioMenu(); 
    });
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const context = getContext();
    const currentCharacter = context.characters[context.characterId]?.name;

    if (!currentCharacter) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Select a character...</p>');
        return;
    }

    const allScenarios = extension_settings[extensionName].scenarios || [];
    const scenarios = allScenarios.filter(s => s.character === currentCharacter);

    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">No scenarios...</p>');
        return;
    }

    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const isHidden = scenario.hidden || false;
        const eyeIcon = isHidden ? 'fa-eye-slash' : 'fa-eye';
        const opacity = isHidden ? '0.4' : '1';

        let displayTitle = scenario.title || (scenario.text.substring(0, 20) + "...");
        const safeTitle = escapeHtml(displayTitle);

        html += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; opacity: ${opacity}; gap: 8px;">
                <div style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong title="${escapeHtml(scenario.text)}">${safeTitle}</strong>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <i class="fa-solid ${eyeIcon} toggle-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-arrow-right insert-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-pencil edit-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);

    // Привязываем события через .attr для надежности
    $(".insert-scenario").off("click").on("click", function() {
        const id = $(this).attr("data-id");
        const scenario = allScenarios.find(s => String(s.id) === String(id));
        if (scenario) insertIntoDefaultScenario(scenario.text);
    });

    $(".delete-scenario").off("click").on("click", function() {
        deleteScenario($(this).attr("data-id"));
    });

    $(".edit-scenario").off("click").on("click", function() {
        editScenario($(this).attr("data-id"));
    });
    
    // Toggle (скрытие/показ) - добавьте функцию если её нет, или я могу написать
    $(".toggle-scenario").off("click").on("click", function() {
        const id = $(this).attr("data-id");
        const scenario = allScenarios.find(s => String(s.id) === String(id));
        if (scenario) {
            scenario.hidden = !scenario.hidden;
            saveSettingsDebounced();
            renderScenarioList();
        }
    });
}

function openAddTitlePopup(scenarioText) {
    const titleHtml = `
    <div id="add-title-popup" style="width: 100%; max-width: 400px; margin: 0 auto; box-sizing: border-box; padding: 10px;">
        <h3 style="margin-top: 0; padding-top: 5px; text-align: center;">Scenario Name</h3>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 10px; text-align: center;">Give a name to your scenario:</p>
        <input id="new-scenario-title" type="text" class="text_pole" placeholder="e.g., Adventure Start" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 20px; box-sizing: border-box; height: 35px;" />
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <button id="title-back-btn" class="menu_button">Back</button>
            <button id="title-save-btn" class="menu_button">Save</button>
        </div>
    </div>
    `;

    callPopup(titleHtml, "text", undefined, { okButton: "Close" });

    $("#title-back-btn").off("click").on("click", () => {
        showScenarioMenu(); 
        setTimeout(() => $("#new_scenario_text").val(scenarioText), 50);
    });

    $("#title-save-btn").off("click").on("click", () => {
        const title = $("#new-scenario-title").val().trim();
        if (!title) { toastr.warning("Please enter a name"); return; }

        const context = getContext();
        const currentCharacter = context.characters[context.characterId]?.name;

        const newScenario = {
            id: String(Date.now()),
            text: scenarioText,
            title: title, 
            created: Date.now(),
            hidden: false,
            character: currentCharacter
        };

        extension_settings[extensionName].scenarios.push(newScenario);
        saveSettingsDebounced();
        toastr.success("Saved");
        showScenarioMenu(); 
    });
}

// Счетчик символов
function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    $(".token-counter").text(`${text.length} symb.`);
}

function showScenarioMenu() {
    const popupHtml = `
<div id="scenario-manager-window" style="min-width: 300px; max-width: 90vw;">
    <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <i class="fa-solid fa-puzzle-piece"></i>
        <span>Scenario Management</span>
    </h3>

    <div id="scenario-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 20px; border-bottom: 1px solid var(--smart-line-color);">
        <p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Scenario list is empty...</p>
    </div>

    <div class="scenario-edit-area">
        <textarea
            id="new_scenario_text"
            placeholder="(The context of this dialogue)"
            class="text_pole"
            rows="5"
            style="width: 100%; background: rgba(0,0,0,0.3); color: white; box-sizing: border-box;"
        ></textarea>
    </div>

    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
        <span class="token-counter" style="font-size: 0.8em; opacity: 0.6;">0 symb.</span>
        <button id="add_scenario_btn" class="menu_button" style="display: flex; align-items: center; gap: 5px;">
            <i class="fa-solid fa-plus"></i>
            <span>Add</span>
        </button>
    </div>
</div>
    `;

    callPopup(popupHtml, "text", undefined, { okButton: "Close" });
    
    loadSettings();
    renderScenarioList();

    $("#add_scenario_btn").off("click").on("click", () => {
        const context = getContext();
        const currentCharacter = context.characters[context.characterId]?.name;

        if (!currentCharacter) {
            toastr.warning("Please select a character first");
            return;
        }

        const text = $("#new_scenario_text").val().trim();
        if (!text) {
            toastr.warning("Enter script text");
            return;
        }

        openAddTitlePopup(text);
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
    const checkInterval = setInterval(() => {
        if ($("#advanced_div").length > 0) {
            injectPuzzleButton();
            if ($("#scenario-setup-button").length > 0) {
                clearInterval(checkInterval);
            }
        }
    }, 500);

    const observer = new MutationObserver(() => {
        if ($("#advanced_div").length > 0 && $("#scenario-setup-button").length === 0) {
            injectPuzzleButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    injectPuzzleButton();
    loadSettings();
});
