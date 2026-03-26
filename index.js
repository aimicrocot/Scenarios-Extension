import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "scenario-setup";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

function injectPuzzleButton() {
    // 1. Ищем панель кнопок в редакторе персонажа
    const buttonBar = $("#character_details_buttons");
    
    // Если панель нашли и кнопки еще нет — добавляем
    if (buttonBar.length > 0 && $("#scenario-setup-button").length === 0) {
        console.log(`[${extensionName}] Нашел панель, вставляю Пазл...`);
        
        const puzzleButton = $(`
            <div id="scenario-setup-button" class="menu_button fa-solid fa-puzzle-piece" 
                 title="Scenario Setup" 
                 style="display: flex; align-items: center; justify-content: center;">
            </div>
        `);

        // Вставляем перед кнопкой чата
        buttonBar.prepend(puzzleButton);
        
        puzzleButton.on("click", () => {
            toastr.info("Окно сценариев скоро будет здесь!", "Scenario Setup");
        });
    }
}

// Запуск при загрузке
jQuery(async () => {
    console.log(`[${extensionName}] Расширение проснулось...`);
    
    // Следим за изменениями DOM, так как SillyTavern постоянно перерисовывает окна
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Пробуем вставить сразу на всякий случай
    injectPuzzleButton();
});
