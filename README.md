# Tempo — suivi du poids et planning alimentaire

Application Angular en cours de construction pour organiser le suivi de poids et
les habitudes associées. Le premier écran est un planning hebdomadaire des repas,
adapté aux écrans mobiles et aux ordinateurs.

## Import du classeur

Utilisez le bouton **Importer un fichier .xlsx** et choisissez le classeur
contenant les cinq feuilles attendues :

- **Planning semaine** : repas, collations, estimation journalière, statut de
  chaque repas et notes.
- **Repères portions** : aliment, portion et remarque.
- **Liste de courses** : rayon, produit, quantité, état acheté et notes.
- **Suivi quotidien** : poids, faim/satiété, eau, activité, repas, faim
  émotionnelle, sommeil et commentaire.
- **À lire** : période dans le titre, puis informations et conseils.

L’import valide les feuilles, les en-têtes et les dates avant de remplacer les
données actives. Les données importées et les modifications réalisées dans
l’application (suivi des repas, notes, courses achetées et suivi quotidien) sont
enregistrées dans le stockage local du navigateur. Les erreurs de lecture ou
d’enregistrement sont affichées dans l’interface. Le fichier d’origine n’est
jamais modifié ni envoyé à un service externe.

Le classeur fourni sert à vérifier le format pris en charge. La structure reste
isolée derrière une interface de stockage afin de préparer un futur adaptateur
Supabase sans lier les pages au navigateur.

## Pages

- **Planning semaine** : détail des repas par jour, suivi « À renseigner »,
  « Respecté » ou « Non respecté », et notes de journée.
- **Repères portions** : repères importés sur les quantités et la pesée.
- **Liste de courses** : produits regroupés par rayon et cases « acheté ».
- **Suivi quotidien** : poids facultatif, faim/satiété, hydratation, activité,
  repas, faim émotionnelle, sommeil et commentaire.
- **À lire** : conseils et informations issus de la feuille correspondante.

## Modèle métier et sources de vérité

Les modèles métier sont indépendants de l’interface et du stockage. Chaque table
prévue possède son fichier `[nom].model.ts` dans `src/app/core/models/` :
`profile`, `week`, `recipe`, `recipe-ingredient`, `ingredient`, `meal-plan`,
`meal-log`, `shopping-item`, `weight-entry`, `activity-log` et `daily-log`.
Les structures complémentaires des feuilles sont décrites par leurs propres
modèles.

Le code Angular suit cette organisation :

- `core/` : modèles métier, lecture du classeur, service d’état et adaptateur de
  stockage local.
- `shared/` : composants réutilisables à l’échelle de l’application.
- `pages/` : pages fonctionnelles, composants, constantes et modèles de présentation propres à chaque fonctionnalité.

L’architecture visée conserve la même structure de classeur pour les échanges
dans les deux phases :

- Phase Google Sheets : le classeur Google Drive est la source de vérité.
- Phase Angular : Supabase devient la source de vérité et synchronise les appareils.
- Le classeur Excel conserve sa structure entre les deux phases.

La synchronisation Supabase et l’export du classeur restent à mettre en place.

## Développement

Installez les dépendances avec `npm install`, puis lancez le serveur de
développement :

```bash
npm start
```

Ouvrez `http://localhost:4200/`.

## Vérification

```bash
npm run build
npm test -- --watch=false
```
