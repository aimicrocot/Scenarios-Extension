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
    <div id="edit-scenario-popup" style="max-width: 90vw; width: 300px; margin: 0 auto;">
        <h3>Editing a Scenario</h3>
        <textarea id="edit-scenario-text" rows="6" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin: 10px 0; box-sizing: border-box;"></textarea>
        <div style="display: flex; justify-content: space-between;">
            <button id="edit-back-btn" class="menu_button">Back</button>
            <button id="edit-save-btn" class="menu_button">Save</button>
        </div>
    </div>
`;

    callPopup(editHtml, "text");

    $("#edit-scenario-text").val(scenario.text);

    // Кнопка назад — закрываем текущее окно и заново открываем главное меню
    $("#edit-back-btn").off("click").on("click", () => {
        $(".popup").remove();
        showScenarioMenu();
    });

    $("#edit-save-btn").off("click").on("click", () => {
        const newText = $("#edit-scenario-text").val().trim();
        if (!newText) {
            toastr.warning("Text cannot be empty");
            return;
        }

        scenario.text = newText;
        scenario.updated = Date.now();

        saveSettingsDebounced();
        renderScenarioList();
        toastr.success("The Scenario has been updated");
        
        // После сохранения тоже возвращаемся в главное меню, чтобы увидеть результат
        $(".popup").remove();
        showScenarioMenu();
    });
}


        // ИСПРАВЛЕНИЕ: Теперь мы просто обновляем текст в настройках расширения.
        // Функции removeFromDefaultScenario и insertIntoDefaultScenario здесь больше не вызываются.
        scenario.text = newText;
        scenario.updated = Date.now();

        saveSettingsDebounced();
        renderScenarioList();
        toastr.success("The Scenario has been updated");
        $(".popup").remove();
    });
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const scenarios = extension_settings[extensionName].scenarios || [];

    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Scenario list is empty...</p>');
        return;
    }

    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const isHidden = scenario.hidden || false;
        const eyeIcon = isHidden ? 'fa-eye-slash' : 'fa-eye';
        const opacity = isHidden ? '0.4' : '1';

        // Формируем превью
        const words = scenario.text.split(/\s+/).filter(w => w.length > 0);
        let slice = words.slice(0, 5);
        
        if (slice.length > 0) {
            // Удаляем знаки препинания в конце последнего слова
            slice[slice.length - 1] = slice[slice.length - 1].replace(/[.,!?;:…\-]+$/, "");
        }
        
        const previewText = slice.join(' ') + '...';
        const safePreview = escapeHtml(previewText);

        html += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; opacity: ${opacity}; gap: 8px;">
                <div style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <strong>${safePreview}</strong>
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

    // Привязка событий (без изменений)
    $(".toggle-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        toggleScenario(id);
    });

    $(".insert-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        const scenario = scenarios.find(s => String(s.id) === String(id));
        if (scenario) {
            insertIntoDefaultScenario(scenario.text);
        }
    });

    $(".delete-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        deleteScenario(id);
    });

    $(".edit-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        editScenario(id);
    });
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

    callPopup(popupHtml, "text");
    console.log("Scenario Setup: The window is open");

    loadSettings();
    renderScenarioList();

    $("#add_scenario_btn").off("click").on("click", () => {
        const $textarea = $("#new_scenario_text");
        const text = $textarea.val().trim();
        if (!text) {
            toastr.warning("Enter script text");
            return;
        }

        const newScenario = {
            id: String(Date.now()),
            text: text,
            created: Date.now(),
            hidden: false
        };

        extension_settings[extensionName].scenarios.push(newScenario);
        saveSettingsDebounced();
        renderScenarioList();
        $textarea.val("");
        updateTokenCounter();
        toastr.success("Scenario added");
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
