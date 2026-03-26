import { extension_settings, getContext } from "../../../extensions.js";
import { callPopup, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup"; // Убедитесь, что имя совпадает с папкой расширения

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
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateTokenCounter() {
    const text = $("#new_scenario_text").val() || "";
    const estimatedTokens = Math.ceil(text.length / 4);
    $(".token-counter").text(estimatedTokens);
}

function deleteScenario(scenarioId) {
    const scenarios = extension_settings[extensionName].scenarios || [];
    const index = scenarios.findIndex(s => String(s.id) === String(scenarioId));
    if (index !== -1) {
        scenarios.splice(index, 1);
        extension_settings[extensionName].scenarios = scenarios;
        saveSettingsDebounced();
        renderScenarioList();
        toastr.info("Сценарий удалён");
    } else {
        toastr.warning("Не удалось найти сценарий для удаления");
    }
}

function renderScenarioList() {
    const $listContainer = $("#scenario-list");
    const scenarios = extension_settings[extensionName].scenarios || [];
    
    if (scenarios.length === 0) {
        $listContainer.html('<p style="opacity: 0.5; font-style: italic; font-size: 0.9em;">Список сценариев пуст...</p>');
        return;
    }
    
    let html = '<ul style="margin: 0; padding-left: 1.2em;">';
    scenarios.forEach(scenario => {
        const date = new Date(scenario.created).toLocaleString();
        const safeText = escapeHtml(scenario.text);
        html += `
            <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <strong>${date}</strong><br>
                    ${safeText}
                </div>
                <i class="fa-solid fa-trash-can delete-scenario" data-id="${scenario.id}" style="cursor: pointer; margin-left: 8px; opacity: 0.7; flex-shrink: 0;"></i>
            </li>
        `;
    });
    html += '</ul>';
    $listContainer.html(html);
    
    $(".delete-scenario").off("click").on("click", function() {
        const id = $(this).data("id");
        deleteScenario(id);
    });
}

function showScenarioMenu() {
    const popupHtml = `
<div id="scenario-manager-window" style="min-width: 300px;">
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
            style="width: 100%; background: rgba(0,0,0,0.3); color: white;"
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
            created: Date.now()
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
    }
}

jQuery(async () => {
    const observer = new MutationObserver(() => injectPuzzleButton());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPuzzleButton();
    loadSettings();
});
```

А style.css оставьте таким же, как был ранее:

```css
#scenario-setup-button {
    cursor: pointer;
    color: var(--white75);
}
#scenario-setup-button:hover {
    color: var(--white);
    background-color: var(--black75);
}

.delete-scenario {
    color: var(--white75);
    transition: opacity 0.2s, color 0.2s;
}
.delete-scenario:hover {
    color: #ff4444;
    opacity: 1;
}            </li>

        `;

    });

    html += '</ul>';

    $listContainer.html(html);

    

    $(".delete-scenario").off("click").on("click", function() {

        const id = $(this).data("id");

        deleteScenario(id);

    });

}



function showScenarioMenu() {

    const popupHtml = `

<div id="scenario-manager-window" style="min-width: 300px;">

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

            style="width: 100%; background: rgba(0,0,0,0.3); color: white;"

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

            created: Date.now()

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

    }

}



jQuery(async () => {

    const observer = new MutationObserver(() => injectPuzzleButton());

    observer.observe(document.body, { childList: true, subtree: true });

    injectPuzzleButton();

    loadSettings();

});
