import { useState } from 'react';
import { View } from 'react-native';
import { useFormatter, useTranslations } from 'use-intl';
import { READING_LIMITS } from '@hold/domain';
import { Button, ChoiceList, Field, Text } from '@/components/ui';
import { ActionFailure, useRenterAction } from '@/features/renter-common';
import type { SelfReturn } from './return-screen';

type Item = SelfReturn['items'][number];
type Reading = NonNullable<Item['reading']>;

const EIGHTHS = Array.from({ length: READING_LIMITS.fuelEighths + 1 }, (_, eighths) => String(eighths));
const WHOLE = /^\d{1,7}$/;

// A vehicle's dashboard, read by its renter where they left it: the kilometres on the odometer and the fuel in the
// tank, in eighths (vehicle-plan.md step 3). Hold checks the figures and keeps them until the return is sent, when
// they are sealed with the photographs. Entered again before sending, they replace the ones before.
export function ReturnReading({ token, item, refresh }: { token: string; item: Item; refresh: () => void }) {
  const t = useTranslations('selfReturn.reading');
  const words = useTranslations('shop.readings');
  const format = useFormatter();
  const save = useRenterAction(token, 'save-self-return-reading');
  const [odometer, setOdometer] = useState(item.reading === null ? '' : String(item.reading.odometerKm));
  const [fuel, setFuel] = useState(item.reading === null ? undefined : String(item.reading.fuelEighths));
  const said = (read: Reading) => words('read', { km: format.number(read.odometerKm), fuel: words('fuel', { eighths: read.fuelEighths }) });
  const level = (eighths: number) => (eighths === 0 ? words('fuelEmpty') : eighths === READING_LIMITS.fuelEighths ? words('fuelFull') : words('fuelPart', { eighths }));
  const submit = async () => {
    if ((await save.run({ sessionId: item.sessionId, odometerKm: Number(odometer), fuelEighths: Number(fuel) }))?.ok) refresh();
  };
  return (
    <View className="gap-3">
      <Text variant="heading" role="heading">
        {t('title')}
      </Text>
      <Text tone="muted">{t('lead')}</Text>
      {item.handoverReading === null ? null : <Text tone="muted">{t('atHandover', { reading: said(item.handoverReading) })}</Text>}
      {item.reading === null ? null : <Text variant="bodyStrong">{t('read', { reading: said(item.reading) })}</Text>}
      <Field label={words('odometer')} value={odometer} onChangeText={setOdometer} keyboardType="number-pad" inputMode="numeric" maxLength={7} />
      <ChoiceList label={words('fuelLabel')} choices={EIGHTHS.map((eighths) => ({ value: eighths, label: level(Number(eighths)) }))} value={fuel} onChange={setFuel} />
      <ActionFailure failed={save.failed} />
      <Button variant={item.reading === null ? 'primary' : 'secondary'} label={words('save')} onPress={() => void submit()} loading={save.pending} disabled={!WHOLE.test(odometer) || fuel === undefined} />
    </View>
  );
}
