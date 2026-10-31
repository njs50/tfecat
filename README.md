# TFE Item catalog
The web version (for non mudlet users) is available [here](https://njs50.github.io/tfecat)

## Installing the TFECat mudlet client

install via my mudlet package manager:
```lua
lua postPMInstall='tfecat'; uninstallPackage('njs50-package-manager'); installPackage('https://raw.githubusercontent.com/njs50/njs50-package-manager/main/njs50-package-manager.xml')
```
to search your catalog and upload new/updated items:
```
tfecat generate
```
to see the various help pages:
```
tfecat
tcat
tcat-audit
```

I manually validate the updates that are sent through before updating the main catalog, send me (mojune) a mudmail if it's been a while
and your items aren't in the catalog!


## developer info
feel free to fork this project. will prob need a recent node.js installed (Node 26 LTS).

This repo is **pnpm-only**. Enable it with Corepack (`corepack enable`), then use `pnpm` — `npm install` / `npm ci` are blocked by a `preinstall` `only-allow pnpm` guard.

### Running the web app locally:
```
pnpm install
```

### Compiles and hot-reloads for development
```
pnpm run dev
```




## updating the deployed website

### Update catalog.json from vault-thirteen.net server
```
pnpm run update-catalog
pnpm run update-summary
```

### Compile and minifies for production
```
pnpm run build
```
#### Deploying to github pages
```
pnpm run deploy
```

#### building docker image
```
docker build -t tfecat .
```

#### deploying to docker server
```
docker stop tfecat
docker rm tfecat
docker run -p 49160:3000 -d -it --name=tfecat --restart=always tfecat
```
