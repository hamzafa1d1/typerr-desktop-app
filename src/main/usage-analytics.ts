import { existsSync, readFileSync, writeFileSync } from 'fs'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { release } from 'os'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { logs } from '@opentelemetry/api-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'

type AnalyticsState = {
  distinctId: string
  firstSeenAt: string
  installTracked: boolean
}

const STATE_FILE = 'analytics-state.json'
const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com'
const SERVICE_NAME = 'typerr-desktop-app'

let sdk: NodeSDK | null = null

function analyticsKey(): string {
  return process.env['TYPERR_POSTHOG_KEY']?.trim() ?? ''
}

function analyticsHost(): string {
  return process.env['TYPERR_POSTHOG_HOST']?.trim() || POSTHOG_DEFAULT_HOST
}

function statePath(): string {
  return join(app.getPath('userData'), STATE_FILE)
}

function loadState(): AnalyticsState {
  const file = statePath()
  if (existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<AnalyticsState>
      if (typeof parsed.distinctId === 'string' && parsed.distinctId.length > 0) {
        return {
          distinctId: parsed.distinctId,
          firstSeenAt: typeof parsed.firstSeenAt === 'string' ? parsed.firstSeenAt : new Date().toISOString(),
          installTracked: Boolean(parsed.installTracked)
        }
      }
    } catch {
      // Fall back to a fresh state.
    }
  }

  const next: AnalyticsState = {
    distinctId: randomUUID(),
    firstSeenAt: new Date().toISOString(),
    installTracked: false
  }
  saveState(next)
  return next
}

function saveState(state: AnalyticsState): void {
  try {
    writeFileSync(statePath(), JSON.stringify(state), 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Typerr] analytics state write failed', message)
  }
}

async function sendEvent(event: string, distinctId: string, properties: Record<string, unknown>): Promise<boolean> {
  const key = analyticsKey()
  if (!key) return false
  await ensureSdkStarted()

  try {
    const logger = logs.getLogger(SERVICE_NAME)
    logger.emit({
      severityText: 'info',
      body: event,
      attributes: {
        distinctId,
        ...properties,
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        osRelease: release(),
        isPackaged: app.isPackaged
      }
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Typerr] analytics log emit failed', message)
    return false
  }
}

async function ensureSdkStarted(): Promise<void> {
  if (sdk || !analyticsKey()) return

  const token = analyticsKey()
  const host = analyticsHost().replace(/\/$/, '')
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': SERVICE_NAME
    }),
    logRecordProcessor: new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${host}/i/v1/logs`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    )
  })

  await Promise.resolve(sdk.start())
}

export async function trackInstallAndLaunch(): Promise<void> {
  if (!analyticsKey()) return

  const state = loadState()

  if (!state.installTracked) {
    const installOk = await sendEvent('app_installed', state.distinctId, {
      firstSeenAt: state.firstSeenAt
    })
    if (installOk) {
      state.installTracked = true
      saveState(state)
    }
  }

  await sendEvent('app_opened', state.distinctId, {
    firstSeenAt: state.firstSeenAt
  })
}

export async function shutdownUsageAnalytics(): Promise<void> {
  if (!sdk) return
  try {
    await Promise.resolve(sdk.shutdown())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Typerr] analytics shutdown failed', message)
  } finally {
    sdk = null
  }
}
