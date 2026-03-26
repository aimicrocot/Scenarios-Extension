import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js"; // Добавлен импорт сохранения

const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
const extensionName = "scenario-setup";

// 1. Подготавливаем структуру для сохранения настроек
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = { characters: {} };
}

// 2. Функция для отрисовки списка сценариев
function renderScenarios() {
    const charId = getContext().character_id;
    if (!charId) return;

    const scenarios = extension_settings[extensionName].characters[charId] || [];
    const listContainer = $("#scenario-list");
    
    listContainer.empty(); // Очищаем текущий список

    if (scenarios.length === 0) {
        listContainer.append('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>');
        return;
    }

    // Выводим каждый сохраненный сценарий
    scenarios.forEach((text, index) => {
        listContainer.append(`
            <div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--smart-line-color);">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <input type="checkbox" checked>
                    <b>Сценарий ${index + 1}</b>
                </div>
                <div style="font-size: 0.9em; opacity: 0.9;">${text}</div>
            </div>
        `);
    });
}

async function showScenarioMenu() {
    try {
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const popupHtml = await response.text();
        
        callPopup(popupHtml, "text");
        
        // Отрисовываем сценарии при открытии окна
        renderScenarios();

        // 3. Оживляем кнопку "Добавить"
        $("#add_scenario_btn").off("click").on("click", () => {
            const text = $("#new_scenario_text").val().trim();
            const charId = getContext().character_id;
            
            if (!text) {
                toastr.warning("Введите текст сценария!");
                return;
            }

            // Создаем массив для персонажа, если его еще нет
            if (!extension_settings[extensionName].characters[charId]) {
                extension_settings[extensionName].characters[charId] = [];
            }

            // Сохраняем текст
            extension_settings[extensionName].characters[charId].push(text);
            saveSettingsDebounced();
            
            // Очищаем поле и обновляем список
            $("#new_scenario_text").val("");
            renderScenarios();
            
            toastr.success("Сценарий добавлен!");
        });

    } catch (error) {
        console.error("Scenario Setup:", error);
        toastr.error(`Не удалось загрузить файл окна.`);
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
});
