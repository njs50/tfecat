#!/bin/sh
set -eu
pnpm run update
git add ./public/catalog.json ./public/customs.json ./public/summary.json ./public/trainers.json
if git diff --staged --quiet; then
  echo "No catalog file changes; skipping commit, push, and deploy."
  exit 0
fi
git commit -m "catalog update"
git push
pnpm run deploy
