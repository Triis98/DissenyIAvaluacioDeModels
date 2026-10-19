const fs = require('fs');

const API_URL = "http://10.100.22.105:8008/translate";
const translationCache = new Map(); // Caché para evitar traducciones repetidas

async function translateText(text) {
    // Si el texto está vacío, lo devolvemos tal cual
    if (!text || text.trim() === "") return text;

    // Comprobar si ya está en la caché
    if (translationCache.has(text)) {
        //console.log(`[Caché] Reutilizando traducción para: "${text}"`);
        return translationCache.get(text);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: text,
                src_lang: "swe_Latn",
                tgt_lang: "spa_Latn"
            })
        });

        const data = await response.json();
        const translatedText = data.translated_text || text;

        // Guardar en la caché
        translationCache.set(text, translatedText);
        return translatedText;
    } catch (error) {
        console.error(`Error traduciendo "${text}":`, error.message);
        return text; // En caso de error, devuelve el texto original
    }
}

async function processCSV(inputFilePath, outputFilePath) {
    try {
        console.log(`Leyendo archivo: ${inputFilePath}...`);
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        const translatedLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Si la línea está vacía, la dejamos igual
            if (!line.trim()) {
                translatedLines.push('');
                continue;
            }

            const fields = line.split(';');
            if(fields.length != 156){
                console.warn(`Advertencia: La línea ${i + 1} tiene ${fields.length} campos, se esperaban 156. Se procesará de todos modos.`);
            }
            const translatedFields = [];

            console.log(`\n--- Procesando línea ${i + 1} de ${lines.length} ---`);

            for (const field of fields) {
                // Limpiamos espacios alrededor del campo si es necesario
                const trimmedField = field.trim();
                

                if (isNaN(parseFloat(trimmedField))) {
                    let translated = await translateText(trimmedField);
                    translated =translated.replace(/;/g, ',');
                    //console.log(`  Original: "${trimmedField}" -> Traducido: "${translated}"`);

                    translatedFields.push(translated);
                }
                else {
                    // Si es un número, lo dejamos igual
                    translatedFields.push(trimmedField);
                }

            }

            // Reconstruimos la línea con los campos traducidos separados por ';'
            translatedLines.push(translatedFields.join(';'));
        }

        // Guardamos el resultado en un nuevo archivo CSV
        fs.writeFileSync(outputFilePath, translatedLines.join('\n'), 'utf8');
        console.log(`\n¡Traducción finalizada con éxito! Archivo guardado en: ${outputFilePath}`);

    } catch (err) {
        console.error("Error al procesar el archivo CSV:", err);
    }
}

// Ejecución del script (cambia 'entrada.csv' y 'salida_traducida.csv' por tus rutas)
processCSV('konsumtionsvaneundersokningen-2018.csv', 'salida_traducida.csv');


