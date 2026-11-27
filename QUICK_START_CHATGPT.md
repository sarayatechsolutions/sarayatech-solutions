> **Obsolete (Sprint 1, STS-012):** the browser no longer calls OpenAI. Chat goes through the backend `POST /api/chat`; the provider key lives only in the backend environment. The steps below are kept for history.

# Quick Start - ChatGPT Integration

## 🚀 En 3 étapes

### Étape 1: Obtenir une clé API OpenAI

1. Aller sur [OpenAI Platform](https://platform.openai.com/api-keys)
2. Se connecter ou créer un compte
3. Créer une nouvelle clé API (Secret key)
4. Copier la clé (elle commence par `sk-proj-...`)

### Étape 2: Configurer l'environnement

1. Créer un fichier `.env` à la racine du projet :

```bash
OPENAI_API_KEY=<your-key>  # backend .env only
```

2. Redémarrer le serveur de développement :

```bash
npm run dev
```

### Étape 3: Vérifier que ça fonctionne

1. Ouvrir l'application dans le navigateur
2. Ouvrir la console du navigateur (F12)
3. Chercher le message :

```
[OpenAI Service] Initialized. Context size: ~450 tokens (Toon-encoded)
```

4. Cliquer sur le bouton du chatbot Amina
5. Poser une question : "Parle-moi de vos services cloud"
6. Observer une réponse naturelle générée par ChatGPT

## ✅ Vérification

Dans la console, vous devriez voir :

```
[Amina] Detected intents for "votre question": [...]
[Chatbot] ChatGPT response (XXX tokens)
```

## 🔧 Mode Debug (Optionnel)

Importer et utiliser le panneau de debug pour voir les statistiques :

```tsx
import ChatbotDebugPanel from '@/components/chatbot/ChatbotDebugPanel';

// Dans votre composant admin ou page de test
<ChatbotDebugPanel />
```

## 🧪 Tester l'intégration

Dans la console du navigateur :

```javascript
import { testChatbotIntegration } from './utils/test-chatbot'
testChatbotIntegration()
```

## 📊 Économie de tokens

Exemple de comparaison :

**Sans Toon (JSON standard) :**
```
Context: ~1800 tokens
Coût par conversation: ~$0.012
```

**Avec Toon :**
```
Context: ~450 tokens (75% de réduction!)
Coût par conversation: ~$0.003
```

## ⚠️ Notes importantes

### Développement
- Le mode actuel utilise `dangerouslyAllowBrowser: true`
- Parfait pour le développement et les démos

### Production
Pour la production, créez un backend proxy :

```
Frontend → Backend API → OpenAI
           (clé API sécurisée)
```

Exemple Node.js/Express :

```javascript
// backend/routes/chatbot.js
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPromptWithToonContext },
      { role: 'user', content: message }
    ]
  });

  res.json({ message: response.choices[0].message.content });
});
```

## 🎯 Modes disponibles

### Mode ChatGPT (Automatique si clé API présente)
- Réponses naturelles et conversationnelles
- Comprend le contexte
- Gère les questions complexes
- Coût : ~$0.003 par conversation

### Mode Intent-based (Fallback automatique)
- Fonctionne sans API
- Réponses instantanées
- Gratuit
- Idéal pour questions simples

## 🔄 Basculer entre les modes

```javascript
// Désactiver ChatGPT, utiliser intent-based
chatbotService.toggleMode(false);

// Réactiver ChatGPT
chatbotService.toggleMode(true);

// Vérifier le mode actuel
const status = chatbotService.getStatus();
console.log(status.mode); // "ChatGPT" ou "Intent-based"
```

## 💰 Gestion du budget

### Limiter les coûts

1. **Rate limiting** : Limiter le nombre de requêtes par utilisateur
2. **Cache** : Mettre en cache les réponses fréquentes
3. **Fallback intelligent** : Utiliser intent-based pour questions simples
4. **Max tokens** : Limiter la longueur des réponses (déjà à 500)

### Surveiller l'utilisation

```javascript
const stats = openAIService.getStats();
console.log(`Tokens contexte: ${stats.contextTokens}`);
console.log(`Messages conversation: ${stats.conversationLength}`);
```

## 🆘 Dépannage

### "OpenAI service not initialized"

✅ Solution : Vérifier que `OPENAI_API_KEY (backend only)` est défini dans `.env`

### "Invalid API key"

✅ Solution : Vérifier que la clé commence par `sk-proj-` ou `sk-`

### "Rate limit exceeded"

✅ Solution : Attendre quelques secondes, le système bascule automatiquement en mode intent-based

### Le chatbot répond mais pas en ChatGPT

✅ Solution : Vérifier la console pour voir les logs d'erreur

## 📚 Documentation complète

Voir [CHATBOT_INTEGRATION.md](./CHATBOT_INTEGRATION.md) pour la documentation détaillée.

## 🎉 C'est tout!

Votre chatbot Amina utilise maintenant ChatGPT avec encodage Toon pour des réponses naturelles et économiques! 🚀
