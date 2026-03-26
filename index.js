// Импорт базовых функций SillyTavern
import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "scenario-setup"; // Должно совпадать с названием папки
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

jQuery(async () => {
    console.log(`[${extensionName}] Загрузка...`);
   
    try {
        // Загружаем HTML интерфейса для настроек
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
       
        // Добавляем в правую панель расширений
        $("#extensions_settings2").append(settingsHtml);
       
        console.log(`[${extensionName}] ✅ База расширения успешно загружена`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Ошибка при загрузке расширения:`, error);
    }
});
