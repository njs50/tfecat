# TFE Item catalog

## Exporting your catalog!
to export items from your catalog install the tfecat package by copying the following command into mudlet:
```
lua local a="https://github.com/njs50/tfecat/raw/master/mudlet/tfecat.module/tfecat.xml"local b,c local d=function(e)cecho('\n<green>TFECAT: <white>package '..e..'!\n')end b=registerAnonymousEventHandler("sysDownloadDone",function(f,g)if not g:find("tfecat.xml",1,true)then return end killAnonymousEventHandler(b)d('downloaded')installPackage(g)os.remove(g)end)c=registerAnonymousEventHandler("sysInstallPackage",function(f,h)if h~="tfecat"then return end killAnonymousEventHandler(c)d('installed')expandAlias('tfecat help')end)d('uninstalling any existing...')uninstallPackage('tfecat')tempTimer(5,function()d('downloading...')downloadFile(getMudletHomeDir().."/tfecat.xml",a..'?_='..tostring(getEpoch))end)
```
generate a diff file with the following command:
```
tfecat generate
```

if it's not huge you can send it to me via tells when i'm around:
```
tfecat transmit Mojune
```







## developer info
feel free to fork this project. will prob need a recent node.js installed

## how to merge new catalog data.
* get diff json file
* copy it to your profile dir
* run `tfecat merge`
* copy catalog.json to `/public`
* build then deploy tfecat app

### Running the web app locally:
```
npm install
```

#### Compiles and hot-reloads for development
```
npm run serve
```

#### Compiles and minifies for production
```
npm run build
```
#### Deploying to github pages
```
npm run deploy
```