// End-to-end drive of the SkillSwap live demo: fresh visitor → onboarding →
// request a session → teacher accepts (live event) → incoming request arrives →
// confirm attendance → credit settles → wallet reflects it.
import puppeteer from 'puppeteer-core'

const PORT = process.argv[2] ?? '3002'
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
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    { timeout },
    text,
  )
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

  // --- landing (fresh state every run) ---
  await page.goto(BASE, { waitUntil: 'networkidle2' })
  await page.evaluate(() => localStorage.clear())
  record('landing renders hero', (await page.content()).includes('Pay in time.'))

  // --- gate: /discover without an account bounces to /login ---
  await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle2' })
  await page.waitForFunction(() => location.pathname === '/login', { timeout: 8000 })
  record('un-onboarded visitor redirected to /login', true)

  // --- login ---
  await page.type('input[type="email"]', 'test@college.edu')
  await clickByText(page, 'button', 'Send magic link')
  await waitForText(page, 'Check your inbox')
  record('magic-link sent state', true)
  await clickByText(page, 'a', 'Open the magic link')

  // --- onboarding ---
  await page.waitForFunction(() => location.pathname === '/onboarding', { timeout: 8000 })
  await page.type('input', 'Test Student')
  const selects = await page.$$('select')
  await selects[0].select('CSE')
  await selects[1].select('3')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What are you good at?')
  await clickByText(page, 'button', 'Data Structures & Algorithms')
  await waitForText(page, 'How comfortable are you?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What would you love to learn?')
  await clickByText(page, 'button', 'UI/UX Design')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, "You're in, Test!")
  record('onboarding steps complete', true)
  const onboardedAt = Date.now()
  await clickByText(page, 'button', 'Start exploring')

  // --- discover, personalized ---
  await page.waitForFunction(() => location.pathname === '/discover', { timeout: 8000 })
  await waitForText(page, 'What do you want to learn, Test?')
  record('discover personalized after onboarding', true)

  // --- request a session with Nithya (Video Editing) ---
  await page.goto(`${BASE}/u/u-nithya`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Nithya Raghavan')
  await clickByText(page, 'button', 'Request session')
  await waitForText(page, 'How do you want to meet?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What should Nithya know?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'Ready to send?')
  await clickByText(page, 'button', 'Send request')
  await waitForText(page, 'Sent to Nithya!')
  record('session request flow', true)

  await clickByText(page, 'a', 'View sessions')
  await page.waitForFunction(() => location.pathname === '/sessions', { timeout: 8000 })
  await waitForText(page, 'Learning Video Editing')
  record('pending request listed', true)

  // --- live: teacher accepts (due ~8-15s after request) ---
  await waitForText(page, 'accepted your request', 30000)
  record('LIVE teacher acceptance toast', true)

  // --- live: incoming request for a taught skill (due ~15s after onboarding) ---
  const sinceOnboard = Date.now() - onboardedAt
  const remaining = Math.max(25000 - sinceOnboard, 5000)
  await waitForText(page, 'wants to learn Data Structures', remaining)
  record('LIVE incoming request toast', true)

  // --- upcoming session shows schedule ---
  await page.reload({ waitUntil: 'networkidle2' })
  await clickByText(page, 'button[role="tab"]', 'Upcoming')
  await waitForText(page, 'Learning Video Editing')
  await clickByText(page, 'a', 'Learning Video Editing')
  await page.waitForFunction(() => /\/sessions\/s-/.test(location.pathname), { timeout: 8000 })
  await waitForText(page, 'Did the session happen?')
  const hasWhatsApp = (await page.content()).includes('wa.me')
  record('accepted session has schedule + WhatsApp', hasWhatsApp)

  // --- confirm attendance → counterpart confirms (~3s) → settlement ---
  await clickByText(page, 'button', 'I attended this session')
  await waitForText(page, 'Session complete', 15000)
  await waitForText(page, '1 credit well spent', 15000)
  record('LIVE two-sided settlement + credit move', true)

  // --- rate it (star buttons are icon-only; target the aria-label) ---
  await page.click('button[role="radio"][aria-label="5 stars"]')
  await clickByText(page, 'button', 'Submit rating')
  await waitForText(page, 'You rated this session')
  record('rating flow', true)

  // --- wallet: 0 credits, ledger has both entries ---
  await page.goto(`${BASE}/wallet`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Learned Video Editing from Nithya Raghavan')
  await waitForText(page, 'Welcome credit')
  const outOfCredits = await page
    .waitForFunction(() => document.body.innerText.includes('Out of credits'), { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  record('wallet ledger + zero-balance nudge', outOfCredits)

  // --- teacher side: accept the incoming request ---
  await page.goto(`${BASE}/sessions`, { waitUntil: 'networkidle2' })
  await clickByText(page, 'button[role="tab"]', 'Pending')
  await waitForText(page, 'Teaching Data Structures')
  await clickByText(page, 'a', 'Teaching Data Structures')
  await waitForText(page, 'wants to learn from you')
  record('incoming request is answerable', true)
} catch (error) {
  record(`ABORTED: ${error.message}`, false)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
