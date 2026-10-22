import React from 'react';
import {View, Text, TouchableOpacity, Image, Alert} from 'react-native';
import type {Asset} from 'react-native-image-picker';
import RNPrint from 'react-native-print';
import {Field, Choice, Button, Section} from '../components/Form';
import {useApp} from '../context/AppContext';
import {categories, htmlFor} from '../report';
import {s} from '../styles';
export default function ProductionScreen() {
  const {d, set, addMedia, busy, send} = useApp();
  return (<View style={s.grid}>
            <Section title="Üretim Bilgileri">
              <Choice
                label="Üretim Aşaması"
                value={d.stage}
                items={[
                  'Kesim',
                  'Dikim',
                  'Ütü',
                  'Paketleme',
                  'Final',
                  'Düzeltme',
                ]}
                onChange={(v: any) => set('stage', v)}
              />
              <Field
                label="Renk"
                value={d.color}
                onChangeText={(v: any) => set('color', v)}
              />
              {[
                ['shipment', 'Sevk Adedi (N)'],
                ['sample', 'Kontrol Adedi (n)'],
                ['accepted', 'Kabul Edilen Hata (c)'],
                ['defective', 'Hatalı Mal Birimi (i)'],
              ].map(([k, l]) => (
                <Field
                  key={k}
                  label={l}
                  value={d[k]}
                  keyboardType="numeric"
                  onChangeText={(v: any) => set(k, v)}
                />
              ))}
            </Section>
            <Section title="Diğer Kontroller">
              <Choice
                label="Kontrol Evrakları"
                value={d.documents}
                items={['Tamam', 'Eksik']}
                onChange={(v: any) => set('documents', v)}
              />
              <Choice
                label="Beden Seti Raporundaki Hatalar"
                value={d.body}
                items={['Giderilmiştir', 'Giderilmemiştir']}
                onChange={(v: any) => set('body', v)}
              />
              <Choice
                label="Laboratuvar Kontrolü"
                value={d.laboratory}
                items={['O.K.', 'Ön görülmedi', 'Ön görüldü']}
                onChange={(v: any) => set('laboratory', v)}
              />
            </Section>
          </View>);
}
