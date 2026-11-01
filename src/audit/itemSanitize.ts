/**
 * Port of Mudlet `catalog.common.itemSanitize` + `catalog.sanitizeItemName`
 * from mudlet/tfecat.module/tfecat.xml (equipment / identity matching).
 */

/** Strip enchant/flaming/alignment fluff for catalog lookup. */
export function itemSanitize(raw: string, keepEnchant = false): string {
  if (!raw) return ''
  let string = raw

  string = string.replace(
    /(\+chaotic\+,? |\+lawful\+,? |\+evil\+,? |\+good\+,? |thanatotic,? |acid-dripping,? |divinely flamed,? |an empty,? |empty,?  |spiteful,? |jinxing,? |flaming,? |labeled )/gi,
    '',
  )

  if (!keepEnchant) {
    string = string.replace(/(\s\+\d)/g, '')
  }

  if (!/frost-covered ring/i.test(string)) {
    string = string.replace(/frost-covered,? /gi, '')
  }

  // only use first word in item of 'stupid name'
  string = string.replace(/'(.+?)\s(.+)'/g, "'$1'")

  string = string.replace(/^an enchanted,? ([aeiou])/i, 'an $1')
  string = string.replace(/^an enchanted,?/i, 'a')
  string = string.replace(/of enchanted/gi, 'of')
  string = string.replace(/^enchanted,? /i, '')

  return string.trim()
}

/**
 * Lowercase search key used by Mudlet `catalog.findItem`.
 * Strip `labeled …` (and contents/containing) so backpacks/quivers/sacks
 * match the base catalog name.
 */
export function sanitizeItemName(itemName: string): string {
  let name = itemName.toLowerCase()
  name = name.replace(/^(the |a |an )/i, '')
  name = name.replace(/^(pair of |set of)/i, '')
  // Nick: strip labeled and everything after (do not rewrite to "an empty …").
  name = name.replace(/\s+labeled\b.*$/i, '')
  name = name.replace(/ \+\d$/i, '')
  name = name.replace(/ (contains|containing) .*$/i, '')
  return itemSanitize(name)
}

/** Same article strip the Pinia catalog store applies on load. */
export function stripLeadingArticle(name: string): string {
  return name.replace(/^(A set of|A pair of|A|An|The|Some) /i, '')
}
