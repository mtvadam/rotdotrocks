/**
 * Trait Value Multipliers for pricing
 * These are SEPARATE from the trait.multiplier field (which is for income calculation)
 *
 * Value multipliers affect the USD/Robux value of a brainrot based on its traits.
 * Primary source: DB `valueMultiplier` field (editable in admin panel).
 * Fallback: hardcoded map below (for traits without DB values).
 */

// Fallback map for traits that haven't been migrated to DB yet
const TRAIT_VALUE_FALLBACK: Record<string, number> = {
  'strawberry': 1.5,
  'meowl': 1.5,
  '10b': 1.5,
  'skibidi': 1.5,
  'lightning': 1.5,
  'ufo': 1.2,
  'rose': 1.2,
  'brazil': 1.2,
  'indonesian': 1.2,
  '26': 1.2,
  'glitched': 1.2,
  'zombie': 1.2,
  'extinct': 1.2,
  "jack o'lantern": 1.2,
  'fireworks': 1.2,
  'santa hat': 1.2,
  'reindeer pet': 1.2,
  'sleepy': 1.2,
  'snowy': 1.2,
  'wet': 1.2,
  'tie': 1.2,
  'witching hour': 1.2,
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
  'bubblegum': 1.2,
  'crab claw': 1.0,
  'sombrero': 0.9,
  'taco': 0.9,
}

/**
 * Get the value multiplier for a single trait.
 * Accepts either a name string or an object with { name, valueMultiplier }.
 * DB valueMultiplier takes priority over the hardcoded fallback.
 */
export function getTraitValueMultiplier(trait: string | { name: string; valueMultiplier?: number }): number {
  if (typeof trait === 'string') {
    return TRAIT_VALUE_FALLBACK[trait.toLowerCase()] ?? 1.0
  }
  // Use DB value if set (not default 1.0 or if it IS 1.0 and trait is in fallback as 1.0)
  if (trait.valueMultiplier !== undefined && trait.valueMultiplier !== null) {
    return trait.valueMultiplier
  }
  return TRAIT_VALUE_FALLBACK[trait.name.toLowerCase()] ?? 1.0
}

/**
 * Streak multipliers: having more traits multiplies the total trait bonus.
 * Key = minimum trait count, value = multiplier applied to the trait bonus.
 * e.g. { 3: 2, 5: 3 } means 3 traits = 2x bonus, 5+ traits = 3x bonus.
 *
 * Default streaks (can be overridden at runtime via setStreakMultipliers):
 */
let streakMultipliers: Record<number, number> = { 3: 2, 5: 3 }

export function setStreakMultipliers(multipliers: Record<number, number>) {
  streakMultipliers = multipliers
}

export function getStreakMultipliers(): Record<number, number> {
  return { ...streakMultipliers }
}

function getStreakMultiplier(traitCount: number): number {
  let best = 1
  for (const [minCount, mult] of Object.entries(streakMultipliers)) {
    if (traitCount >= Number(minCount) && mult > best) {
      best = mult
    }
  }
  return best
}

/**
 * Calculate the combined value multiplier for multiple traits.
 * Accepts an array of trait name strings OR trait objects with valueMultiplier.
 * Uses additive stacking: (1 + sum of bonuses) with streak multiplier on the bonus.
 *
 * Streak: 3 traits = 2x the bonus, 5 traits = 3x the bonus.
 * e.g. 3 traits at +20% each = +60% bonus, streak 2x = +120% → final 2.2x
 */
export function calculateTraitValueMultiplier(traits: Array<string | { name: string; valueMultiplier?: number }>): number {
  if (traits.length === 0) return 1.0

  let totalBonus = 0
  for (const trait of traits) {
    const mult = getTraitValueMultiplier(trait)
    totalBonus += mult - 1
  }

  const streak = getStreakMultiplier(traits.length)
  return Math.max(0.1, 1 + totalBonus * streak)
}

/**
 * Calculate the final value of a brainrot with traits
 */
export function calculateValueWithTraits(baseValue: number, traits: Array<string | { name: string; valueMultiplier?: number }>): number {
  const traitMultiplier = calculateTraitValueMultiplier(traits)
  return Math.round(baseValue * traitMultiplier)
}
