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
        toastr.warning("Не удалось найти поле сценария SillyTavern");
        return false;
    }

    const currentText = $defaultScenario.val() || "";

    // Проверяем, есть ли уже точно такой же текст в поле
    if (currentText.includes(text)) {
        toastr.warning("Этот сценарий уже добавлен в Scenario");
        return false;
    }

    // Добавляем промпт (если поле не пустое, добавляем через перенос строки)
    const newText = currentText.trim() ? currentText + "

" + text : text;
    $defaultScenario.val(newText);

    $defaultScenario.trigger("input");
    $defaultScenario.trigger("change");

    toastr.success("Промпт добавлен в Scenario");
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
    newText = newText.replace(/
{3,}/g, "

");
    newText = newText.trim();

    $defaultScenario.val(newText);
    $defaultScenario.trigger("input");
    $defaultScenario.trigger("change");

    return true;
}

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    const estimatedTokens = Math.ceil(text.length / 4);
    $(".token-counter").text(estimatedTokens);
}

function toggleScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const scenario = scenarios.find(s => String(s.id) === String(scenarioId));

    if (!scenario) {
        toastr.warning("Сценарий не найден");
        return;
    }

    // Переключаем состояние
    scenario.hidden = !scenario.hidden;

    if (scenario.hidden) {
        // Скрываем - удаляем из дефолтного поля
        removeFromDefaultScenario(scenario.text);
        toastr.info("Сценарий скрыт");
    } else {
        // Показываем - добавляем в дефолтное поле
        insertIntoDefaultScenario(scenario.text);
        toastr.info("Сценарий активирован");
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
        toastr.info("Сценарий удалён");
    } else {
        toastr.warning("Не удалось найти сценарий для удаления");
    }
}

function editScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const scenario = scenarios.find(s => String(s.id) === String(scenarioId));
    if (!scenario) {
        toastr.warning("Сценарий не найден");
        return;
    }

    const editHtml = `
        <div id="edit-scenario-popup" style="max-width: 90vw; width: 300px; margin: 0 auto;">
            <h3>Редактирование сценария</h3>
            <textarea id="edit-scenario-text" rows="6" style="width: 100%; background: rgba(0,0,0,0.3); color: white; margin: 10px 0; box-sizing: border-box;"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="edit-cancel-btn" class="menu_button">Отмена</button>
                <button id="edit-save-btn" class="menu_button">Сохранить</button>
            </div>
        </div>
    `;

    callPopup(editHtml, "text");

    $("#edit-scenario-text").val(scenario.text);

    $("#edit-save-btn").off("click").on("click", () => {
        const newText = $("#edit-scenario-text").val().trim();
        if (!newText) {
            toastr.warning("Текст не может быть пустым");
            return;
        }

        // Если сценарий активен, обновляем текст в дефолтном поле
        if (!scenario.hidden) {
            removeFromDefaultScenario(scenario.text);
            scenario.text = newText;
            insertIntoDefaultScenario(scenario.text);
        } else {
            scenario.text = newText;
        }

        scenario.updated = Date.now();
        saveSettingsDebounced();
        renderScenarioList();
        toastr.success("Сценарий обновлён");
        $(".popup").remove();
    });

    $("#edit-cancel-btn").off("click").on("click", () => {
        $(".popup").remove();
    });
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const scenarios = extension_settings[extensionName].scenarios || [];

    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>');
        return;
    }

    let html = '<ul style="margin: 0; padding-left: 0; list-style: none;">';
    scenarios.forEach(scenario => {
        const date = new Date(scenario.created).toLocaleString();
        const safeText = escapeHtml(scenario.text);
        const isHidden = scenario.hidden || false;
        const eyeIcon = isHidden ? 'fa-eye-slash' : 'fa-eye';
        const opacity = isHidden ? '0.4' : '1';

        html += `
            <li style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; opacity: ${opacity}; gap: 12px;">
                <div style="flex: 1; text-align: left; padding-right: 10px;">
                    <strong>${date}</strong><br>
                    ${safeText}
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <i class="fa-solid ${eyeIcon} toggle-scenario" data-id="${scenario.id}" title="${isHidden ? 'Показать' : 'Скрыть'}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-arrow-right insert-scenario" data-id="${scenario.id}" title="Вставить в Scenario" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-pencil edit-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                    <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; opacity: 0.7;"></i>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);

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
        <span>Управление сценариями</span>
    </h3>

    <div id="scenario-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 20px; border-bottom: 1px solid var(--smart-line-color);">
        <p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>
    </div>

    <div class="scenario-edit-area">
        <textarea
            id="new_scenario_text"
            placeholder="(Обстоятельства и контекст этого диалога)"
            class="text_pole"
            rows="5"
            style="width: 100%; background: rgba(0,0,0,0.3); color: white; box-sizing: border-box;"
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
            hidden: false
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
        console.log("Scenario Setup: Кнопка добавлена");
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
