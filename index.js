import { extension_settings, getContext } from "../../../extensions.js";
import { registerExtension } from "../../extensions.js";

// Функция, которая собирает текст из всех активных сценариев
function getActiveScenariosText() {
    const scenarios = extension_settings.multiScenarios?.list || [];
    return scenarios
        .filter(s => s.enabled)
        .map(s => s.content)
        .join("\n");
}

// Регистрация
$(document).ready(function () {
    registerExtension("multi-scenarios", () => {
        console.log("Scenario Manager loaded!");
        // Здесь код добавления кнопки и отрисовки окна
    });
});
