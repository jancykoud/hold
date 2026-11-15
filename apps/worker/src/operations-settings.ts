import { z } from 'zod'

// What the operations agent's functions need from their environment, set by infra/lib/ops-worker.ts: less than the
// settlement worker, since it sends no money work and schedules nothing.
const schema = z.object({
  AWS_REGION: z.string().min(1),
  HOLD_DATABASE_CLUSTER_ARN: z.string().startsWith('arn:aws:rds:'),
  HOLD_DATABASE_SECRET_ARN: z.string().startsWith('arn:aws:secretsmanager:'),
  HOLD_DATABASE_NAME: z.string().min(1).default('hold_db'),
  HOLD_OPS_AGENT_QUEUE_URL: z.url(),
  HOLD_SMTP_SECRET: z.string().min(1),
  HOLD_PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  // PayPal's remote MCP server, which answers over server-sent events (tech-stack.md trial 10). Unset, the one of the
  // mode: the sandbox's was tried, the live one is the address PayPal documents and has not been.
  HOLD_PAYPAL_MCP_URL: z.url().optional(),
  // The evidence bucket, from which a dispute answer attaches the rental's published record.
  HOLD_EVIDENCE_BUCKET: z.string().min(3),
})

const MCP_URLS = { sandbox: 'https://mcp.sandbox.paypal.com/sse', live: 'https://mcp.paypal.com/sse' } as const

export type OperationsSettings = {
  readonly region: string
  readonly database: { readonly clusterArn: string; readonly secretArn: string; readonly name: string }
  readonly opsAgentQueueUrl: string
  readonly smtpSecret: string
  readonly paypalMode: 'sandbox' | 'live'
  readonly paypalMcpUrl: string
  readonly evidenceBucket: string
}

export function loadOperationsSettings(environment: Readonly<Record<string, string | undefined>>): OperationsSettings {
  const parsed = schema.safeParse(environment)
  if (!parsed.success) throw new Error(`The operations agent's settings are missing or wrong: ${[...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', ')}.`)
  const value = parsed.data
  return {
    region: value.AWS_REGION,
    database: { clusterArn: value.HOLD_DATABASE_CLUSTER_ARN, secretArn: value.HOLD_DATABASE_SECRET_ARN, name: value.HOLD_DATABASE_NAME },
    opsAgentQueueUrl: value.HOLD_OPS_AGENT_QUEUE_URL,
    smtpSecret: value.HOLD_SMTP_SECRET,
    paypalMode: value.HOLD_PAYPAL_MODE,
    paypalMcpUrl: value.HOLD_PAYPAL_MCP_URL ?? MCP_URLS[value.HOLD_PAYPAL_MODE],
    evidenceBucket: value.HOLD_EVIDENCE_BUCKET,
  }
}
