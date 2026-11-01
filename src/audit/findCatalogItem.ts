import { sanitizeItemName, stripLeadingArticle } from './itemSanitize'

type Catalogish = {
  name?: string
  'Unidentified Name'?: string
  catalogKey?: string
  searchItemName?: string
  searchUnidentifiedItemName?: string
}

function searchKey(item: Catalogish): { name: string; unidentified: string } {
  const name = sanitizeItemName(String(item.name ?? ''))
  const unidentified = sanitizeItemName(String(item['Unidentified Name'] ?? ''))
  return { name, unidentified }
}

/**
 * Port of Mudlet `catalog.findItem` against the in-memory SPA catalog
 * (names already article-stripped by the store, but sanitize still runs).
 */
export function findCatalogItem<T extends Catalogish>(
  itemName: string,
  items: T[],
): T | null {
  const iname = sanitizeItemName(itemName)
  if (!iname) return null

  const exact = items.find((item) => {
    const keys = searchKey(item)
    return keys.name === iname || keys.unidentified === iname
  })
  if (exact) return exact

  // "tear-shaped jewel" matches "floating tear-shaped jewel" (endsWith)
  const ends = items.find((item) => {
    const keys = searchKey(item)
    return keys.name.endsWith(iname) || keys.unidentified.endsWith(iname)
  })
  if (ends) return ends

  // Light plural strip (Mudlet: e?s$)
  const singular = iname.replace(/e?s$/, '')
  if (singular !== iname) {
    return findCatalogItem(singular, items)
  }

  // Last resort: compare article-stripped raw against store names.
  const stripped = stripLeadingArticle(itemName).toLowerCase()
  return (
    items.find((item) => {
      const n = String(item.name ?? '').toLowerCase()
      const u = String(item['Unidentified Name'] ?? '').toLowerCase()
      return n === stripped || u === stripped
    }) ?? null
  )
}
