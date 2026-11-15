'use client'

import type { Reading } from '@hold/domain'
import { READING_LIMITS } from '@hold/domain'
import { Gauge } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { RenterMessage } from '@/features/renter/renter-message'
import { useRouter } from '@/i18n/navigation'
import { saveSelfReturnReading } from './renter-actions'

const EIGHTHS = Array.from({ length: READING_LIMITS.fuelEighths + 1 }, (_, eighths) => eighths)

// A vehicle's dashboard, read by its renter where they left it: the kilometres on the odometer and the fuel in the
// tank, in eighths. The shop reads the same figures beside the dashboard's photograph when it opens. Entered again
// before sending, it replaces the one before.
export function ReturnReadingForm({ token, sessionId, reading, handoverReading }: { token: string; sessionId: string; reading: Reading | null; handoverReading: Reading | null }) {
  const t = useTranslations('selfReturn.renter.reading')
  const words = useTranslations('shop.readings')
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()
  const [result, save, saving] = useActionState(saveSelfReturnReading, null)
  // The page is drawn again with the saved reading, so the send button knows the dashboard has been read.
  useEffect(() => {
    if (result?.ok === true) router.refresh()
  }, [result, router])
  const said = (read: Reading) => words('read', { km: format.number(read.odometerKm), fuel: words('fuel', { eighths: read.fuelEighths }) })
  const odometerId = `odometer-${sessionId}`
  const fuelId = `fuel-${sessionId}`
  return (
    <Panel title={t('title')} icon={Gauge}>
      <form action={save} className="grid gap-4 p-4 md:p-5">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <p className="text-pretty text-muted-foreground">{t('lead')}</p>
        {handoverReading === null ? null : <p className="figures text-sm text-muted-foreground">{t('atHandover', { reading: said(handoverReading) })}</p>}
        {reading === null ? null : <p role="status" className="figures font-semibold">{t('read', { reading: said(reading) })}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid min-w-0 content-start gap-1.5">
            <Label htmlFor={odometerId}>{words('odometer')}</Label>
            <Input id={odometerId} name="odometerKm" type="number" inputMode="numeric" min={handoverReading?.odometerKm ?? 0} max={READING_LIMITS.odometerKm} step={1} required defaultValue={reading?.odometerKm ?? ''} className="min-h-12" />
          </div>
          <div className="grid min-w-0 content-start gap-1.5">
            <Label htmlFor={fuelId}>{words('fuelLabel')}</Label>
            <Select id={fuelId} name="fuelEighths" required defaultValue={reading === null ? '' : String(reading.fuelEighths)} className="min-h-12">
              <option value="" disabled>{words('choose')}</option>
              {EIGHTHS.map((eighths) => <option key={eighths} value={eighths}>{words('fuelOption', { eighths })}</option>)}
            </Select>
          </div>
        </div>
        <Button type="submit" variant={reading === null ? 'default' : 'outline'} className="min-h-12 justify-self-stretch sm:justify-self-start" disabled={saving}>{words('save')}</Button>
        <RenterMessage result={result} />
      </form>
    </Panel>
  )
}
