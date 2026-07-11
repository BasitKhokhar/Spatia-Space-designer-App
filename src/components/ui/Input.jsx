import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Icon from '@/components/icons/Icon';

// Labeled text field with optional leading icon and password toggle.
export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  style,
}) {
  const { colors, radius, fonts } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={style}>
      {label ? (
        <Text variant="label" color="ink2" style={{ marginBottom: 8, marginLeft: 2 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          height: 54,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: focused ? 1.5 : 1,
          borderColor: focused ? colors.accent : colors.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={focused ? colors.accent : colors.ink3} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Icon name="eye" size={20} color={colors.ink3} strokeWidth={1.6} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
