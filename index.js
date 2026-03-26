import { extension_settings, saveSettingsDebounced } from "../../../extensions.js";
import { callPopup } from "../../../../script.js";

const extensionName = "scenario-setup";
// Умное определение пути к папке расширения
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

// Инициализация настроек по умолчанию, если их еще нет
if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = {
        scenarios: [] // Список наших сценариев {text: string, enabled: bool}
    };
}

// Функция для рендеринга (отрисовки) списка сценариев в окне
function renderScenarioList() {
    const listContainer = $("#scenario-list");
    listContainer.empty(); // Очищаем список перед перерисовкой

    const scenarios = extension_settings[extensionName].scenarios;

    if (scenarios.length === 0) {
        listContainer.append('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em; text-align: center; padding: 20px;">Список сценариев пуст...</p>');
        return;
    }

    // Создаем элемент для каждого сценария
    scenarios.forEach((scenario, index) => {
        const scenarioItem = $(`
            <div class="scenario-item interactable" 
                 style="display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-bottom: 1px solid var(--smart-line-color); background: rgba(0,0,0,0.2); margin-bottom: 5px; border-radius: 4px;">
                
                <div class="scenario-toggle" style="margin-top: 5px;">
                    <input type="checkbox" id="scenario_check_${index}" class="scenario_toggle_input" ${scenario.enabled ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;"/>
                </div>

                <div class="scenario-text-preview" style="flex: 1; font-size: 0.9em; opacity: ${scenario.enabled ? '1' : '0.5'}; max-height: 60px; overflow: hidden; cursor: pointer;">
                    ${scenario.text}
                </div>
            </div>
        `);

        // Обработчик переключения тумблера
        scenarioItem.find(`#scenario_check_${index}`).on("change", function() {
            extension_settings[extensionName].scenarios[index].enabled = this.checked;
            saveSettingsDebounced();
            console.log(`[${extensionName}] Сценарий ${index} переключен:`, this.checked);
            
            // Немного приглушаем текст, если выключено
            scenarioItem.find(".scenario-text-preview").css("opacity", this.checked ? "1" : "0.5");
        });

        listContainer.append(scenarioItem);
    });
}

async function showScenarioMenu() {
    try {
        // Загружаем HTML-шаблон окна
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const popupHtml = await response.text();
        
        // Вызываем окно в режиме 'text', но мы добавили класс для дизайна в HTML
        callPopup(popupHtml, "text");
        
        console.log(`[${extensionName}] Окно сценариев открыто`);

        // Отрисовываем текущий список сценариев
        renderScenarioList();

        // Кнопка "Добавить сценарий"
        $("#add_scenario_btn").on("click", () => {
            const text = $("#new_scenario_text").val();
            if (text && text.trim().length > 0) {
                // Добавляем в массив настроек (по умолчанию выключен)
                extension_settings[extensionName].scenarios.push({
                    text: text.trim(),
                    enabled: false 
                });
                
                // Сохраняем в SillyTavern
                saveSettingsDebounced();
                toastr.success("Сценарий добавлен!", "Scenario Setup");
                
                // Очищаем поле ввода и перерисовываем список
                $("#new_scenario_text").val("");
                renderScenarioList();
            } else {
                toastr.warning("Введите текст сценария.");
            }
        });

    } catch (error) {
        console.error(`[${extensionName}] Ошибка загрузки окна:`, error);
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
});
