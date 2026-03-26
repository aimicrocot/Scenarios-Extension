import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "scenario-setup";

function injectPuzzleButton() {
    // 1. Проверяем, нет ли уже кнопки
    if ($("#scenario-setup-button").length > 0) return;

    // 2. Ищем контейнер. В мобильной версии и новом UI это часто .character_details_controls 
    // или прямые дочерние элементы #character_details_buttons
    const buttonBar = $(".character_details_controls, #character_details_buttons").first();
    
    if (buttonBar.length > 0) {
        console.log(`[${extensionName}] Контейнер найден! Добавляю Пазл...`);
        
        // Создаем кнопку в стиле SillyTavern
        const puzzleButton = $(`
            <div id="scenario-setup-button" 
                 class="menu_button fa-solid fa-puzzle-piece" 
                 title="Scenario Setup" 
                 style="cursor: pointer; margin: 0 2px;">
            </div>
        `);

        // Вставляем в начало списка кнопок (перед звездочкой)
        buttonBar.prepend(puzzleButton);
        
        // Клик для теста
        puzzleButton.on("click", (e) => {
            e.stopPropagation(); // Чтобы не закрылось окно персонажа
            toastr.info("Сработало! Теперь я вижу кнопку.", "Scenario Setup");
        });
    }
}

jQuery(async () => {
    console.log(`[${extensionName}] Запуск поиска кнопок...`);
    
    // Следим за DOM, так как SillyTavern рисует это окно при нажатии на аватар
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    
    injectPuzzleButton();
});
