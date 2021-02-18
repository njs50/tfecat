#!/bin/sh
npm run update-catalog
npm run update-summary
git add ./public/catalog.json
git add ./public/summary.json
git commit -m "catalog update"
git push
npm run deploy