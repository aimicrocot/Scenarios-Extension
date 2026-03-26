import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup } from "../../../../script.js";

const extensionName = "scenario-setup";
// Путь к папке расширения относительно корня SillyTavern
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

async function showScenarioMenu() {
    try {
        // Загружаем HTML-шаблон окна
        const popupHtml = await $.get(`${extensionFolderPath}/scenario_window.html`);
        
        // Вызываем модальное окно
        callPopup(popupHtml, "text");
        
        console.log(`[${extensionName}] Окно сценариев открыто`);
        
        // В будущем здесь будет логика загрузки существующих сценариев
        $("#add_scenario_btn").on("click", () => {
            const text = $("#new_scenario_text").val();
            if (text) {
                toastr.success("Сценарий добавлен (пока без сохранения)", "Scenario Setup");
                $("#new_scenario_text").val("");
            }
        });

    } catch (error) {
        console.error(`[${extensionName}] Ошибка загрузки окна:`, error);
        toastr.error("Не удалось загрузить файл scenario_window.html");
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
                 title="Setup scenario" 
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
