# Sainte-Foy Tombola

Base React + Vite + Firebase pour creer des tickets de tombola avec connexion Google.

## Commandes

```bash
npm install
npm run dev
```

Verification locale :

```bash
npm run lint
npm run build
```

Deploiement :

```bash
npm run deploy
```

Deploiement cible :

```bash
npm run deploy:hosting
npm run deploy:rules
```

## Configuration Firebase

1. Creer un projet dans la console Firebase.
2. Ajouter une application Web dans Project settings > General > Your apps.
3. Copier les valeurs de configuration Web dans un fichier `.env` a partir de `.env.example`.
4. Activer Authentication > Sign-in method > Google.
5. Activer Firestore Database en mode production.
6. Publier les regles de `firestore.rules` dans Firestore Database > Rules.
7. Dans Authentication > Settings > Authorized domains, verifier que `localhost` est autorise pour le dev local.

Collection utilisee : `raffleTickets`.
