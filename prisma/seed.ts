import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { SkillCategory } from '../src/generated/prisma/enums'

// Relative imports, not the `@/` alias — this script runs under tsx, outside Next.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
})

/**
 * The starting skill catalogue. Keeping skills as a curated list rather than
 * free text is deliberate: free text fragments into "Video editing", "video
 * edit", "VideoEditing" and discovery stops working. Add to this list as the
 * pilot turns up real gaps.
 */
const SKILLS: Array<{ name: string; category: SkillCategory }> = [
  { name: 'Data Structures & Algorithms', category: 'PROGRAMMING' },
  { name: 'Web Development', category: 'PROGRAMMING' },
  { name: 'Python', category: 'PROGRAMMING' },
  { name: 'Java', category: 'PROGRAMMING' },
  { name: 'Machine Learning', category: 'PROGRAMMING' },
  { name: 'Git & GitHub', category: 'PROGRAMMING' },
  { name: 'UI/UX Design', category: 'DESIGN' },
  { name: 'Figma', category: 'DESIGN' },
  { name: 'Graphic Design', category: 'DESIGN' },
  { name: 'Video Editing', category: 'MEDIA' },
  { name: 'Photography', category: 'MEDIA' },
  { name: 'Content Writing', category: 'MEDIA' },
  { name: 'Public Speaking', category: 'CAREER' },
  { name: 'Resume Building', category: 'CAREER' },
  { name: 'Interview Preparation', category: 'CAREER' },
  { name: 'Spoken English', category: 'LANGUAGE' },
  { name: 'German', category: 'LANGUAGE' },
  { name: 'Japanese', category: 'LANGUAGE' },
  { name: 'Guitar', category: 'MUSIC' },
  { name: 'Keyboard', category: 'MUSIC' },
  { name: 'Singing', category: 'MUSIC' },
  { name: 'Mathematics', category: 'ACADEMIC' },
  { name: 'Physics', category: 'ACADEMIC' },
  { name: 'Fitness & Gym', category: 'LIFESTYLE' },
  { name: 'Cooking', category: 'LIFESTYLE' },
  { name: 'Chess', category: 'LIFESTYLE' },
]

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  for (const { name, category } of SKILLS) {
    const slug = slugify(name)
    // Upsert on slug so re-running the seed is safe and never duplicates.
    await prisma.skill.upsert({
      where: { slug },
      update: { name, category },
      create: { name, slug, category },
    })
  }

  const count = await prisma.skill.count()
  console.log(`Seeded skill catalogue — ${count} skills in the database.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
