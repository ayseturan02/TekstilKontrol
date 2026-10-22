import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity} from 'react-native';
import {s} from '../styles';
export const Field = ({label, value, onChangeText, keyboardType = 'default', secureTextEntry = false, inputStyle, labelStyle, containerStyle, ...props}: any) => {
  const [focused, setFocused] = useState(false);
  return <View style={[s.field, containerStyle]}>
    <Text style={[s.label, labelStyle]}>{label}</Text>
    <TextInput {...props} style={[s.input, focused && s.inputFocused, inputStyle]} secureTextEntry={secureTextEntry}
      value={String(value ?? '')} onChangeText={onChangeText} keyboardType={keyboardType}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      accessibilityLabel={label} placeholder={label} placeholderTextColor="#9aa7b8" />
  </View>;
};
export const Choice = ({label, value, items, onChange}: any) => (
  <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <View style={s.choices} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {items.map((item: string) => <TouchableOpacity key={item} accessibilityRole="radio"
        accessibilityState={{checked: value === item}} onPress={() => onChange(item)}
        style={[s.choice, value === item && s.choiceSelected]}>
        <View style={[s.radio, value === item && s.radioSelected]}>{value === item && <View style={s.radioDot} />}</View>
        <Text style={[s.choiceText, value === item && s.choiceTextSelected]}>{item}</Text>
      </TouchableOpacity>)}
    </View>
  </View>
);
export const Button = ({title, onPress, outline = false, disabled = false, style, textStyle}: any) => (
  <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled}} activeOpacity={0.8}
    style={[s.button, outline && s.outline, disabled && s.disabled, style]} onPress={onPress} disabled={disabled}>
    <Text style={[s.buttonText, outline && s.outlineText, textStyle]}>{title}</Text>
  </TouchableOpacity>
);
export const Section = ({title, children}: any) => (
  <View style={s.card}><Text style={s.heading}>{title}</Text>{children}</View>
);
