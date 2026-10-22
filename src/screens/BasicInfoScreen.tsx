import React from 'react';
import {View, Text, TouchableOpacity, Image, Alert} from 'react-native';
import type {Asset} from 'react-native-image-picker';
import RNPrint from 'react-native-print';
import {Field, Choice, Button, Section} from '../components/Form';
import {useApp} from '../context/AppContext';
import {categories, htmlFor} from '../report';
import {s} from '../styles';
export default function BasicInfoScreen() {
  const {d, set, addMedia, busy, send} = useApp();
  return (<View style={s.grid}>
            <Section title="Genel Bilgiler">
              <Field
                label="Kontrol Tarihi"
                value={d.date}
                onChangeText={(v: any) => set('date', v)}
              />
              <Field
                label="Sipariş Ofisi"
                value={d.office}
                onChangeText={(v: any) => set('office', v)}
              />
              <Choice
                label="Atölye"
                value={d.workshop}
                items={['ÖZATAD TEKSTİL', 'Diğer']}
                onChange={(v: any) => set('workshop', v)}
              />
              <Field
                label="Sipariş No"
                value={d.order}
                onChangeText={(v: any) => set('order', v)}
              />
            </Section>
            <Section title="Müşteri ve Ürün Bilgileri">
              <Choice
                label="Müşteri"
                value={d.customer}
                items={[
                  'GÜMELANGE',
                  'LC WAIKIKI',
                  'KOTON',
                  'MAVİ',
                  'ZARA',
                  'TRENDYOL',
                ]}
                onChange={(v: any) => set('customer', v)}
              />
              <Field
                label="Dept. No"
                value={d.department}
                onChangeText={(v: any) => set('department', v)}
              />
              <Field
                label="Artikel No / Tanımı"
                value={d.article}
                onChangeText={(v: any) => set('article', v)}
              />
            </Section>
            <Section title="Kontrol Bilgileri">
              <Choice
                label="Kontrol Sebebi"
                value={d.reason}
                items={['Ara Kontrol', 'Son Kontrol', 'Karşılıksız']}
                onChange={(v: any) => set('reason', v)}
              />
              <Choice
                label="Kontrol Kapsamı"
                value={d.scope}
                items={['Normal', 'Azaltılmış', 'Arttırılmış']}
                onChange={(v: any) => set('scope', v)}
              />
              <Field
                label="AQL"
                value={d.aql}
                onChangeText={(v: any) => set('aql', v)}
              />
            </Section>
          </View>);
}
