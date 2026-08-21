/**
 * Outbound mail via Microsoft Graph SendMail.
 *
 * Uses the partner's own Entra app (CLIENT_ID/CLIENT_SECRET from env) with
 * `Mail.Send` application permission to send mail as the configured
 * `MAIL_FROM_ADDRESS` mailbox in the partner tenant. The mailbox + the
 * application permission must be admin-consented inside the partner's
 * Entra tenant — see docs/MAIL-SETUP.md.
 *
 * Mail is OPTIONAL — if MAIL_FROM_ADDRESS is unset, all helpers are no-ops
 * that log a warn and resolve.
 */

import 'isomorphic-fetch'
import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'
import { env } from '../env'
import { logger } from './logger'

let _client: Client | null = null

function graphClient(): Client | null {
  const e = env()
  if (!e.MAIL_FROM_ADDRESS) return null
  if (_client) return _client

  const credential = new ClientSecretCredential(
    e.AZURE_AD_TENANT_ID,
    e.AZURE_AD_CLIENT_ID,
    e.AZURE_AD_CLIENT_SECRET,
  )
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  _client = Client.initWithMiddleware({ authProvider, defaultVersion: 'v1.0' })
  return _client
}

export interface SendMailInput {
  to: string | string[]
  subject: string
  /** HTML body. Plain text auto-derived for the alternative part. */
  html: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}

export interface SendMailResult {
  ok: boolean
  /** Set when mail was deliberately skipped (MAIL_FROM_ADDRESS unset). */
  skipped?: boolean
  error?: string
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const e = env()
  const client = graphClient()
  const log = logger()

  if (!client || !e.MAIL_FROM_ADDRESS) {
    log.warn(
      { subject: input.subject, to: input.to },
      'sendMail skipped — MAIL_FROM_ADDRESS env unset',
    )
    return { ok: true, skipped: true }
  }

  const message = {
    subject: input.subject,
    body: { contentType: 'HTML', content: input.html },
    toRecipients: toRecipients(input.to),
    ...(input.cc && { ccRecipients: toRecipients(input.cc) }),
    ...(input.bcc && { bccRecipients: toRecipients(input.bcc) }),
    ...(input.replyTo && { replyTo: toRecipients(input.replyTo) }),
    from: {
      emailAddress: {
        address: e.MAIL_FROM_ADDRESS,
        ...(e.MAIL_FROM_DISPLAY_NAME && { name: e.MAIL_FROM_DISPLAY_NAME }),
      },
    },
  }

  try {
    await client
      .api(`/users/${encodeURIComponent(e.MAIL_FROM_ADDRESS)}/sendMail`)
      .post({ message, saveToSentItems: false })
    log.info(
      {
        subject: input.subject,
        to: input.to,
        from: e.MAIL_FROM_ADDRESS,
      },
      'sendMail succeeded',
    )
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ err: message, subject: input.subject }, 'sendMail failed')
    return { ok: false, error: message }
  }
}

function toRecipients(to: string | string[]) {
  const list = Array.isArray(to) ? to : [to]
  return list.map((address) => ({ emailAddress: { address } }))
}
