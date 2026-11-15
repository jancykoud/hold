import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';
import { DROP_POINT_VIEW } from '@hold/domain';
import { Button, Notice, Screen, Text } from '@/components/ui';
import { ActionFailure, CaptureSheet, useRenterAction, ViewChecklist } from '@/features/renter-common';
import { ReturnReading } from './return-reading';
import type { SelfReturn } from './return-screen';
import { useReturnUpload } from './use-return-upload';

type Item = SelfReturn['items'][number];

// Each item's views with its handover photograph behind the camera, then where it was left. Hold refuses a photograph
// that repeats earlier evidence, so the renter learns at the drop point, not the next morning.
export function ReturnCapture({ token, view, top, refresh }: { token: string; view: SelfReturn; top: ReactNode; refresh: () => void }) {
  const t = useTranslations('selfReturn');
  const send = useRenterAction(token, 'send-self-return');
  const missing = view.items.reduce((count, item) => count + item.missing.length, 0);
  // A vehicle's dashboard is read before its return is sent.
  const unread = view.items.some((item) => item.takesReadings && item.reading === null);
  const ready = missing === 0 && !unread;
  const submit = async () => {
    if ((await send.run({}))?.ok) refresh();
  };
  return (
    <Screen
      footer={
        <>
          <Text variant={ready ? 'bodyStrong' : 'body'} tone={ready ? 'default' : 'muted'}>
            {missing > 0 ? t('send.missing', { count: missing }) : unread ? t('send.unread') : t('send.ready')}
          </Text>
          <ActionFailure failed={send.failed} />
          <Button label={t('send.button')} icon="send" onPress={() => void submit()} loading={send.pending} disabled={!ready} />
        </>
      }
    >
      {top}
      <View className="gap-2">
        <Text variant="title" role="heading">
          {t('capture.title')}
        </Text>
        <Text tone="muted">{t('capture.guidance')}</Text>
      </View>
      {view.items.some((item) => item.photos.some((photo) => photo.simulated)) ? <Notice title={t('capture.sampleTitle')} body={t('capture.sampleBody')} /> : null}
      {view.items.map((item) => (
        <ItemCapture key={item.sessionId} token={token} item={item} showLabel={view.items.length > 1} refresh={refresh} />
      ))}
    </Screen>
  );
}

function ItemCapture({ token, item, showLabel, refresh }: { token: string; item: Item; showLabel: boolean; refresh: () => void }) {
  const t = useTranslations('selfReturn.capture');
  const upload = useReturnUpload(token, item.sessionId);
  const [taking, setTaking] = useState<string | undefined>(undefined);
  const labelOf = (key: string, label: string) => (key === DROP_POINT_VIEW ? t('dropPointView') : label);
  const target = item.views.find((each) => each.key === taking);
  return (
    <View className="gap-3">
      {showLabel ? (
        <Text variant="heading" role="heading">
          {item.label}
        </Text>
      ) : null}
      <ViewChecklist
        views={item.views.map((each) => ({ key: each.key, label: labelOf(each.key, each.label), required: true, photo: item.photos.find((photo) => photo.view === each.key) }))}
        onTake={setTaking}
      />
      <CaptureSheet
        target={
          target === undefined
            ? undefined
            : target.key === DROP_POINT_VIEW
              ? { view: target.key, label: t('dropPointView'), hint: t('dropPointGuidance') }
              : { view: target.key, label: target.label, guide: item.guides[target.key] }
        }
        upload={upload}
        onTaken={() => {
          setTaking(undefined);
          refresh();
        }}
        onClose={() => setTaking(undefined)}
      />
      {item.takesReadings ? <ReturnReading token={token} item={item} refresh={refresh} /> : null}
    </View>
  );
}
