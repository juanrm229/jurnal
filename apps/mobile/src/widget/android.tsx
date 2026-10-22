/** Widget Android digambar dengan komponen react-native-android-widget. */
import { doodleToSvg, getDoodle, INK, PAPER } from '@sehari/doodles';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from './snapshot';

const SOFT = '#A9A4E8';
const CARD = '#EEEEF0';

export function renderSehariWidget(s: WidgetSnapshot | null, variant: 'small' | 'garden' = 'small') {
  if (!s) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: CARD, borderRadius: 24, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <SvgWidget svg={doodleToSvg(getDoodle('tunas'), { color: INK, size: 64 })} style={{ height: 56, width: 56 }} />
        <TextWidget text="buka Sehari" style={{ fontSize: 12, color: SOFT, fontFamily: 'monospace' }} />
      </FlexWidget>
    );
  }
  if (variant === 'garden') {
    const dots = s.garden.split('').slice(0, 366);
    const rows: string[][] = [];
    for (let i = 0; i < dots.length; i += 26) rows.push(dots.slice(i, i + 26));
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: CARD, borderRadius: 24, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          {rows.map((r, i) => (
            <TextWidget key={i} text={r.map((x) => (x === '1' ? '✿' : '·')).join('')} style={{ fontSize: 9, color: INK, fontFamily: 'monospace', letterSpacing: 0.12 }} />
          ))}
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
          <TextWidget text={String(s.year)} style={{ fontSize: 13, color: INK, fontFamily: 'monospace' }} />
          <TextWidget text={`${s.daysLeft} hari untuk tumbuh`} style={{ fontSize: 12, color: SOFT, fontFamily: 'monospace' }} />
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: CARD, borderRadius: 24, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <TextWidget text={s.circleName ? `api ${s.streak}` : ''} style={{ fontSize: 11, color: INK, fontFamily: 'monospace' }} />
        <TextWidget text={`#${s.dayOfYear}`} style={{ fontSize: 11, color: SOFT, fontFamily: 'monospace' }} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', alignItems: 'center' }}>
        <SvgWidget svg={doodleToSvg(getDoodle(s.sealedToday ? s.doodle : 'penyiram'), { color: INK, size: 96, strokeWidth: 2.6 })} style={{ height: 72, width: 72 }} />
      </FlexWidget>
      <TextWidget text={s.status} maxLines={2} style={{ fontSize: 11, color: '#16161A', fontFamily: 'monospace' }} />
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <TextWidget text={s.dayLabel} style={{ fontSize: 12, color: INK, fontFamily: 'monospace' }} />
        <TextWidget text={s.dateLabel} style={{ fontSize: 12, color: SOFT, fontFamily: 'monospace' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

export const WIDGET_PAPER = PAPER;
