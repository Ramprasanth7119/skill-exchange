// Responsive sweep: screenshot every route at phone / tablet / desktop and
// flag any page whose content overflows the viewport horizontally.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const PORT = process.argv[2] ?? '3001'
const OUT = process.argv[3] ?? 'shots'
const BASE = `http://localhost:${PORT}`
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

const ROUTES = [
  ['landing', '/'],
  ['login', '/login'],
  ['discover', '/discover'],
  ['profile-shreya', '/u/u-shreya'],
  ['sessions', '/sessions'],
  ['leaderboard', '/leaderboard'],
  ['wallet', '/wallet'],
  ['profile', '/profile'],
  ['onboarding', '/onboarding'],
]

async function clickByText(page, selector, text) {
  await page.$$eval(
    selector,
    (els, t) => {
      const el = els.find((e) => e.textContent && e.textContent.includes(t))
      if (el) el.click()
    },
    text,
  )
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

// Onboard once so the app routes render with data.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle2' })
await page.type('input[type="email"]', 'shots@college.edu')
await clickByText(page, 'button', 'Send magic link')
await page.waitForFunction(() => document.body.innerText.includes('Check your inbox'))
await clickByText(page, 'a', 'Open the magic link')
await page.waitForFunction(() => location.pathname === '/onboarding', { timeout: 8000 })
await page.type('input', 'Shot Tester')
const selects = await page.$$('select')
await selects[0].select('CSE')
await selects[1].select('2')
await clickByText(page, 'button', 'Continue')
await page.waitForFunction(() => document.body.innerText.includes('What are you good at?'))
await clickByText(page, 'button', 'Data Structures & Algorithms')
await page.waitForFunction(() => document.body.innerText.includes('How comfortable'))
await clickByText(page, 'button', 'Continue')
await page.waitForFunction(() => document.body.innerText.includes('What would you love'))
await clickByText(page, 'button', 'UI/UX Design')
await clickByText(page, 'button', 'Continue')
await page.waitForFunction(() => document.body.innerText.includes("You're in"))
await clickByText(page, 'button', 'Start exploring')
await page.waitForFunction(() => location.pathname === '/discover', { timeout: 8000 })

const problems = []
for (const { name: vp, width, height } of VIEWPORTS) {
  await page.setViewport({ width, height })
  for (const [name, route] of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 700)) // let entrance animations land
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return { scroll: el.scrollWidth, client: el.clientWidth }
    })
    const flag = overflow.scroll > overflow.client + 1
    if (flag) problems.push(`${vp}/${name}: ${overflow.scroll}px wide in ${overflow.client}px viewport`)
    await page.screenshot({ path: `${OUT}/${vp}-${name}.png`, fullPage: true })
    console.log(`${flag ? 'OVERFLOW' : 'ok      '}  ${vp}/${name}`)
  }
}

await browser.close()
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nNo horizontal overflow anywhere.')
