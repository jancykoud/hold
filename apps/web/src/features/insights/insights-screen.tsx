import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ChartNoAxesCombined, Lock, LockKeyhole } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Panel } from '@/components/ui/panel'
import { StatCard } from '@/components/ui/stat-card'
import type { ShopClock } from '@/hooks/use-shop-format'
import { useShopFormat } from '@/hooks/use-shop-format'
import { ShopFrame } from '@/features/shop/shop-frame'
import { Link } from '@/i18n/navigation'
import { shopRoutes } from '@/lib/routes'
import { BarPairs } from './bar-pairs'
import { HoldLives, SettlementWaterfall } from './hold-panels'
import { insightsFigures } from './insights-figures'
import type { InsightsTables } from './insights-tables'
import { ItemsTable } from './items-table'

export type InsightsScreenProps = { shopName: string; clock: ShopClock; tables: InsightsTables; canDecide: boolean }

// "2026-10" as the reader's language names the month.
function useMonthName(): (month: string) => string {
  const format = useFormatter()
  return (month) => {
    const [year, number] = month.split('-').map(Number)
    return format.dateTime(new Date(Date.UTC(year ?? 0, (number ?? 1) - 1, 15)), { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
}

// The insights dashboard (extensions.md section 12.5), for the owner and managers, drawn by Hold with no library: where
// the money is now, then what went to the shop and back month by month, what each type of item cost in damage, the
// holds by trust rung, each live hold on its 29 days, the settlement stepping down, and every item. Anyone else is told
// who opens it and pointed to the money ledger, which every staff member reads.
export function InsightsScreen({ shopName, clock, tables, canDecide }: InsightsScreenProps) {
  const t = useTranslations('insights')
  const format = useShopFormat(clock)
  const monthName = useMonthName()
  const empty = tables.money.length === 0 && tables.items.length === 0
  const figures = insightsFigures(tables)
  const none = t('panelEmpty')
  const cards = [
    { label: t('report.widgets.heldNow'), icon: Lock, value: figures.totals.heldNowCents },
    { label: t('report.widgets.toShop'), icon: ArrowDownToLine, value: figures.totals.toShopCents },
    { label: t('report.widgets.back'), icon: ArrowUpFromLine, value: figures.totals.backCents },
  ]
  return (
    <ShopFrame shopName={shopName} title={t('title')} description={t('lead')}>
      {!canDecide ? (
        <div className="surface max-w-3xl overflow-clip">
          <EmptyState
            icon={LockKeyhole}
            title={t('onlyDeciders')}
            body={t('onlyDecidersBody')}
            action={
              <Link href={shopRoutes.money} className={buttonVariants({ variant: 'outline' })}>
                {t('openMoney')}
                <ArrowRight aria-hidden="true" />
              </Link>
            }
          />
        </div>
      ) : empty ? (
        <div className="surface max-w-3xl overflow-clip">
          <EmptyState icon={ChartNoAxesCombined} title={t('emptyTitle')} body={t('empty')} />
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 md:gap-5">
          <dl className="grid stagger min-w-0 gap-3 md:grid-cols-3">
            {cards.map((card) => <StatCard key={card.label} icon={card.icon} label={card.label} value={format.money(card.value)} />)}
          </dl>
          <div className="grid min-w-0 gap-4 md:gap-5 lg:grid-cols-2">
            <Panel title={t('report.widgets.byMonth')}>
              <BarPairs rows={figures.byMonth.map((month) => ({ key: month.month, label: monthName(month.month), first: month.toShopCents, second: month.backCents }))} firstLabel={t('report.measures.toShop')} secondLabel={t('report.measures.backToRenters')} money={format.money} empty={none} />
            </Panel>
            <Panel title={t('report.widgets.byType')}>
              <BarPairs rows={figures.byType.map((type) => ({ key: type.type, label: type.type, first: type.pricedCents, second: type.recoveredCents }))} firstLabel={t('report.measures.damagePriced')} secondLabel={t('report.measures.recovered')} money={format.money} empty={none} />
            </Panel>
            <Panel title={t('report.widgets.trust')}>
              <BarPairs rows={figures.byRung.map((rung) => ({ key: rung.rung, label: rung.rung, first: rung.reservedCents, second: rung.ordinaryCents }))} firstLabel={t('report.measures.holdReserved')} secondLabel={t('report.measures.holdOrdinary')} money={format.money} empty={none} />
            </Panel>
            <Panel title={t('report.widgets.life')}>
              <HoldLives lives={figures.lives} leftOut={figures.livesLeftOut} money={format.money} empty={none} />
            </Panel>
            <Panel title={t('report.widgets.waterfall')}>
              <SettlementWaterfall waterfall={figures.waterfall} money={format.money} empty={none} />
            </Panel>
          </div>
          <Panel title={t('report.widgets.items')}>
            {tables.items.length === 0 ? <p className="px-4 py-4 text-muted-foreground md:px-5">{none}</p> : <ItemsTable items={tables.items} money={format.money} />}
          </Panel>
        </div>
      )}
    </ShopFrame>
  )
}
