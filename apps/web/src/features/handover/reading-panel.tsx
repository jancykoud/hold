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
import { ActionMessage } from '@/features/shop/action-message'
import { useRouter } from '@/i18n/navigation'
import type { ShopActionResult } from '@/server/shop-access'

const EIGHTHS = Array.from({ length: READING_LIMITS.fuelEighths + 1 }, (_, eighths) => eighths)

type ReadingPanelProps = {
  sessionId: string
  reading: Reading | null
  // At a return, what the handover read, shown beside what is entered now.
  handoverReading: Reading | null
  sealed: boolean
  // The renter read it themselves, at a return with nobody at the counter.
  byRenter?: boolean
  // The server function that keeps the reading: the handover's or the return's.
  record: (state: ShopActionResult<unknown> | null, form: FormData) => Promise<ShopActionResult<unknown>>
}

// A vehicle's dashboard, read by a person from its photograph: the kilometres on the odometer and the fuel in the tank,
// in eighths. Shown only for a kind of item that is driven. Once the photographs are sealed, the reading is sealed with
// them and only read.
export function ReadingPanel({ sessionId, reading, handoverReading, sealed, byRenter = false, record }: ReadingPanelProps) {
  const t = useTranslations('shop.readings')
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()
  const [result, save, saving] = useActionState(record, null)
  // The page is drawn again with the saved reading, so the seal below knows the dashboard has been read.
  useEffect(() => {
    if (result?.ok === true) router.refresh()
  }, [result, router])
  const words = (read: Reading) => t('read', { km: format.number(read.odometerKm), fuel: t('fuel', { eighths: read.fuelEighths }) })
  return (
    <Panel title={t('title')} icon={Gauge}>
      <div className="grid gap-4 p-4 md:p-5">
        {handoverReading === null ? null : <p className="figures text-sm text-muted-foreground">{t('atHandover', { reading: words(handoverReading) })}</p>}
        {sealed ? (
          <>
            <p className="figures font-semibold">{reading === null ? t('none') : words(reading)}</p>
            {byRenter && reading !== null ? <p className="text-pretty text-muted-foreground">{t('byRenter')}</p> : null}
          </>
        ) : (
          <form action={save} className="grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <p className="text-pretty text-muted-foreground">{t('lead')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 content-start gap-1.5">
                <Label htmlFor="odometerKm">{t('odometer')}</Label>
                <Input id="odometerKm" name="odometerKm" type="number" inputMode="numeric" min={handoverReading?.odometerKm ?? 0} max={READING_LIMITS.odometerKm} step={1} required defaultValue={reading?.odometerKm ?? ''} className="figures" />
              </div>
              <div className="grid min-w-0 content-start gap-1.5">
                <Label htmlFor="fuelEighths">{t('fuelLabel')}</Label>
                <Select id="fuelEighths" name="fuelEighths" required defaultValue={reading === null ? '' : String(reading.fuelEighths)}>
                  <option value="" disabled>{t('choose')}</option>
                  {EIGHTHS.map((eighths) => <option key={eighths} value={eighths}>{t('fuelOption', { eighths })}</option>)}
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button type="submit" variant={reading === null ? 'default' : 'outline'} className="min-h-12 max-sm:w-full" disabled={saving}>{t('save')}</Button>
              <ActionMessage result={result} success={t('saved')} results="shop.readings.results" />
            </div>
          </form>
        )}
      </div>
    </Panel>
  )
}
