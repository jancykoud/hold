'use client'

import { ITEM_CATEGORIES, ITEM_TYPE_LIMITS, READING_LIMITS, takesReadings } from '@hold/domain'
import type { ItemCategory } from '@hold/domain'
import { Coins } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FormCard } from '@/components/ui/form-card'

export type Amounts = { readonly value: string; readonly hold: string; readonly dayRate: string }

type TypeBasicsProps = { name: string; category: ItemCategory; onCategory: (category: ItemCategory) => void; amounts: Amounts; currency: string; includedKmPerDay: string }

// The type's name and kind, and the three amounts every rental of it is priced from.
export function TypeBasics({ name, category, onCategory, amounts, currency, includedKmPerDay }: TypeBasicsProps) {
  const t = useTranslations('shop.items.form')
  const categories = useTranslations('shop.items.categories')
  const amount = (field: keyof Amounts, label: string) => (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={field}>{label}</Label>
      <Input id={field} name={field} inputMode="decimal" className="figures" defaultValue={amounts[field]} maxLength={20} required />
    </div>
  )

  return (
    <>
      <div className="surface grid gap-5 p-4 sm:grid-cols-2 md:p-5">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="name">{t('name')}</Label>
          <Input id="name" name="name" defaultValue={name} maxLength={ITEM_TYPE_LIMITS.name} required aria-describedby="name-help" />
          <p id="name-help" className="text-sm text-muted-foreground">
            {t('nameHelp')}
          </p>
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="category">{t('category')}</Label>
          <Select id="category" name="category" value={category} onChange={(event) => { onCategory(event.target.value as ItemCategory) }}>
            {ITEM_CATEGORIES.map((each) => (
              <option key={each} value={each}>
                {categories(each)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <FormCard title={t('amounts')} help={t('amountsHelp')} icon={Coins}>
        <div className="grid gap-5 sm:grid-cols-3">
          {amount('value', t('value', { currency }))}
          {amount('hold', t('hold', { currency }))}
          {amount('dayRate', t('dayRate', { currency }))}
        </div>
        {/* Only a kind that is driven includes kilometres; the ones beyond are charged from the price list. */}
        {takesReadings(category) ? (
          <div className="grid max-w-sm content-start gap-1.5 pt-5">
            <Label htmlFor="includedKmPerDay">{t('includedKm')}</Label>
            <Input id="includedKmPerDay" name="includedKmPerDay" type="number" inputMode="numeric" min={0} max={READING_LIMITS.includedKmPerDay} step={1} className="figures" defaultValue={includedKmPerDay} required aria-describedby="included-km-help" />
            <p id="included-km-help" className="text-sm text-muted-foreground">{t('includedKmHelp')}</p>
          </div>
        ) : null}
      </FormCard>
    </>
  )
}
