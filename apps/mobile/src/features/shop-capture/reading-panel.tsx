import { useState } from 'react';
import { View } from 'react-native';
import { useFormatter, useTranslations } from 'use-intl';
import { READING_LIMITS } from '@hold/domain';
import type { CaptureSessionView } from '@hold/mobile-api';
import { Button, ChoiceList, Field, Notice, Text } from '@/components/ui';
import { RefusalNotice } from '@/features/shop-session/refusal';
import { useStaffAction } from '@/features/shop-session/use-staff-action';

type Reading = NonNullable<CaptureSessionView['reading']>;

const EIGHTHS = Array.from({ length: READING_LIMITS.fuelEighths + 1 }, (_, eighths) => String(eighths));
const WHOLE = /^\d{1,7}$/;

// A vehicle's dashboard, read by a person: the kilometres on the odometer and the fuel in the tank, in eighths
// (vehicle-plan.md step 3). Shown only for an item that is driven. Hold checks the figures and keeps them; once the
// photographs are sealed the reading is sealed with them and only read.
export function ReadingPanel({ session, onSaved }: { session: CaptureSessionView; onSaved: () => void }) {
  const t = useTranslations('shop.readings');
  const format = useFormatter();
  const { act, pending, refusal } = useStaffAction();
  const [odometer, setOdometer] = useState(session.reading === null ? '' : String(session.reading.odometerKm));
  const [fuel, setFuel] = useState(session.reading === null ? undefined : String(session.reading.fuelEighths));
  const [saved, setSaved] = useState(false);
  const words = (read: Reading) => t('read', { km: format.number(read.odometerKm), fuel: t('fuel', { eighths: read.fuelEighths }) });
  // A tank's level as a choice: empty, full, or so many eighths.
  const level = (eighths: number) => (eighths === 0 ? t('fuelEmpty') : eighths === READING_LIMITS.fuelEighths ? t('fuelFull') : t('fuelPart', { eighths }));
  const save = async () => {
    setSaved(false);
    const input = { sessionId: session.id, odometerKm: Number(odometer), fuelEighths: Number(fuel) };
    const answer = session.kind === 'handover' ? await act('record-handover-reading', input) : await act('record-return-reading', input);
    if (!answer.ok) return;
    setSaved(true);
    onSaved();
  };
  return (
    <View className="gap-3">
      <Text variant="heading" role="heading">
        {t('title')}
      </Text>
      {session.handoverReading === null ? null : <Text tone="muted">{t('atHandover', { reading: words(session.handoverReading) })}</Text>}
      {session.sealed || !session.canAct ? (
        <Text variant="bodyStrong">{session.reading === null ? t('none') : words(session.reading)}</Text>
      ) : (
        <View className="gap-4">
          <Text tone="muted">{t('lead')}</Text>
          <Field label={t('odometer')} value={odometer} onChangeText={setOdometer} keyboardType="number-pad" inputMode="numeric" maxLength={7} />
          <ChoiceList label={t('fuelLabel')} choices={EIGHTHS.map((eighths) => ({ value: eighths, label: level(Number(eighths)) }))} value={fuel} onChange={setFuel} />
          {refusal ? <RefusalNotice refusal={refusal} /> : null}
          {saved ? <Notice tone="success" announced title={t('saved')} body={words({ odometerKm: Number(odometer), fuelEighths: Number(fuel) })} /> : null}
          <Button variant={session.reading === null ? 'primary' : 'secondary'} label={t('save')} onPress={() => void save()} loading={pending !== undefined} disabled={!WHOLE.test(odometer) || fuel === undefined} />
        </View>
      )}
    </View>
  );
}
