import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const DATA_PATH = '/Users/mtvadam/Desktop/CursorProjects/RotDotPlace'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  console.log('Starting seed...')

  // Load JSON files
  const brainrotsData = JSON.parse(fs.readFileSync(path.join(DATA_PATH, 'brainrots.json'), 'utf-8'))
  const mutationsData = JSON.parse(fs.readFileSync(path.join(DATA_PATH, 'mutations.json'), 'utf-8'))
  const traitsData = JSON.parse(fs.readFileSync(path.join(DATA_PATH, 'traits.json'), 'utf-8'))
  const eventsData = JSON.parse(fs.readFileSync(path.join(DATA_PATH, 'events.json'), 'utf-8'))

  // Seed Mutations
  console.log('Seeding mutations...')
  for (const mutation of mutationsData.mutations) {
    await prisma.mutation.upsert({
      where: { name: mutation.name },
      update: { multiplier: mutation.multiplier },
      create: {
        name: mutation.name,
        multiplier: mutation.multiplier,
      },
    })
  }
  console.log(`Seeded ${mutationsData.mutations.length} mutations`)

  // Seed Traits
  console.log('Seeding traits...')
  for (const trait of traitsData.traits) {
    const multiplier = typeof trait.multiplier === 'string'
      ? parseFloat(trait.multiplier)
      : trait.multiplier

    await prisma.trait.upsert({
      where: { name: trait.name },
      update: {
        imageUrl: trait.image_url || null,
        localImage: trait.localImage || null,
        multiplier,
      },
      create: {
        name: trait.name,
        imageUrl: trait.image_url || null,
        localImage: trait.localImage || null,
        multiplier,
      },
    })
  }
  console.log(`Seeded ${traitsData.traits.length} traits`)

  // Seed Events
  console.log('Seeding events...')
  for (const event of eventsData.events) {
    await prisma.event.upsert({
      where: { name: event.event_name },
      update: {
        imageUrl: event.image_url || null,
        localImage: event.localImage || null,
      },
      create: {
        name: event.event_name,
        imageUrl: event.image_url || null,
        localImage: event.localImage || null,
      },
    })
  }
  console.log(`Seeded ${eventsData.events.length} events`)

  // Seed Brainrots
  console.log('Seeding brainrots...')
  for (const brainrot of brainrotsData.brain_rot_entries) {
    // Parse cost and income (remove underscores and handle null)
    const baseCost = brainrot.base_cost
      ? BigInt(brainrot.base_cost.replace(/_/g, ''))
      : BigInt(0)
    const baseIncome = brainrot.base_income
      ? BigInt(brainrot.base_income.replace(/_/g, ''))
      : BigInt(0)

    const slug = slugify(brainrot.name)

    await prisma.brainrot.upsert({
      where: { name: brainrot.name },
      update: {
        slug,
        imageUrl: brainrot.image_url || '',
        localImage: brainrot.localImage || null,
        baseCost,
        baseIncome,
        rarity: brainrot.rarity || null,
        isActive: true,
      },
      create: {
        name: brainrot.name,
        slug,
        imageUrl: brainrot.image_url || '',
        localImage: brainrot.localImage || null,
        baseCost,
        baseIncome,
        rarity: brainrot.rarity || null,
        isActive: true,
      },
    })
  }
  console.log(`Seeded ${brainrotsData.brain_rot_entries.length} brainrots`)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
