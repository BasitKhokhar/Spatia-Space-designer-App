import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import EmptyState from '@/components/feedback/EmptyState';
import NotEnoughCreditsModal from '@/components/feedback/NotEnoughCreditsModal';
import TabPills from '@/components/design/TabPills';
import DesignCard from '@/components/design/DesignCard';
import { useTheme } from '@/theme/useTheme';
import { categoryById } from '@/data/categories';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useDesignCatalog } from '@/hooks/useDesignCatalog';
import { useOpenDesign } from '@/hooks/useOpenDesign';
import { ROUTES } from '@/navigation/routes';

// Step 2 of "Try Our Creative Designs": browse premade designs for the chosen
// category. A story tab bar (Single / Double story, Ground … N floors) filters
// the grid — shown only when the category has more than one tab. Free designs
// open straight into the (editable) editor; premium designs unlock with credits
// first. All data is backend-driven and cached offline.
export default function StarterIdeasScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const categoryKey = route.params?.categoryId;

  const { categories, templatesFor, tabsFor } = useDesignCatalog();
  const balance = useCreditsStore((s) => s.balance);
  const { isLocked, openDesign, openingId, blocked, dismissBlocked } = useOpenDesign(navigation);

  const category = categories.find((c) => c.key === categoryKey) || categoryById(categoryKey);
  const categoryName = category?.name || 'Designs';

  const catTabs = useMemo(() => tabsFor(categoryKey), [tabsFor, categoryKey]);

  const [activeTab, setActiveTab] = useState(null);
  useEffect(() => {
    // Default to the first tab whenever the tab set changes.
    if (catTabs.length && !catTabs.some((t) => t.key === activeTab)) setActiveTab(catTabs[0].key);
  }, [catTabs, activeTab]);

  const shown = useMemo(
    () => templatesFor(categoryKey, activeTab),
    [templatesFor, categoryKey, activeTab]
  );

  const startCustom = () => navigation.navigate(ROUTES.roomType, { category: categoryKey });

  return (
    <Screen>
      <HeaderBar title={categoryName} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text variant="h2">Ready-made designs</Text>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            Open a design to edit it — or start from a blank canvas.
          </Text>
        </View>

        {catTabs.length > 1 ? (
          <TabPills tabs={catTabs} activeKey={activeTab} onSelect={setActiveTab} style={{ marginTop: 18 }} />
        ) : null}

        {shown.length ? (
          <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
            <Text variant="label" color="ink3">
              {shown.length} {shown.length === 1 ? 'DESIGN' : 'DESIGNS'}
            </Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 14,
              marginTop: 12,
            }}
          >
            {/* Custom / blank tile — always first, so "none of these" is never a
                dead end. */}
            <Pressable onPress={startCustom} style={{ width: '47.5%' }}>
              <View
                style={{
                  height: 118,
                  borderRadius: radius.lg,
                  borderWidth: 1.6,
                  borderStyle: 'dashed',
                  borderColor: colors.accent,
                  backgroundColor: colors.accentTintBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="plus" size={20} color="#fff" strokeWidth={2.4} />
                </View>
                <Text variant="label" color="accent">
                  Custom
                </Text>
              </View>
              <Text variant="titleSm" style={{ marginTop: 10 }}>
                Blank canvas
              </Text>
              <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
                Draw from scratch
              </Text>
            </Pressable>

            {shown.map((t) => (
              <DesignCard
                key={t.id}
                template={t}
                locked={isLocked(t)}
                busy={openingId === t.id}
                onPress={() => openDesign(t)}
                style={{ width: '47.5%' }}
              />
            ))}
          </View>
        </View>

        {shown.length === 0 ? (
          <EmptyState
            title="No designs yet"
            message={`We're still drawing ${categoryName.toLowerCase()} layouts. Start from a blank canvas and make the first one.`}
            illustration={<Icon name="square" size={72} color={colors.line} strokeWidth={1.4} />}
            style={{ marginTop: 10 }}
          />
        ) : null}
      </ScrollView>

      <NotEnoughCreditsModal
        visible={!!blocked}
        cost={blocked?.cost || 0}
        balance={balance}
        action="Unlocking this design"
        onGetCredits={() => {
          dismissBlocked();
          navigation.navigate(ROUTES.paywall);
        }}
        onEarnCredits={() => {
          dismissBlocked();
          navigation.navigate(ROUTES.earnCredits);
        }}
        onClose={dismissBlocked}
      />
    </Screen>
  );
}
