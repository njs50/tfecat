const express = require("express");
const app = express();

const bodyParser = require('body-parser')
const got = require('got');

let catalog, summary

// load catalog from github
const catSrc = 'https://raw.githubusercontent.com/njs50/tfecat/master/public/catalog.json'
got(catSrc)
  .then(response => {
   catalog = JSON.parse(response.body);
   updateSummary()

   console.log(summary)
  }).catch(error => {
    console.log(error);
  })
;

const updateSummary = () => {

  summary = {}
  for (let itemName in catalog) {
    let item = catalog[itemName]
    summary[item.source] = summary[item.source] | 0;
    summary[item.source] = summary[item.source] + 1
  }

}


// parse application/json
app.use(bodyParser.json({ limit: '5mb' }))

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.get("/catalog", (req, res, next) => {
  res.json(catalog);
});

app.get("/catalog/summary", (req, res, next) => {
  res.json(summary);
});

app.post("/catalog/diff", (req, res, next) => {
  for (let itemName in req.body) {
    catalog[itemName] = req.body[itemName]
  }
  updateSummary()
});