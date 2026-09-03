// Drives the two scheduling-and-messaging features end to end in real Chrome:
// availability windows on the profile, slot suggestions in the request modal,
// the session thread (send, receive, unread badge, badge clearing), and the
// propose/accept reschedule loop with calendar export.
import puppeteer from 'puppeteer-core'

const PORT = process.argv[2] ?? '3000'
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

async function waitForText(page, text, timeout = 20000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,1000'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 1000 })
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))

  // --- onboard someone who teaches DSA -----------------------------------
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', 'chat@college.edu')
  await clickByText(page, 'button', 'Send magic link')
  await waitForText(page, 'Check your inbox')
  await clickByText(page, 'a', 'Open the magic link')
  await page.waitForFunction(() => location.pathname === '/onboarding', { timeout: 8000 })
  await page.type('input', 'Chat Tester')
  const selects = await page.$$('select')
  await selects[0].select('CSE')
  await selects[1].select('3')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What are you good at?')
  await clickByText(page, 'button', 'Data Structures & Algorithms')
  await waitForText(page, 'How comfortable are you?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What would you love to learn?')
  await clickByText(page, 'button', 'Skip for now')
  await waitForText(page, "You're in, Chat!")
  await clickByText(page, 'button', 'Start exploring')
  await page.waitForFunction(() => location.pathname === '/discover', { timeout: 8000 })

  // --- availability: a preset writes a real week -------------------------
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'When are you usually free?')
  await clickByText(page, 'button', 'Weekday evenings')
  const rows = await page.$$eval('input[type="time"]', (els) => els.length)
  record('preset adds five weekday windows (10 time inputs)', rows === 10, `${rows} inputs`)
  await clickByText(page, 'button', 'Save changes')
  await waitForText(page, 'Profile saved')
  await page.reload({ waitUntil: 'networkidle2' })
  await waitForText(page, 'When are you usually free?')
  const persisted = await page.$$eval('input[type="time"]', (els) => els.length)
  record('windows survive a reload', persisted === 10, `${persisted} inputs`)

  // --- request modal offers the teacher's real slots ---------------------
  // Straight to a known teacher: "the first card" is whoever the roster
  // happens to order first, which makes every later assertion a coin toss.
  await page.goto(`${BASE}/u/u-aditya`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Aditya Menon')
  await waitForText(page, 'Usually free')
  record('public profile lists the teacher’s weekly windows', true)
  await clickByText(page, 'button', 'Request session')
  await waitForText(page, 'In person')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'Preferred time')
  const modalText = await page.evaluate(() => document.body.innerText)
  record('request modal shows the teacher’s free slots', modalText.includes('is usually free then'))

  // Clicking a suggestion has to fill the datetime field, not just look nice.
  await page.$$eval('button', (els) => {
    const chip = els.find((e) => /^(Today|Tomorrow|[A-Z][a-z]{2} \d+)/.test(e.textContent ?? ''))
    if (chip) chip.click()
  })
  const filled = await page.$eval('input[type="datetime-local"]', (el) => el.value)
  record('tapping a slot fills the time field', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(filled), filled)

  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'Ready to send?')
  await clickByText(page, 'button', 'Send request')
  await waitForText(page, 'Sent to Aditya!')
  await clickByText(page, 'a', 'View sessions')
  await page.waitForFunction(() => location.pathname === '/sessions', { timeout: 8000 })

  // --- the thread: send, receive, unread badge ---------------------------
  await clickByText(page, 'a', 'Learning Data Structures')
  await page.waitForFunction(() => location.pathname.startsWith('/sessions/'), { timeout: 8000 })
  const sessionUrl = page.url()
  await waitForText(page, 'Message Aditya')
  record('thread opens on a REQUESTED session', true)

  const question = 'Could we start with recursion rather than arrays?'
  await page.type('textarea[aria-label^="Message"]', question)
  await clickByText(page, 'button[aria-label="Send message"]', '')
    .catch(() => page.click('button[aria-label="Send message"]'))
  await waitForText(page, question)
  record('own message appears in the thread', true)

  // Leave before the reply lands, or the open thread reads it on arrival —
  // which is correct behaviour, and would leave nothing for the badge to show.
  await page.goto(`${BASE}/sessions`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('span[aria-label$="unread messages"]', { timeout: 25000 })
  record('a reply that arrives while you are away raises an unread badge', true)

  // Which canned line the counterpart picks depends on the thread length,
  // so accept any of them.
  const REPLIES = [
    'Anything you want me to prepare beforehand?',
    'bring your laptop and we can go through it live',
    'I usually sit near the library entrance',
    'Ping me here if anything changes',
  ]
  await page.goto(sessionUrl, { waitUntil: 'networkidle2' })
  await page.waitForFunction(
    (lines) => lines.some((l) => document.body.innerText.includes(l)),
    { timeout: 15000 },
    REPLIES,
  )
  record('counterpart reply lands in the thread', true)

  await page.goto(`${BASE}/sessions`, { waitUntil: 'networkidle2' })
  const badgeAfter = await page.$('span[aria-label$="unread messages"]')
  record('reading the thread clears the badge', badgeAfter === null)

  // --- reschedule: propose, wait for the other side, land the new time ---
  await page.goto(sessionUrl, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Did the session happen?', 30000) // i.e. now ACCEPTED
  const accepted = await page.evaluate(() => document.body.innerText)
  record(
    'accepted session offers calendar export',
    accepted.includes('Google Calendar') && accepted.includes('Download .ics'),
  )

  await clickByText(page, 'button', 'Suggest a new time')
  await waitForText(page, 'has to agree before anything moves')
  await page.$$eval('button', (els) => {
    const chip = els.find((e) => /^(Today|Tomorrow|[A-Z][a-z]{2} \d+)/.test(e.textContent ?? ''))
    if (chip) chip.click()
  })
  const proposedValue = await page.$eval('input[type="datetime-local"]', (el) => el.value)
  await clickByText(page, 'button', 'Send suggestion')
  await waitForText(page, 'Waiting for Aditya to accept the new time')
  record('proposal waits on the other side instead of moving the session', true)

  await waitForText(page, 'agreed to the new time', 25000)
  const settled = await page.evaluate(() => document.body.innerText)
  const gone = !settled.includes('Waiting for Aditya to accept')
  record('accepted proposal replaces the scheduled time', gone, proposedValue)
} catch (error) {
  record(`ABORTED: ${error.message}`, false)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
