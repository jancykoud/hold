import type { DamageType, PriceCategory } from '@hold/domain'
import { money } from '@hold/domain'
import { useLocale, useTranslations } from 'next-intl'
import { Panel } from '@/components/ui/panel'
import { formatMoney } from '@/lib/money'

type TermsWords = { readonly prices: string; readonly pricesLead: string; readonly wear: string; readonly wearLead: string }

type TermsViewProps = {
  currency: string
  // damageType: the type of damage a price for damage names, when it names one.
  prices: readonly { readonly description: string; readonly category: PriceCategory; readonly amountCents: number; readonly damageType?: DamageType | null | undefined }[]
  wearPolicy: string
  // The titles and leads, when the reader is the shop's own staff rather than the renter.
  words?: TermsWords
}

// The shop's damage prices and its wear policy, as a renter reads them before agreeing to them.
export function TermsView({ currency, prices, wearPolicy, words }: TermsViewProps) {
  const t = useTranslations('renter')
  const types = useTranslations('shop.prices.damageTypes')
  const locale = useLocale()
  const said = words ?? { prices: t('prices'), pricesLead: t('pricesLead'), wear: t('wear'), wearLead: t('wearLead') }
  return (
    <div className="grid gap-6">
      <Panel title={said.prices}>
        <p className="border-b border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground md:px-5">{said.pricesLead}</p>
        <ul className="divide-y divide-border/70">
          {prices.map((price) => (
            <li key={price.description} className="flex items-baseline justify-between gap-4 px-4 py-3.5 md:px-5">
              <span className="grid min-w-0 gap-0.5">
                <span className="wrap-long-words">{price.description}</span>
                {price.damageType == null ? null : <span className="text-sm text-muted-foreground">{types(price.damageType)}</span>}
              </span>
              <span className="figures shrink-0 font-semibold">{formatMoney(money(price.amountCents, currency), locale)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={said.wear}>
        <p className="border-b border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground md:px-5">{said.wearLead}</p>
        <p className="px-4 py-4 whitespace-pre-line wrap-long-words md:px-5">{wearPolicy}</p>
      </Panel>
    </div>
  )
}
