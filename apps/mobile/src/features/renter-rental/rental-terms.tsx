import { View } from 'react-native';
import { useTranslations } from 'use-intl';
import type { RenterView } from '@hold/mobile-api';
import { MoneyText, Panel, Text } from '@/components/ui';

type Rental = RenterView<'rental'>['view'];

// The shop's damage prices and its wear policy, as the renter agreed to them: a claim can only be for what is listed.
export function RentalTerms({ view }: { view: Rental }) {
  const t = useTranslations('rental');
  const types = useTranslations('damageTypes');
  return (
    <>
      <Panel title={t('prices')}>
        <Text variant="small" tone="muted" className="px-4 py-3">
          {t('pricesLead')}
        </Text>
        {view.prices.map((price) => (
          <View key={price.description} className="flex-row items-baseline justify-between gap-4 border-t border-border px-4 py-3">
            <View className="min-w-0 flex-1 gap-0.5">
              <Text>{price.description}</Text>
              {price.damageType === null ? null : (
                <Text variant="small" tone="muted">
                  {types(price.damageType)}
                </Text>
              )}
            </View>
            <MoneyText money={{ cents: price.amountCents, currency: view.currency }} />
          </View>
        ))}
      </Panel>
      <Panel title={t('wear')}>
        <Text variant="small" tone="muted" className="px-4 pt-3">
          {t('wearLead')}
        </Text>
        <Text selectable className="px-4 pb-4 pt-2">
          {view.wearPolicy}
        </Text>
      </Panel>
    </>
  );
}
