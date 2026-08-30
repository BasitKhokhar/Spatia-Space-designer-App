import { useMemo, useRef, useState } from 'react';
import { Linking, View, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import ReportContentSheet from '@/components/sheets/ReportContentSheet';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
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

  // Reporting AI content, reachable at any time.
  //
  // The sheet right after generation is the fast path, but it is gone once
  // dismissed — and Play's policy expects a reporting route that exists for
  // any AI design, not only the one just made. This is that route.
  const projects = useProjectsStore((s) => s.projects);
  const aiProjects = useMemo(
    () =>
      projects
        .filter((p) => p.source === 'ai')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [projects]
  );
  const [reporting, setReporting] = useState(null);
  const [pickingReport, setPickingReport] = useState(false);
  const reportSheetRef = useRef(null);

  const startReport = (project) => {
    setReporting(project);
    setPickingReport(false);
    setTimeout(() => reportSheetRef.current?.present(), 60);
  };

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

        {/* Report AI content */}
        <Pressable
          onPress={() => setPickingReport((v) => !v)}
          style={({ pressed }) => ({
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="warning" size={21} color={colors.accent} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSm">Report AI content</Text>
            <Text variant="bodySm" color="ink3" style={{ marginTop: 2 }}>
              {aiProjects.length
                ? 'Flag an AI-generated design for review'
                : 'You have no AI-generated designs yet'}
            </Text>
          </View>
          <Icon
            name={pickingReport ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.ink3}
            strokeWidth={2}
          />
        </Pressable>

        {pickingReport ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            {aiProjects.length ? (
              aiProjects.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => startReport(p)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 13,
                    paddingHorizontal: 15,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface2,
                    borderWidth: 1,
                    borderColor: colors.lineSoft,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 9,
                      backgroundColor: colors.accent,
                    }}
                  >
                    <Text style={{ color: colors.onAccent, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 }}>
                      AI
                    </Text>
                  </View>
                  <Text variant="bodySm" style={{ flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Icon name="chevron-right" size={15} color={colors.ink3} strokeWidth={2} />
                </Pressable>
              ))
            ) : (
              <Text variant="bodySm" color="ink3" style={{ paddingHorizontal: 4, lineHeight: 20 }}>
                Designs you create with AI show up here so you can report them. You can also report a
                design straight from the summary that appears after it is generated.
              </Text>
            )}
          </View>
        ) : null}

        <Text variant="titleSm" style={{ marginTop: 26, marginBottom: 14 }}>
          Frequently asked
        </Text>
        <View style={{ gap: 10 }}>
          {FAQS.map((item, i) => (
            <FaqItem key={item.q} item={item} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />
          ))}
        </View>
      </ScrollView>

      <ReportContentSheet
        ref={reportSheetRef}
        project={reporting}
        onClose={() => setReporting(null)}
      />
    </Screen>
  );
}
