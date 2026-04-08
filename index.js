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
        if (m === '&') return '&';
        if (m === '<') return '<';
        if (m === '>') return '>';
        return m;
    });
}

function insertIntoDefaultScenario(text) {
    const $defaultScenario = $("#scenario_pole");

    if ($defaultScenario.length === 0) {
        toastr.warning("Could not find the Scenario field SillyTavern");
        return false;
    }

    const currentText = $defaultScenario.val() || "";

    // Проверяем, есть ли уже точно такой же текст в поле
    if (currentText.includes(text)) {
        toastr.warning("This text has already been added to Scenario");
        return false;
    }

    // Добавляем промпт (если поле не пустое, добавляем через перенос строки)
    const newText = currentText.trim() ? currentText + "\n\n" + text : text;
    $defaultScenario.val(newText);

    $defaultScenario.trigger("input");
    $defaultScenario.trigger("change");

    toastr.success("Prompt added to Scenario");
    return true;
}

function removeFromDefaultScenario(text) {
    const $defaultScenario = $("#scenario_pole");

    if ($defaultScenario.length === 0) {
        return false;
    }

    const currentText = $defaultScenario.val() || "";

    if (!currentText.includes(text)) {
        return false;
    }

    let newText = currentText.replace(text, "");
    newText = newText.replace(/\n{3,}/g, "\n\n");
    newText = newText.trim();

    $defaultScenario.val(newText);
    $defaultScenario.trigger("input");
    $defaultScenario.trigger("change");

    return true;
}

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    const charCount = text.length;
    $(".token-counter").text(`${charCount} symb.`);
}

function toggleScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const scenario = scenarios.find(s => String(s.id) === String(scenarioId));

    if (!scenario) {
        toastr.warning("Scenario not found");
        return;
    }

    // Переключаем состояние
    scenario.hidden = !scenario.hidden;

    if (scenario.hidden) {
        // Скрываем - удаляем из дефолтного поля
        removeFromDefaultScenario(scenario.text);
        toastr.info("Scenario hidden");
    } else {
        // Показываем - добавляем в дефолтное поле
        insertIntoDefaultScenario(scenario.text);
        toastr.info("Scenario activated");
    }

    saveSettingsDebounced();
    renderScenarioList();
}

function deleteScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const index = scenarios.findIndex(s => String(s.id) === String(scenarioId));
    if (index !== -1) {
        const scenario = scenarios[index];

        // Удаляем из дефолтного поля Scenario только если сценарий был активен
        if (!scenario.hidden) {
            removeFromDefaultScenario(scenario.text);
        }

        scenarios.splice(index, 1);
        extension_settings[extensionName].scenarios = scenarios;
        saveSettingsDebounced();
        renderScenarioList();
        toastr.info("The Scenario has been removed");
    } else {
        toastr.warning("Unable to find uninstall Scenario");
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
    <div id="edit-scenario-popup" style="width: 100%; min-width: 400px; max-width: 90vw; margin: 0 auto; box-sizing: border-box;">
        <h3 style="margin-top: 0; padding-top: 15px; text-align: center;">Editing a Scenario</h3>
        
        <label for="edit-scenario-title" style="font-size: 0.85em; opacity: 0.7; margin-bottom: 5px; display: block; text-align: center;">Scenario Name:</label>
        <input id="edit-scenario-title" type="text" class="text_pole" placeholder="Scenario name" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 15px; box-sizing: border-box;" />

        <label for="edit-scenario-text" style="font-size: 0.85em; opacity: 0.7; margin-bottom: 5px; display: block; text-align: center;">Scenario Context:</label>
        <textarea id="edit-scenario-text" class="text_pole" rows="6" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 10px; box-sizing: border-box;"></textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <button id="edit-back-btn" class="menu_button">Back</button>
            <button id="edit-save-btn" class="menu_button">Save</button>
        </div>
    </div>
    `;

    callPopup(editHtml, "text", undefined, { okButton: "Close" });

    $("#edit-scenario-title").val(scenario.title || "");
    $("#edit-scenario-text").val(scenario.text || "");

    $("#edit-back-btn").off("click").on("click", () => {
        showScenarioMenu(); 
    });

    $("#edit-save-btn").off("click").on("click", () => {
        const newTitle = $("#edit-scenario-title").val().trim();
        const newText = $("#edit-scenario-text").val().trim();
        
        if (!newTitle) {
            toastr.warning("Name cannot be empty");
            return;
        }
        if (!newText) {
            toastr.warning("Text cannot be empty");
            return;
        }

        scenario.title = newTitle;
        scenario.text = newText;
        scenario.updated = Date.now();

        saveSettingsDebounced();
        toastr.success("The Scenario has been updated");
        
        showScenarioMenu(); 
    });
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const context = getContext();
    const currentCharacter = context.characters[context.characterId]?.name;

    // Если персонаж не выбран
    if (!currentCharacter) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Select a character to manage scenarios...</p>');
        return;
    }

    const allScenarios = extension_settings[extensionName].scenarios || [];
    
    // Фильтруем список по текущему персонажу
    const scenarios = allScenarios.filter(s => s.character === currentCharacter);

    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">No scenarios for this character...</p>');
        return;
    }

    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const isHidden = scenario.hidden || false;
        const eyeIcon = isHidden ? 'fa-eye-slash' : 'fa-eye';
        const opacity = isHidden ? '0.4' : '1';

        // --- ЛОГИКА ОТОБРАЖЕНИЯ НАЗВАНИЯ ---
        let displayTitle = "";
        
        if (scenario.title && scenario.title.trim() !== "") {
            // Если есть сохраненное название, используем его
            displayTitle = scenario.title;
        } else {
            // Если названия нет (старый сценарий), делаем превью из текста
            const words = scenario.text.split(/\s+/).filter(w => w.length > 0);
            let slice = words.slice(0, 5);
            if (slice.length > 0) {
                slice[slice.length - 1] = slice[slice.length - 1].replace(/[.,!?;:…\-]+$/, "");
            }
            displayTitle = slice.join(' ') + '...';
        }

        const safeTitle = escapeHtml(displayTitle);

        html += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; opacity: ${opacity}; gap: 8px;">
                <div style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong title="${escapeHtml(scenario.text)}">${safeTitle}</strong>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <i class="fa-solid ${eyeIcon} toggle-scenario" data-id="${scenario.id}" title="${isHidden ? 'Show' : 'Hide'}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-arrow-right insert-scenario" data-id="${scenario.id}" title="Add to Scenario" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-pencil edit-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);

    // Слушатели событий
    $(".toggle-scenario").off("click").on("click", function() {
        toggleScenario($(this).data("id"));
    });

    $(".insert-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        const scenario = allScenarios.find(s => String(s.id) === String(id));
        if (scenario) insertIntoDefaultScenario(scenario.text);
    });

    $(".delete-scenario").off("click").on("click", function() {
        deleteScenario($(this).data("id"));
    });

    $(".edit-scenario").off("click").on("click", function() {
        editScenario($(this).data("id"));
    });
}

function openAddTitlePopup(scenarioText) {
    const titleHtml = `
    <div id="add-title-popup" style="width: 100%; min-width: 400px; max-width: 90vw; margin: 0 auto; box-sizing: border-box;">
        <h3 style="margin-top: 0; padding-top: 15px; text-align: center;">Scenario Name</h3>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 10px; text-align: center;">Give a name to your scenario:</p>
        <input id="new-scenario-title" type="text" class="text_pole" placeholder="e.g., Adventure Start" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin-bottom: 20px; box-sizing: border-box;" />
        
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
        if (!title) {
            toastr.warning("Please enter a name");
            return;
        }

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
        toastr.success("Scenario saved");
        showScenarioMenu(); 
    });
}

function showScenarioMenu() {
    // ... (весь HTML код popupHtml остается без изменений) ...
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

        // ВМЕСТО сохранения вызываем окно ввода названия
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
        console.log("Scenario Setup: Button added");
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
