import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import Skeleton from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/useTheme';
import { fetchFaqs } from '@/services/api/contentApi';

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text variant="bodySm" style={{ fontWeight: '700', flex: 1 }}>
          {item.question}
        </Text>
        <Text style={{ color: open ? colors.accent : colors.ink3, fontWeight: '800', fontSize: 18 }}>
          {open ? '−' : '+'}
        </Text>
      </View>
      {open ? (
        <Text variant="bodySm" color="ink2" style={{ marginTop: 10, lineHeight: 20 }}>
          {item.answer}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FaqSkeletonRow() {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radius.md,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Skeleton height={15} style={{ flex: 1, maxWidth: '80%' }} />
      <Skeleton width={14} height={14} radius={4} />
    </View>
  );
}

export default function FaqsScreen({ navigation }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetchFaqs()
      .then((data) => {
        if (!alive) return;
        setFaqs([...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Screen>
      <HeaderBar title="FAQs" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>
        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <FaqSkeletonRow key={i} />
            ))}
          </View>
        ) : failed ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Icon name="warning" size={22} />
            <Text variant="bodySm" color="ink3" align="center">
              Couldn't load FAQs. Check your connection and try again.
            </Text>
          </View>
        ) : faqs.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text variant="bodySm" color="ink3">
              No FAQs yet.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {faqs.map((item, i) => (
              <FaqItem key={item.id ?? i} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
