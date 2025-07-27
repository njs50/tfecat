import express from "express";
import bodyParser from 'body-parser';
import got from 'got';
import NPuzzleSolver from './solver.js';

const app = express();

let catalog, summary, trainers, customs

// load catalog from github
const catSrc = 'https://raw.githubusercontent.com/njs50/tfecat/master/public/catalog.json'
got(catSrc)
  .then(response => {
   catalog = JSON.parse(response.body);
   updateSummary()

  //  console.log(summary)
  }).catch(error => {
    console.log(error);
  })
;

const trainerSrc = 'https://raw.githubusercontent.com/njs50/tfecat/master/public/trainers.json'
got(trainerSrc)
  .then(response => {
    trainers = JSON.parse(response.body);
  }).catch(error => {
    console.log(error);
  })
;

const customsSrc = 'https://raw.githubusercontent.com/njs50/tfecat/master/public/customs.json'
got(customsSrc)
  .then(response => {
    customs = JSON.parse(response.body);
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

app.get("/customs", (req, res, next) => {
  res.json(customs);
});

app.get("/trainers", (req, res, next) => {
  res.json(trainers);
});

app.get("/catalog/summary", (req, res, next) => {
  res.json(summary);
});

app.post("/customs/diff", (req, res, next) => {
  for (let roomNumber in req.body) {
    customs[roomNumber] = customs[roomNumber] || {
      "location": req.body[roomNumber].location,
      "room": req.body[roomNumber].room,
      customs: {}
    };
    for (let itemName in req.body[roomNumber].customs) {
      customs[roomNumber].customs[itemName] = req.body[roomNumber].customs[itemName];
    }    
  }
  res.end("");
});

app.post("/trainers/diff", (req, res, next) => {
  for (let skill in req.body) {
    trainers[skill] = trainers[skill] || [];
    req.body[skill].forEach(roomNumber => {
      if (!trainers[skill].includes(roomNumber)) {
        trainers[skill].push(roomNumber);
      }
    })       
  }
  res.end("");
});

app.post("/catalog/diff", (req, res, next) => {
  for (let itemName in req.body) {
    catalog[itemName] = req.body[itemName]
  }
  updateSummary()
  res.end("");
});

app.post("/catalog/deleteItems", (req, res, next) => {  
  var count = 0;
  var failItems = '';
  for (let idx in req.body) {
    let itemName = req.body[idx]
    if (catalog[itemName]) {
      delete catalog[itemName];
      count++;
      // failItems += 'deleted: ' + itemName + '\n'
    } else {
      failItems += '\nnot found: ' + itemName
    }
  }    
  updateSummary()
  res.end("deleted " + count.toString() + " items" + failItems);

});

app.post("/puzzle/tile", (req, res, next) => {

  const solver = new NPuzzleSolver(req.body);

  const solution = solver.solve();
  
  const moves = [];
  
  if (!solution) {
      console.error('unsolvable puzzle...')
  } else {
    for (x in solution) {
      moves.push(solution[x].number);
    }
  }

  res.json(moves);

});