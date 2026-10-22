import { type City, getCity, searchCities, zoneLabel } from '@sehari/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Field, Row, Txt } from './kit';
import { Doodle } from './Doodle';
import { useTheme } from './theme';

export function CityPicker({ value, onChange, label = 'kota' }: { value: string | null; onChange: (c: City) => void; label?: string }) {
  const { c } = useTheme();
  const current = getCity(value);
  const [q, setQ] = useState('');
  const results = searchCities(q, q ? 8 : 6);
  return (
    <View style={{ gap: 8 }}>
      <Field label={label} value={q} onChangeText={setQ} placeholder={current ? `${current.name} · ${zoneLabel(current.tz)}` : 'Cari kota…'} autoCorrect={false} testID="city-search" />
      <View style={{ gap: 2 }}>
        {results.map((city) => (
          <Pressable
            key={city.id}
            testID={`city-${city.id}`}
            onPress={() => {
              onChange(city);
              setQ('');
            }}
            style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                {city.id === value ? <Doodle id="ui-centang" size={18} /> : <View style={{ width: 18 }} />}
                <Txt v="small">{city.name}</Txt>
                <Txt v="tiny" soft>
                  {city.province}
                </Txt>
              </Row>
              <Txt v="tiny" ink soft>
                {zoneLabel(city.tz)}
              </Txt>
            </Row>
          </Pressable>
        ))}
      </View>
      {current ? (
        <View style={{ backgroundColor: c.pill, borderRadius: 12, padding: 10 }}>
          <Txt v="small" ink>
            {current.name} · {zoneLabel(current.tz)}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
