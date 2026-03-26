import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup } from "../../../../script.js";

// Умное определение пути к папке расширения
const scriptPath = import.meta.url;
const extensionFolderPath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));

async function showScenarioMenu() {
    try {
        // Загружаем HTML, используя динамический путь
        const response = await fetch(`${extensionFolderPath}/scenario_window.html`);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const popupHtml = await response.text();
        
        callPopup(popupHtml, "text");
        console.log("Scenario Setup: Окно открыто");

        // Тестовая кнопка
        $("#add_scenario_btn").on("click", () => {
            toastr.info("Кнопка нажата! Скоро добавим сохранение.");
        });

    } catch (error) {
        console.error("Scenario Setup: Ошибка загрузки окна:", error);
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
