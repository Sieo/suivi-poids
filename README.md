# Tempo — suivi du poids et planning alimentaire

Application Angular pour organiser le suivi du poids et les habitudes associées.
La connexion Supabase synchronise le suivi d’un compte sur ses appareils.

## Compte et confidentialité

Créez un compte ou connectez-vous avec une adresse e-mail et un mot de passe.
Selon la configuration Auth du projet Supabase, la création du compte peut
nécessiter une confirmation par e-mail. Les routes de suivi sont réservées aux
utilisateurs connectés.

Chaque compte dispose d’une ligne privée dans `public.user_workbooks`. Le
contrôle d’accès est appliqué par Postgres avec Row Level Security : les
politiques vérifient `auth.uid() = user_id` pour chaque lecture et écriture.
Seuls les utilisateurs authentifiés ont accès à la table. Le client Angular
utilise la clé publishable publique ; aucune clé secrète Supabase n’est stockée
dans l’application.

Les données du classeur ne sont plus enregistrées dans le stockage local du
navigateur. La session d’authentification, gérée par le SDK Supabase, reste
persistante sur l’appareil. Les données locales d’une ancienne version ne sont
pas transférées automatiquement : connectez-vous puis importez votre classeur
`.xlsx` dans votre compte.

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
données du compte connecté. Les modifications réalisées dans l’application
(suivi des repas, notes, courses achetées et suivi quotidien) sont synchronisées
avec Supabase. Les erreurs de lecture, de chargement ou d’enregistrement sont
affichées dans l’interface. Le fichier d’origine n’est jamais modifié.

Le classeur fourni sert à vérifier le format pris en charge. La structure reste
isolée derrière une interface de stockage et son contenu est conservé tel quel
dans la base pour garder le format indépendant de l’interface.

Le bouton **Télécharger Excel** génère un classeur `.xlsx` avec les cinq feuilles
attendues par l’import. Les statuts, notes, pesées, habitudes quotidiennes et
cases de courses sont repris depuis les données synchronisées du compte.

## Pages

- **Planning semaine** : détail des repas par jour, suivi « À renseigner »,
  « Respecté » ou « Non respecté », et notes de journée.
- **Récapitulatif** : évolution des pesées, moyenne d’hydratation et de sommeil,
  ainsi que le suivi des repas, avec des repères indicatifs sans jugement.
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

- `core/` : modèles métier, lecture/écriture du classeur, service d’état et
  adaptateur de stockage Supabase.
- `shared/` : composants réutilisables à l’échelle de l’application.
- `pages/` : pages fonctionnelles, composants, constantes et modèles de présentation propres à chaque fonctionnalité.

L’architecture conserve la même structure de classeur pour les échanges :

- Phase Google Sheets : le classeur Google Drive est la source de vérité.
- Phase Angular : Supabase est la source de vérité et synchronise les appareils.
- Le classeur Excel conserve sa structure entre les deux phases.

La migration de schéma est dans
`supabase/migrations/20261102180825_create_user_workbooks.sql` et a été
appliquée au projet Supabase connecté.

## Développement

Installez les dépendances avec `npm install`, puis lancez le serveur de
développement :

```bash
npm start
```

Ouvrez `http://localhost:4200/`. Les paramètres publics du projet sont définis
dans `src/app/core/supabase/supabase.config.ts` ; adaptez-les pour une autre
instance Supabase.

## Déploiement GitHub Pages et installation PWA

Chaque push sur `main` lance `.github/workflows/deploy-pages.yml`, qui vérifie
les tests puis publie l’application sur
`https://sieo.github.io/suivi-poids/`. Le routage par fragment (`/#/…`) permet
de recharger les pages sur l’hébergement statique. Le build Pages applique le
chemin de base `/suivi-poids/`.

Dans **Supabase → Authentication → URL Configuration**, définir l’URL du site
sur `https://sieo.github.io/suivi-poids/` et autoriser cette même URL dans
**Redirect URLs**. Le lien de confirmation d’adresse utilise automatiquement
l’URL de base du déploiement. Conserver également l’URL locale de développement
dans la liste des redirections si les inscriptions locales sont utilisées.

Le service worker met en cache les ressources statiques de l’application, mais
aucune réponse Supabase ni donnée personnelle. L’application exige une
connexion pour consulter les données et nécessite une connexion réseau pour
les synchroniser.

Sur téléphone, ouvrir l’URL publiée dans Safari (iOS) ou Chrome (Android), puis
choisir **Partager → Sur l’écran d’accueil** ou **Installer l’application**.
L’installation nécessite HTTPS ; GitHub Pages le fournit.

## Vérification

```bash
npm run build
npm test -- --watch=false
```
