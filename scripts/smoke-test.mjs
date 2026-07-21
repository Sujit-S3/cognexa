const apiUrl = (process.env.API_URL ?? '').replace(/\/$/, '')
const webUrl = (process.env.WEB_URL ?? '').replace(/\/$/, '')
const expectedCommit = process.env.EXPECTED_COMMIT
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 12)
const delayMs = Number(process.env.SMOKE_DELAY_MS ?? 5_000)

if (!apiUrl || !webUrl) throw new Error('API_URL and WEB_URL are required')

async function retry(name, check) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await check()
      console.log(`PASS ${name}`)
      return
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error(`${name} failed after ${attempts} attempts`, { cause: lastError })
}

async function expectResponse(url, validate) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
    headers: { 'user-agent': 'cognexa-release-smoke/1.0' },
  })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  await validate(response)
}

await retry('web entry point', () =>
  expectResponse(webUrl, async (response) => {
    const html = await response.text()
    if (!html.includes('Cognexa') || !html.includes('manifest.webmanifest')) {
      throw new Error('Web entry point did not contain the Cognexa production shell')
    }
  })
)

await retry('API liveness and immutable revision', () =>
  expectResponse(`${apiUrl}/health/live`, async (response) => {
    const body = await response.json()
    if (body.status !== 'ok') throw new Error('API did not report ok')
    if (expectedCommit && body.commit !== expectedCommit) {
      throw new Error(`Expected commit ${expectedCommit}, received ${body.commit}`)
    }
  })
)

await retry('API readiness', () =>
  expectResponse(`${apiUrl}/health/ready`, async (response) => {
    const body = await response.json()
    if (!['ready', 'degraded'].includes(body.status)) throw new Error('API did not report ready')
    if (body.database !== 'connected') throw new Error('Database is not connected')
  })
)

await retry('versioned public configuration', () =>
  expectResponse(`${apiUrl}/api/v1/config`, async (response) => {
    const body = await response.json()
    if (!body.version || !body.features) throw new Error('Public runtime configuration is incomplete')
    if ('SECRET_KEY' in body) throw new Error('Public runtime configuration exposed a secret')
  })
)

console.log('Cognexa release smoke checks passed.')
