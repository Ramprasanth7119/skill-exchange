// Checks for the engagement layer: Google sign-in button, the notification
// bell, perfect-swap matching, favorites + the Saved filter, the leaderboard
// and wallet achievements.
import puppeteer from 'puppeteer-core'

const PORT = process.argv[2] ?? '3001'
const BASE = `http://localhost:${PORT}`
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const results = []
function record(name, ok, extra = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
}

async function clickByText(page, selector, text) {
  const clicked = await page.$$eval(
    selector,
    (els, t) => {
      const el = els.find((e) => e.textContent && e.textContent.includes(t))
      if (el) {
        el.click()
        return true
      }
      return false
    },
    text,
  )
  if (!clicked) throw new Error(`clickByText: no ${selector} containing "${text}"`)
}

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,900'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))

  // --- Google sign-in is offered ---
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2' })
  record(
    'login offers Continue with Google',
    (await page.content()).includes('Continue with Google'),
  )

  // --- onboard teaching DSA (Shreya is lookingFor DSA → perfect swap) ---
  await page.type('input[type="email"]', 'features@college.edu')
  await clickByText(page, 'button', 'Send magic link')
  await waitForText(page, 'Check your inbox')
  await clickByText(page, 'a', 'Open the magic link')
  await page.waitForFunction(() => location.pathname === '/onboarding', { timeout: 8000 })
  await page.type('input', 'Feature Tester')
  const selects = await page.$$('select')
  await selects[0].select('CSE')
  await selects[1].select('2')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What are you good at?')
  await clickByText(page, 'button', 'Data Structures & Algorithms')
  await waitForText(page, 'How comfortable are you?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What would you love to learn?')
  await clickByText(page, 'button', 'Skip for now')
  await waitForText(page, "You're in, Feature!")
  await clickByText(page, 'button', 'Start exploring')
  await page.waitForFunction(() => location.pathname === '/discover', { timeout: 8000 })

  // --- notification bell holds the welcome notification ---
  const bellBadge = await page.$eval(
    'button[aria-label*="Notifications"]',
    (el) => el.getAttribute('aria-label'),
  )
  record('bell shows 1 unread after onboarding', bellBadge?.includes('1 unread') ?? false, bellBadge)
  await page.click('button[aria-label*="Notifications"]')
  await waitForText(page, 'Welcome, Feature!')
  record('notification centre lists the welcome note', true)
  await page.keyboard.press('Escape')
  await page.click('body', { offset: { x: 10, y: 400 } })

  // --- perfect swap chip on discover ---
  await waitForText(page, 'Perfect swap')
  const swapText = await page.evaluate(() => document.body.innerText)
  record(
    'perfect-swap chip names the viewer skill',
    swapText.includes('wants your Data Structures & Algorithms'),
  )

  // --- favorite a teacher, then filter by Saved ---
  await page.click('button[aria-label*="Save Shreya"]')
  await waitForText(page, 'Saved')
  await clickByText(page, 'button', 'Saved')
  await page.waitForFunction(
    () => document.body.innerText.includes('1 teacher found'),
    { timeout: 8000 },
  )
  const savedCards = await page.$$eval('a[href^="/u/"]', (els) =>
    els.filter((el) => el.textContent?.includes('View profile')).length,
  )
  record('Saved filter narrows to the hearted teacher', savedCards === 1, `${savedCards} card(s)`)

  // --- leaderboard podium + own standing ---
  await page.goto(`${BASE}/leaderboard`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Campus leaderboard')
  const board = await page.evaluate(() => document.body.innerText)
  record(
    'leaderboard shows podium leader and own standing',
    board.includes('Meera') && board.includes('one session away'),
  )

  // --- wallet achievements: first-steps unlocked, others locked ---
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Achievements')
  const wallet = await page.evaluate(() => document.body.innerText)
  record(
    'achievements shelf shows 2/8 unlocked (first steps + curator)',
    wallet.includes('2/8 unlocked'),
  )

  // --- feedback: write a note in the profile, see it on the landing wall ---
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Say it out loud')
  const note = 'Swapped DSA for design in one afternoon. Unreal.'
  await page.type('textarea[aria-label="Your note for the landing page wall"]', note)
  await clickByText(page, 'button', 'Put it on the wall')
  await waitForText(page, 'On the wall')
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Hear it from campus')
  const landing = await page.evaluate(() => document.body.innerText)
  record(
    'own note appears on the landing wall',
    landing.includes(note) && landing.includes('Feature Tester'),
  )
} catch (error) {
  record(`ABORTED: ${error.message}`, false)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
