/**
 * Trait Value Multipliers for pricing
 * These are SEPARATE from the trait.multiplier field (which is for income calculation)
 *
 * Value multipliers affect the USD/Robux value of a brainrot based on its traits
 */

// Trait name (case-insensitive) -> value multiplier
// 1.5 = +50%, 1.2 = +20%, 1.1 = +10%, 1.0 = no change, 0.9 = -10%
const TRAIT_VALUE_MULTIPLIERS: Record<string, number> = {
  // +50% value
  'strawberry': 1.5,
  'meowl': 1.5,
  '10b': 1.5,
  'skibidi': 1.5,
  'lightning': 1.5,

  // +20% value
  'ufo': 1.2,
  'brazil': 1.2,
  'indonesian': 1.2,
  '26': 1.2,
  'glitched': 1.2,
  'zombie': 1.2,
  'extinct': 1.2,
  'jack o\'lantern': 1.2,
  'fireworks': 1.2,
  'santa hat': 1.2,
  'reindeer pet': 1.2,
  'sleepy': 1.2,
  'snowy': 1.2,
  'wet': 1.2,
  'tie': 1.2,
  'witching hour': 1.2,

  // +10% value
  'shark fin': 1.1,
  'spider': 1.1,
  'paint': 1.1,
  'fire': 1.1,
  'galactic': 1.1,
  'comet-struck': 1.1,
  'disco': 1.1,
  'matteo hat': 1.1,
  'rip tombstone': 1.1,
  'nyan': 1.1,
  'explosive': 1.1,

  // +20% value
  'bubblegum': 1.2,

  // No value change
  'crab claw': 1.0,

  // -10% value (ruins)
  'sombrero': 0.9,
  'taco': 0.9,
}

/**
 * Get the value multiplier for a single trait
 */
export function getTraitValueMultiplier(traitName: string): number {
  return TRAIT_VALUE_MULTIPLIERS[traitName.toLowerCase()] ?? 1.0
}

/**
 * Calculate the combined value multiplier for multiple traits
 * Uses additive stacking: (1 + sum of bonuses)
 * e.g., two +50% traits = 1 + 0.5 + 0.5 = 2.0x (not 1.5 * 1.5 = 2.25x)
 */
export function calculateTraitValueMultiplier(traitNames: string[]): number {
  if (traitNames.length === 0) return 1.0

  // Sum up all the bonuses (multiplier - 1)
  let totalBonus = 0
  for (const name of traitNames) {
    const mult = getTraitValueMultiplier(name)
    totalBonus += mult - 1
  }

  // Return 1 + total bonus, minimum 0.1 to prevent negative/zero values
  return Math.max(0.1, 1 + totalBonus)
}

/**
 * Calculate the final value of a brainrot with traits
 * @param baseValue - The base Robux value of the brainrot (with mutation already applied)
 * @param traitNames - Array of trait names on the brainrot
 * @returns The adjusted value
 */
export function calculateValueWithTraits(baseValue: number, traitNames: string[]): number {
  const traitMultiplier = calculateTraitValueMultiplier(traitNames)
  return Math.round(baseValue * traitMultiplier)
}
