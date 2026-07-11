import { useState } from 'react';
import { Linking, View, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { FAQS } from '@/data/faqs';
import { LINKS } from '@/constants/links';

function FaqItem({ item, open, onToggle }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        backgroundColor: open ? colors.accentTintBg : colors.surface,
        borderWidth: open ? 1.5 : 1,
        borderColor: open ? colors.accent : colors.lineSoft,
        borderRadius: radius.md,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="bodySm" style={{ fontWeight: '700', flex: 1 }}>
          {item.q}
        </Text>
        <Text style={{ color: open ? colors.accent : colors.ink3, fontWeight: '800', fontSize: 18 }}>
          {open ? '−' : '+'}
        </Text>
      </View>
      {open ? (
        <Text variant="bodySm" color="ink2" style={{ marginTop: 10, lineHeight: 20 }}>
          {item.a}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function HelpSupportScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const [openIndex, setOpenIndex] = useState(0);
  const [query, setQuery] = useState('');

  return (
    <Screen>
      <HeaderBar title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Input icon="search" placeholder="Search help topics" value={query} onChangeText={setQuery} style={{ marginTop: 8 }} />

        <Pressable onPress={() => Linking.openURL(LINKS.support)} style={{ marginTop: 22 }}>
          <LinearGradient
            colors={['#1B1A17', '#2E2A24']}
            style={{ borderRadius: radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bell" size={24} color="#fff" strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 16 }}>Contact Us</Text>
              <Text style={{ color: '#ADA79B', fontSize: 13, marginTop: 2 }}>We usually reply within a day</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#ADA79B" strokeWidth={2} />
          </LinearGradient>
        </Pressable>

        <Text variant="titleSm" style={{ marginTop: 26, marginBottom: 14 }}>
          Frequently asked
        </Text>
        <View style={{ gap: 10 }}>
          {FAQS.map((item, i) => (
            <FaqItem key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
