'use client'

import { Send } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RenterMessage } from '@/features/renter/renter-message'
import { useRouter } from '@/i18n/navigation'
import { sendSelfReturn } from './renter-actions'

// Sends the return once every photograph is taken and, for a vehicle, its dashboard is read. Sending seals them, and
// the return counts from that moment.
export function SendReturnForm({ token, missing, unread = false }: { token: string; missing: number; unread?: boolean }) {
  const t = useTranslations('selfReturn.renter.send')
  const locale = useLocale()
  const router = useRouter()
  const [result, send, pending] = useActionState(sendSelfReturn, null)
  useEffect(() => {
    if (result?.ok === true) router.refresh()
  }, [result, router])
  return (
    <form action={send} className="grid gap-3 border-t pt-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <p className={missing === 0 && !unread ? 'font-semibold' : 'text-muted-foreground'}>{missing > 0 ? t('missing', { count: missing }) : unread ? t('unread') : t('ready')}</p>
      <Button type="submit" className="min-h-12 justify-self-stretch sm:justify-self-start" disabled={pending || missing > 0 || unread}>
        <Send aria-hidden="true" />
        {t('button')}
      </Button>
      <RenterMessage result={result} />
    </form>
  )
}
