#!/bin/sh
npm run update
git add ./public/catalog.json
git add ./public/customs.json
git add ./public/summary.json
git add ./public/trainers.json
git commit -m "catalog update"
git push
npm run deploy