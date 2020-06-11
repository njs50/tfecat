# TFE Item catalog

## Exporting your catalog!
to export items from your catalog that aren't in this one copy and paste this line into mudlet:
```
lua local a="https://github.com/njs50/tfecat/raw/master/mudlet/tfecat.module/tfecat.xml"local b,c local d=function(e)cecho('\n<green>TFECAT: <white>package '..e..'!\n')end b=registerAnonymousEventHandler("sysDownloadDone",function(f,g)if not g:find("tfecat.xml",1,true)then return end killAnonymousEventHandler(b)d('downloaded')installPackage(g)os.remove(g)end)c=registerAnonymousEventHandler("sysInstallPackage",function(f,h)if h~="tfecat"then return end killAnonymousEventHandler(c)d('installed')catalog.export(function()tempTimer(5,function()uninstallPackage('tfecat')d('uninstalled')end)end)end)downloadFile(getMudletHomeDir().."/tfecat.xml",a..'?_='..tostring(getEpoch))
```
send me the file it produces:
i.e `~/mudlet-data/profiles/<your profile>/catalog_dif.json` it will tell you where it is at the end of the export.



## Running the web app locally:
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
### Deploying to github pages
```
npm run deploy
```