import { createHash, randomBytes } from 'crypto'

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}

// Cryptographically secure random index selection
function secureRandomIndex(max: number): number {
  const randomBuffer = randomBytes(4)
  const randomValue = randomBuffer.readUInt32BE(0)
  return randomValue % max
}

export function generateChallengePhrase(): string {
  // Expanded word lists for higher entropy (64+ words each = 6+ bits per word)
  const adjectives = [
    'purple', 'golden', 'silver', 'crimson', 'azure', 'emerald', 'amber', 'violet',
    'scarlet', 'jade', 'ruby', 'sapphire', 'topaz', 'pearl', 'onyx', 'coral',
    'mystic', 'cosmic', 'stellar', 'lunar', 'solar', 'arctic', 'tropical', 'ancient',
    'eternal', 'crystal', 'diamond', 'velvet', 'satin', 'marble', 'granite', 'obsidian',
    'blazing', 'frozen', 'molten', 'misty', 'stormy', 'serene', 'vivid', 'radiant',
    'dazzling', 'glowing', 'shining', 'bright', 'dim', 'dark', 'light', 'shadowy',
    'hidden', 'secret', 'lost', 'found', 'wild', 'tame', 'bold', 'gentle',
    'fierce', 'calm', 'swift', 'slow', 'loud', 'quiet', 'warm', 'cool'
  ]
  const nouns = [
    'canvas', 'spark', 'flame', 'wave', 'star', 'moon', 'sun', 'comet',
    'planet', 'galaxy', 'nova', 'nebula', 'aurora', 'meteor', 'quasar', 'pulsar',
    'ocean', 'mountain', 'forest', 'desert', 'valley', 'river', 'lake', 'island',
    'thunder', 'lightning', 'rainbow', 'cloud', 'wind', 'storm', 'frost', 'ember',
    'phoenix', 'dragon', 'titan', 'sphinx', 'griffin', 'kraken', 'hydra', 'chimera',
    'crystal', 'prism', 'mirror', 'shadow', 'echo', 'whisper', 'dream', 'vision',
    'temple', 'tower', 'castle', 'portal', 'gateway', 'bridge', 'path', 'trail',
    'sword', 'shield', 'crown', 'scepter', 'orb', 'relic', 'token', 'charm'
  ]
  const verbs = [
    'dancing', 'soaring', 'glowing', 'shining', 'blazing', 'flowing', 'sparkling',
    'gleaming', 'radiating', 'flickering', 'pulsing', 'shimmering', 'beaming',
    'rising', 'falling', 'spinning', 'swirling', 'floating', 'drifting', 'sailing',
    'racing', 'chasing', 'hunting', 'seeking', 'finding', 'watching', 'guarding',
    'calling', 'singing', 'echoing', 'roaring', 'whispering', 'humming', 'chanting',
    'burning', 'freezing', 'melting', 'forming', 'breaking', 'building', 'crafting',
    'weaving', 'binding', 'freeing', 'opening', 'closing', 'turning', 'shifting',
    'growing', 'fading', 'blooming', 'wilting', 'thriving', 'resting', 'waking'
  ]

  // Use cryptographically secure random selection
  const adj = adjectives[secureRandomIndex(adjectives.length)]
  const noun = nouns[secureRandomIndex(nouns.length)]
  const verb = verbs[secureRandomIndex(verbs.length)]
  // Use secure random for number with larger range (0-9999)
  const numBuffer = randomBytes(2)
  const num = numBuffer.readUInt16BE(0) % 10000

  // Total entropy: 64 * 64 * 56 * 10000 = ~2.3 billion combinations (~31 bits)
  return `${adj}-${noun}-${num}-${verb}`
}
