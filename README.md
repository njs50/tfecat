# TFE Item catalog

## Exporting your catalog!
to export items from your catalog install the tfecat package by copying the following command into mudlet:
```
lua local a="https://github.com/njs50/tfecat/raw/master/mudlet/tfecat.module/tfecat.xml"local b,c local d=function(e)cecho('\n<green>TFECAT: <white>package '..e..'!\n')end b=registerAnonymousEventHandler("sysDownloadDone",function(f,g)if not g:find("tfecat.xml",1,true)then return end killAnonymousEventHandler(b)d('downloaded')installPackage(g)os.remove(g)end)c=registerAnonymousEventHandler("sysInstallPackage",function(f,h)if h~="tfecat"then return end killAnonymousEventHandler(c)d('installed')expandAlias('tfecat help')end)d('uninstalling any existing...')uninstallPackage('tfecat')tempTimer(5,function()d('downloading...')downloadFile(getMudletHomeDir().."/tfecat.xml",a..'?_='..tostring(getEpoch))end)
```
search your catalog and upload new/updated items:
```
tfecat generate
```

send me a tell or mudmail to let me know about the new items so I can merge them into the db!







## developer info
feel free to fork this project. will prob need a recent node.js installed

### Running the web app locally:
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```




## updating the deployed website

### Update catalog.json from vault-thirteen.net server
```
npm run update-catalog
npm run update-summary
```

### Compile and minifies for production
```
npm run build
```
#### Deploying to github pages
```
npm run deploy
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
