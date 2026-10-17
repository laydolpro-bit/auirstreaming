# Démarrer avec auirstream

Guide pas à pas, pour débutant, de l'installation locale jusqu'à la mise en
ligne sur Netlify. Aucune base de données, aucun compte utilisateur : le site
affiche un catalogue (métadonnées TMDB) et lit la vidéo dans un lecteur
partenaire intégré.

> Résumé express (si vous êtes pressé) :
>
> ```powershell
> copy .env.example .env          # puis remplissez TMDB_API_KEY
> npm install
> npm run dev                     # http://localhost:5173
> ```
>
> Puis, pour publier :
>
> ```powershell
> npm run build
> npx netlify login
> npx netlify deploy --prod
> ```

---

## 1. Ce que contient le projet

| Dossier / fichier | Rôle |
| --- | --- |
| `src/` | Application React (pages, composants, styles). |
| `server/tmdb.mjs` | Logique du proxy catalogue (validation, cache, limitation de débit). |
| `netlify/functions/catalog.mjs` | Fonction serveur `/api/catalog` (en ligne). |
| `netlify/functions/config.mjs` | Fonction serveur `/api/config` (config publique : Smartlink, zone push). |
| `public/3231865.sw.js` | Service worker des notifications publicitaires (fichier obligatoire, contenu fourni). |
| `netlify.toml` | Configuration Netlify : build, redirections, en-têtes (CSP, cache). |
| `.env` | Vos variables **privées** locales (jamais commitées). |
| `.env.example` | Modèle vide à copier en `.env`. |
| `scripts/test-*.mjs` | Tests hors ligne (proxy, lecteur, notifications). |

Le catalogue utilise TMDB pour les métadonnées (titre, synopsis, affiches).
L'API TMDB est toujours appelée **par le serveur**, jamais par le navigateur :
la clé n'est donc jamais visible par le visiteur.

---

## 2. Prérequis

- **Node.js 20 LTS ou plus récent** (le projet est testé avec Node 20/24).
- **npm** (installé avec Node.js).

Vérifiez dans un terminal :

```powershell
node --version
npm --version
```

Si `node` n'est pas reconnu, installez Node.js depuis <https://nodejs.org>
(choisissez la version « LTS »).

> Astuce : ce projet a été développé avec un Node portable. Si vous avez
> installé Node portable quelque part, préfixez vos commandes avec le dossier
> qui contient `node.exe`, par exemple :
>
> ```powershell
> $env:Path = "C:\chemin\vers\node;$env:Path"
> npm.cmd install
> ```
>
> (Sous PowerShell, utilisez `npm.cmd` plutôt que `npm` si la stratégie
> d'exécution bloque les scripts `.ps1`.)

---

## 3. Installation locale

1. Placez-vous dans le dossier du projet :

   ```powershell
   cd "C:\Users\Auir\Documents\Projet par défaut"
   ```

2. Copiez le modèle de configuration :

   ```powershell
   copy .env.example .env
   ```

3. Ouvrez `.env` dans un éditeur et remplissez la clé TMDB :

   ```dotenv
   TMDB_API_KEY=votre_cle_tmdb
   TMDB_BASE=https://api.themoviedb.org/3
   NETWORK_SMARTLINK_URL=https://celyntor.xyz/go/5nSgY6oIZsesHyfOIpup8_Om
   ```

   - `TMDB_API_KEY` est **obligatoire** : sans elle, `/api/catalog` répond avec
     une erreur claire.
   - `NETWORK_SMARTLINK_URL` est l'adresse du panneau publicitaire affiché avant
     la lecture (facultatif : sans elle, la lecture démarre directement).

4. Installez les dépendances :

   ```powershell
   npm install
   ```

> **Important – secrets.** Les variables de `.env` ne doivent **jamais**
> commencer par `VITE_`. Une variable `VITE_…` serait copiée dans le fichier
> JavaScript public. Ici, `TMDB_API_KEY` est lue uniquement côté serveur
> (fonction Netlify ou serveur de développement Vite) : elle n'apparaît jamais
> dans `dist/` ni dans le navigateur.

---

## 4. Lancer le site en local

```powershell
npm run dev
```

Ouvrez <http://localhost:5173>. Le catalogue fonctionne immédiatement : le
serveur de développement Vite monte le même proxy `/api/catalog` que la
fonction Netlify, donc **vous n'avez pas besoin de publier le domaine** pour
tout tester (navigation, fiches, recherche, filtres, lecteur).

Autre option, pour tester exactement comme Netlify (fonctions incluses) :

```powershell
npx netlify dev
```

---

## 5. Lancer les tests

```powershell
npm test
```

Cela exécute trois suites **hors ligne** (aucun appel réseau, aucune
souscription réelle) :

- `npm run test:proxy` : le proxy refuse les URL arbitraires, les traversées de
  chemin et les paramètres inconnus ; il n'accepte que les chemins TMDB de
  métadonnées ; la limitation de débit fonctionne.
- `npm run test:player` : les URL du lecteur Fluxora contiennent la clé
  publique `pk` à l'identique pour les films et les épisodes.
- `npm run test:push` : le SDK de notifications est chargé **une seule fois**
  (même avec React StrictMode), les identifiants de campagne sont conservés,
  un refus d'autorisation est respecté, et rien n'est chargé hors HTTPS.

> Ces tests simulent le navigateur. Ils ne prouvent pas qu'un vrai abonnement
> push a été créé : cette étape dépend du consentement du visiteur et de son
> navigateur, et ne peut pas être vérifiée par un script.

---

## 6. Compiler pour la production

```powershell
npm run build
```

Le résultat est écrit dans `dist/`. Pour vérifier le rendu de production en
local (le proxy `/api/catalog` est aussi actif en prévisualisation) :

```powershell
npm run preview
```

Ouvrez <http://localhost:4173>.

---

## 7. Déployer sur Netlify

### 7.a Sans GitHub (recommandé pour débuter)

Netlify peut recevoir directement le build depuis votre ordinateur : aucun
dépôt Git n'est nécessaire.

1. Installez la CLI Netlify (une fois) :

   ```powershell
   npm install -g netlify-cli
   ```

   Ou, sans installation globale, préfixez chaque commande par `npx`, par
   exemple `npx netlify login`.

2. Connectez-vous (ouvre le navigateur) :

   ```powershell
   netlify login
   ```

3. Créez et liez le site (la première fois) :

   ```powershell
   netlify init
   ```

   - Choisissez « Create & configure a new site ».
   - Laissez la commande de build (`npm run build`) et le dossier publié
     (`dist`) tels quels : `netlify.toml` les définit déjà.

4. **Renseignez les variables privées** (voir section 8).

5. Compilez puis envoyez un aperçu (URL de test privée) :

   ```powershell
   npm run build
   netlify deploy
   ```

6. Quand l'aperçu est correct, publiez en production :

   ```powershell
   netlify deploy --prod
   ```

La commande affiche l'URL publique, du type
`https://<nom-du-site>.netlify.app`.

### 7.b Avec un dépôt Git (facultatif)

Si vous préférez connecter un dépôt Git, pointez Netlify vers le dépôt : le
`netlify.toml` fournit déjà la commande de build, le dossier `dist`, le dossier
des fonctions et les en-têtes. Réglez simplement les variables privées dans
**Site settings → Environment variables**.

---

## 8. Variables privées sur Netlify

Ne mettez **jamais** ces valeurs dans le code. Deux méthodes :

**a) Via l'interface** — Site settings → Environment variables → ajoutez :

| Clé | Valeur | Portée |
| --- | --- | --- |
| `TMDB_API_KEY` | votre clé TMDB | Builds + Functions |
| `TMDB_BASE` | `https://api.themoviedb.org/3` | Builds + Functions |
| `NETWORK_SMARTLINK_URL` | l'adresse du Smartlink | Builds + Functions |

**b) Via la CLI** :

```powershell
netlify env:set TMDB_API_KEY "votre_cle_tmdb"
netlify env:set TMDB_BASE "https://api.themoviedb.org/3"
netlify env:set NETWORK_SMARTLINK_URL "https://celyntor.xyz/go/5nSgY6oIZsesHyfOIpup8_Om"
```

Après un changement de variable, relancez un déploiement pour que les
fonctions l'utilisent.

---

## 9. Domaine `.netlify.app` et limites du plan gratuit

- **Domaine gratuit** : Netlify fournit une adresse `https://<nom>.netlify.app`.
  Vous pouvez la personnaliser dans **Site settings → Domain management →
  Change site name** (par exemple `auirstream.netlify.app`). Le HTTPS est
  activé automatiquement.
- **Domaine personnalisé** : possible plus tard (bouton « Add custom domain »).
  Il faut alors créer l'enregistrement DNS demandé par Netlify.
- **Limites indicatives du plan gratuit** (vérifiez la page tarifs de Netlify,
  elles évoluent) : bande passante ~100 Go/mois, ~300 minutes de build/mois,
  fonctions serverless ~125 000 appels/mois. Pour un petit catalogue, c'est
  largement suffisant. En cas de dépassement, Netlify prévient et propose une
  offre payante.

---

## 10. Vérifier le service worker obligatoire après le déploiement

Le fichier `3231865.sw.js` doit être servi tel quel (jamais remplacé par la
page HTML). Après publication :

1. Ouvrez `https://<votre-site>/3231865.sw.js` dans le navigateur. Vous devez
   voir ces quelques lignes JavaScript (et **pas** la page du site) :

   ```js
   self.opts = {
       zoneID: 3231865,
       swDomain: "push-sdk.com",
   }
   importScripts("https://push-sdk.com/f/sw.js")
   ```

2. Vérifiez les en-têtes avec les outils du navigateur (onglet Réseau / Network)
   ou :

   ```powershell
   curl.exe -I https://<votre-site>/3231865.sw.js
   ```

   Attendu :
   - Statut **200**
   - `Content-Type: application/javascript` ou `text/javascript`
   - `Cache-Control: no-cache, must-revalidate`

Sans HTTPS valide et sans ces en-têtes, le navigateur refuse d'installer le
service worker et les notifications ne peuvent pas être proposées.

---

## 11. À propos de `CATALOG_TOKEN`

Cette version **n'utilise pas** de `CATALOG_TOKEN`. Le catalogue repose sur des
métadonnées publiques TMDB servies par le proxy `/api/catalog` : il n'y a ni
index privé, ni jeton de catalogue à gérer. Vous n'avez donc rien à configurer
de ce côté. La seule clé à protéger est `TMDB_API_KEY`, et elle reste côté
serveur.

---

## 12. Suivi des revenus

Les statistiques du réseau publicitaire sont consultables par l'éditeur à
l'adresse <https://seekosint.online/publisher#stats>. Aucun montant n'est
garanti : le site n'affiche volontairement aucune estimation de revenu ni
aucun compteur fictif.

---

## 13. Adapter le site à un VPS (hébergement payant)

Si vous préférez un serveur privé plutôt que Netlify :

1. Compilez le site : `npm run build`. Le dossier `dist/` contient des fichiers
   statiques.
2. Servez `dist/` avec un serveur web (Nginx, Apache, Caddy…).
   - **Toutes les routes inconnues doivent renvoyer `index.html`** (application
     monopage), **sauf** `/3231865.sw.js` et les fichiers réels (`/assets/*`,
     `/favicon.svg`), qui doivent être servis tels quels.
3. Réimplémentez les deux points d'API côté serveur Node en réutilisant
   `server/tmdb.mjs` :
   - `GET /api/catalog?path=…` → `runCatalogRequest(...)`
   - `GET /api/config` → mêmes données publiques que
     `netlify/functions/config.mjs`
   Le plus simple : un petit serveur Express qui monte ces deux routes et sert
   `dist/`.
4. Fournissez les variables `TMDB_API_KEY`, `TMDB_BASE` et
   `NETWORK_SMARTLINK_URL` en variables d'environnement du processus.
5. Activez **HTTPS** (obligatoire pour le lecteur et les notifications). Avec
   Nginx, utilisez Certbot/Let's Encrypt.
6. Servez `/3231865.sw.js` avec un type JavaScript et `Cache-Control: no-cache`.

---

## 14. Dépannage rapide

| Symptôme | Piste |
| --- | --- |
| `/api/catalog` renvoie `503` / « clé manquante » | `TMDB_API_KEY` absente du `.env` (en local) ou des variables Netlify (en ligne). |
| Aucune affiche ne s'affiche | Réseau bloqué vers `image.tmdb.org`, ou bloqueur de publicité trop strict. |
| Le lecteur ne démarre pas | Vérifiez que l'iframe `fluxora.sbs` n'est pas bloquée ; utilisez « Ouvrir dans un nouvel onglet ». |
| Les notifications ne sont jamais proposées | Normal sur iPhone et si l'utilisateur a déjà refusé, ou si le site n'est pas en HTTPS. Le comportement est volontairement silencieux. |
| `npm` refusé sous PowerShell | Utilisez `npm.cmd` (stratégie d'exécution des scripts `.ps1`). |
| Port déjà utilisé | Changez le port : `npm run dev -- --port 5174`. |

---

## 15. Rappel sur le contenu et les droits

Le site affiche des **métadonnées** TMDB (titres, synopsis, notes, affiches).
Cela ne confère **aucun droit de diffusion** sur les œuvres. La lecture se fait
dans le lecteur partenaire, qui utilise son propre hébergement. Ce produit
utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
