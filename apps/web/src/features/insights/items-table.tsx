import { useTranslations } from 'next-intl'
import { SampleTag } from '@/components/ui/sample-tag'
import type { InsightsTables } from './insights-tables'

const NUMBER = 'figures px-3 py-3 text-right'

// Every item with what its rentals say this year. The table scrolls inside its own frame, so the page stays still.
export function ItemsTable({ items, money }: { items: InsightsTables['items']; money: (cents: number) => string }) {
  const t = useTranslations('insights.report.fields')
  const heading = (id: 'item' | 'item_type' | 'rentals' | 'days_out' | 'damage_found' | 'priced' | 'recovered' | 'open_marks' | 'wearing_fastest', numeric = false) => (
    <th scope="col" className={numeric ? 'px-3 py-2.5 text-right font-semibold whitespace-nowrap' : 'px-3 py-2.5 text-left font-semibold whitespace-nowrap'}>{t(id)}</th>
  )
  return (
    <div className="min-w-0 overflow-x-auto" tabIndex={0} role="group" aria-label={t('item')}>
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead className="bg-muted/60 text-[0.8125rem] text-muted-foreground">
          <tr>
            {heading('item')}
            {heading('item_type')}
            {heading('rentals', true)}
            {heading('days_out', true)}
            {heading('damage_found', true)}
            {heading('priced', true)}
            {heading('recovered', true)}
            {heading('open_marks', true)}
            {heading('wearing_fastest')}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.item_id} className="border-t border-border/60">
              <th scope="row" className="px-3 py-3 text-left font-semibold">
                <span className="flex flex-wrap items-center gap-2">{item.item}{item.sample ? <SampleTag /> : null}</span>
              </th>
              <td className="px-3 py-3">{item.item_type}</td>
              <td className={NUMBER}>{item.rentals}</td>
              <td className={NUMBER}>{item.days_out}</td>
              <td className={NUMBER}>{item.damage_found}</td>
              <td className={NUMBER}>{money(item.priced_cents)}</td>
              <td className={NUMBER}>{money(item.recovered_cents)}</td>
              <td className={NUMBER}>{item.open_marks}</td>
              <td className="px-3 py-3">{item.wearing_fastest}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
