# TFE Item catalog

## Exporting your catalog!
to export items from your catalog that aren't in this one copy and paste this line into mudlet:
```
lua local a="https://github.com/njs50/tfecat/raw/master/mudlet/tfecat.module/tfecat.xml"local b,c local d=function(e)cecho('\n<green>TFECAT: <white>package '..e..'!\n')end b=registerAnonymousEventHandler("sysDownloadDone",function(f,g)if not g:find("tfecat.xml",1,true)then return end killAnonymousEventHandler(b)d('downloaded')installPackage(g)os.remove(g)end)c=registerAnonymousEventHandler("sysInstallPackage",function(f,h)if h~="tfecat"then return end killAnonymousEventHandler(c)d('installed')catalog.export(function()end)end)d('uninstalling any existing...')uninstallPackage('tfecat')tempTimer(5,function()d('downloading...')downloadFile(getMudletHomeDir().."/tfecat.xml",a..'?_='..tostring(getEpoch))end)
```
send me the file it produces or if i'm online (and at the keyboard) you can transmit the data via tells with this command:
```
lua catalog.transmit('Mojune')
```



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