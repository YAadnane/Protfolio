// Remplacez la variable ci-dessous si vous changez de clé
const API_KEY = 'AIzaSyBtwvj4uzpEka1Yue97nsVRH8SsslsnpgM';

async function listGoogleModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        console.log("🔍 Recherche des modèles en cours...");
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data.models) {
            console.log(`✅ Succès ! ${data.models.length} modèles trouvés :\n`);
            
            // Affichage propre des modèles
            console.table(data.models.map(model => ({
                Name: model.name.replace('models/', ''), // Enlève le préfixe pour la lisibilité
                Version: model.version,
                DisplayName: model.displayName,
                InputLimit: model.inputTokenLimit,
                OutputLimit: model.outputTokenLimit
            })));
            
        } else {
            console.log("Aucun modèle trouvé. Vérifiez que l'API 'Generative Language API' est bien activée pour cette clé.");
        }

    } catch (error) {
        console.error("❌ Erreur lors de la récupération des modèles :", error.message);
    }
}

// Exécuter la fonction
listGoogleModels();
