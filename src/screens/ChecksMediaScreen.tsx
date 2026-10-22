import React from 'react';
import {View, Text, TouchableOpacity, Image, Alert} from 'react-native';
import type {Asset} from 'react-native-image-picker';
import RNPrint from 'react-native-print';
import {Field, Choice, Button, Section} from '../components/Form';
import {useApp} from '../context/AppContext';
import {categories, htmlFor} from '../report';
import {s} from '../styles';
export default function ChecksMediaScreen() {
  const {d, set, addMedia, busy, send} = useApp();
  return (<View style={s.grid}>
            <Section title="Hatalar / Uyarılar">
              {categories.map(c => (
                <View key={c} style={s.check}>
                  <Text style={s.label}>{c}</Text>
                  <Choice
                    label="Durum"
                    value={d.checks[c]?.status}
                    items={['O.K.', 'Hata', 'Kontrol Yok']}
                    onChange={(v: any) =>
                      set('checks', {
                        ...d.checks,
                        [c]: {...d.checks[c], status: v},
                      })
                    }
                  />
                  <Field
                    label="Hata / Uyarı Açıklaması"
                    value={d.checks[c]?.note}
                    onChangeText={(v: any) =>
                      set('checks', {
                        ...d.checks,
                        [c]: {...d.checks[c], note: v},
                      })
                    }
                  />
                </View>
              ))}
            </Section>
            <Section title="Fotoğraf ve Video Ekle">
              <View style={s.actions}>
                <Button
                  title="Fotoğraf Çek"
                  outline
                  onPress={() => addMedia(true, false)}
                />
                <Button
                  title="Galeriden Seç"
                  outline
                  onPress={() => addMedia(false, false)}
                />
                <Button
                  title="Video Çek"
                  outline
                  onPress={() => addMedia(true, true)}
                />
                <Button
                  title="Video Seç"
                  outline
                  onPress={() => addMedia(false, true)}
                />
              </View>
              <Text style={s.muted}>{d.media.length} dosya eklendi</Text>
              <View style={s.actions}>
                {d.media.map((a: Asset, i: number) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() =>
                      set(
                        'media',
                        d.media.filter((_: any, j: number) => i !== j),
                      )
                    }>
                    <View style={s.thumb}>
                      {a.type?.startsWith('image') && a.uri ? (
                        <Image source={{uri: a.uri}} style={s.image} />
                      ) : (
                        <Text>🎬 Video</Text>
                      )}
                    </View>
                    <Text style={s.muted}>Kaldır ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Section>
          </View>);
}
