// Regression test for the modal focus-steal bug plus the autofill drafts:
// onboard quickly (which schedules a live incoming-request toast at ~15s),
// open the request modal on /u/u-shreya, and keep typing while that toast
// fires. The cursor must never leave the textarea.
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

  // --- fast onboarding with a teachable skill (schedules the +15s event) ---
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', 'focus@college.edu')
  await clickByText(page, 'button', 'Send magic link')
  await waitForText(page, 'Check your inbox')
  await clickByText(page, 'a', 'Open the magic link')
  await page.waitForFunction(() => location.pathname === '/onboarding', { timeout: 8000 })
  await page.type('input', 'Focus Tester')
  const selects = await page.$$('select')
  await selects[0].select('CSE')
  await selects[1].select('2')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What are you good at?')
  await clickByText(page, 'button', 'Data Structures & Algorithms')
  await waitForText(page, 'How comfortable are you?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What would you love to learn?')
  await clickByText(page, 'button', 'Skip for now') // no wants selected
  await waitForText(page, "You're in, Focus!")
  const onboardedAt = Date.now()
  await clickByText(page, 'button', 'Start exploring')
  await page.waitForFunction(() => location.pathname === '/discover', { timeout: 8000 })

  // --- open the request modal on Shreya's profile, go to the message step ---
  await page.goto(`${BASE}/u/u-shreya`, { waitUntil: 'networkidle2' })
  await waitForText(page, 'Shreya Balakrishnan')
  await clickByText(page, 'button', 'Request session')
  await waitForText(page, 'How do you want to meet?')
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'What should Shreya know?')

  // --- autofill: draft appears, matched to the skill, and is editable ---
  await clickByText(page, 'button', 'Write it for me')
  const draft1 = await page.$eval('#request-message', (el) => el.value)
  record(
    'autofill drafts a matched message',
    draft1.includes('Shreya') && draft1.includes('UI/UX Design') && draft1.includes('portfolio'),
    draft1.slice(0, 60),
  )
  await clickByText(page, 'button', 'Try another draft')
  const draft2 = await page.$eval('#request-message', (el) => el.value)
  record('autofill cycles to a different draft', draft2 !== draft1)

  // --- the focus test: type while the live toast fires ---
  await page.$eval('#request-message', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.focus()
  })
  const typed = 'Hi Shreya, I really want to learn auto layout and components!'
  let focusLost = false
  for (const char of typed) {
    await page.keyboard.type(char)
    const focused = await page.evaluate(() => document.activeElement?.id === 'request-message')
    if (!focused) {
      focusLost = true
      break
    }
    await new Promise((r) => setTimeout(r, 230))
  }
  const elapsed = Date.now() - onboardedAt
  const finalValue = await page.$eval('#request-message', (el) => el.value)
  record('focus never leaves textarea while typing', !focusLost)
  record('typed text intact', finalValue === typed, `${finalValue.length}/${typed.length} chars`)
  record(
    'live toast fired during the typing window',
    elapsed > 15000 && (await page.content()).includes('wants to learn Data Structures'),
    `${Math.round(elapsed / 1000)}s elapsed`,
  )

  // --- and the send still works with the typed message ---
  await clickByText(page, 'button', 'Continue')
  await waitForText(page, 'Ready to send?')
  record('typed message survives to review step', (await page.content()).includes('auto layout'))
} catch (error) {
  record(`ABORTED: ${error.message}`, false)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
