import { extension_settings } from "../../../extensions.js";

const extensionName = "scenario-setup";

function injectPuzzleButton() {
    // Если Пазл уже на месте — ничего не делаем
    if ($("#scenario-setup-button").length > 0) return;

    // Ищем ту самую кнопку Книги по её уникальному ID, который ты скинул
    const targetButton = $("#advanced_div");
    
    // Если кнопка Книги есть на экране
    if (targetButton.length > 0) {
        const buttonContainer = targetButton.parent(); // Берем контейнер, где лежат все эти кнопки
        
        console.log(`[${extensionName}] Нашел контейнер через #advanced_div! Вставляю Пазл.`);
        
        // Создаем Пазл, копируя родные классы (interactable) и атрибуты (role="button", tabindex="0")
        const puzzleButton = $(`
            <div id="scenario-setup-button" 
                 class="menu_button fa-solid fa-puzzle-piece interactable" 
                 title="Setup scenario" 
                 tabindex="0" 
                 role="button"
                 style="display: flex; align-items: center; justify-content: center;">
            </div>
        `);

        // Вставляем Пазл в самое начало контейнера (перед Звездочкой)
        buttonContainer.prepend(puzzleButton);
        
        // Вешаем тестовый клик
        puzzleButton.on("click", (e) => {
            e.stopPropagation(); // Запрещаем клику "проваливаться" дальше
            toastr.success("Ура! Кнопка работает.", "Scenario Setup");
        });
    }
}

jQuery(async () => {
    // Обсервер следит за появлением #advanced_div при клике на персонажа
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Пробуем запустить сразу
    injectPuzzleButton();
});
