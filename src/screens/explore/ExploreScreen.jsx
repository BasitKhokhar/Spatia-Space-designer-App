import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import EmptyState from '@/components/feedback/EmptyState';
import NotEnoughCreditsModal from '@/components/feedback/NotEnoughCreditsModal';
import CategoryRail from '@/components/design/CategoryRail';
import TabPills from '@/components/design/TabPills';
import DesignCard from '@/components/design/DesignCard';
import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useDesignCatalog } from '@/hooks/useDesignCatalog';
import { useOpenDesign } from '@/hooks/useOpenDesign';
import { ROUTES } from '@/navigation/routes';
import { useTabPadding } from '@/store/useAdLayout';

// Explore is the browsable face of the premade-design catalog — the same data
// the "Try Our Creative Designs" flow walks through, but flattened into one
// screen: pick a category on the rail, see its designs underneath. Opening one
// creates an editable project, exactly as it does in the guided flow.
export default function ExploreScreen({ navigation }) {
  const { colors, radius } = useTheme();
  // Extends past the floating tab bar, plus the banner's height when one is
  // showing (0 otherwise, so the layout is unchanged without ads).
  const tabPadding = useTabPadding(120);
  const balance = useCreditsStore((s) => s.balance);
  const { categories, templates, countByCategory, tabsFor, templatesFor, hydrate } =
    useDesignCatalog();
  const { isLocked, openDesign, openingId, blocked, dismissBlocked } = useOpenDesign(navigation);

  const [categoryKey, setCategoryKey] = useState(null);
  const [tabKey, setTabKey] = useState(null);

  // Default to the first category as soon as the catalog lands.
  useEffect(() => {
    if (categories.length && !categories.some((c) => c.key === categoryKey)) {
      setCategoryKey(categories[0].key);
    }
  }, [categories, categoryKey]);

  const catTabs = useMemo(() => tabsFor(categoryKey), [tabsFor, categoryKey]);

  // Reset to the first story tab whenever the category (and so the tab set) changes.
  useEffect(() => {
    if (catTabs.length && !catTabs.some((t) => t.key === tabKey)) setTabKey(catTabs[0].key);
    if (!catTabs.length && tabKey !== null) setTabKey(null);
  }, [catTabs, tabKey]);

  const shown = useMemo(
    () => templatesFor(categoryKey, catTabs.length > 1 ? tabKey : null),
    [templatesFor, categoryKey, catTabs.length, tabKey]
  );

  const category = categories.find((c) => c.key === categoryKey);
  const [featured, ...rest] = shown;

  // Nothing cached and nothing fetched yet — the only real dead end here.
  if (!templates.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text variant="h2">Explore</Text>
        </View>
        <EmptyState
          title="Designs are on their way"
          message="We couldn't load the ready-made designs. Check your connection and try again."
          actionTitle="Try again"
          actionIcon="redo"
          onAction={hydrate}
          illustration={<Icon name="grid" size={80} color={colors.line} strokeWidth={1.4} />}
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabPadding }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="h2">Explore</Text>
              <Text variant="body" color="ink2" style={{ marginTop: 6 }}>
                Ready-made designs — open one and make it yours.
              </Text>
            </View>
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.lineSoft,
              }}
            >
              <Text variant="titleSm" color="accent">
                {templates.length}
              </Text>
              <Text variant="label" color="ink3" style={{ fontSize: 11 }}>
                designs
              </Text>
            </View>
          </View>
        </View>

        {/* Step 1 — category */}
        <CategoryRail
          categories={categories}
          activeKey={categoryKey}
          onSelect={setCategoryKey}
          counts={countByCategory}
          style={{ marginTop: 20 }}
        />

        {/* Step 2 — storeys, when the category has more than one */}
        {catTabs.length > 1 ? (
          <TabPills tabs={catTabs} activeKey={tabKey} onSelect={setTabKey} style={{ marginTop: 14 }} />
        ) : null}

        {/* Step 3 — the designs themselves */}
        {shown.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            message={`We're still drawing ${category?.name?.toLowerCase() || 'these'} designs. Try another category — or start from a blank canvas.`}
            actionTitle="Start from blank"
            actionIcon="plus"
            onAction={() => navigation.navigate(ROUTES.newProject)}
            illustration={<Icon name="square" size={72} color={colors.line} strokeWidth={1.4} />}
            style={{ marginTop: 30 }}
          />
        ) : (
          <>
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
              <Text variant="title">{category?.name || 'Designs'}</Text>
              <Text variant="bodySm" color="ink3" style={{ marginTop: 2 }}>
                {category?.blurb ? `${category.blurb} · ` : ''}
                {shown.length} {shown.length === 1 ? 'design' : 'designs'}
              </Text>
            </View>

            {/* The first design gets the wide card — a category should open with
                something worth looking at, not a wall of thumbnails. */}
            <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
              <DesignCard
                template={featured}
                locked={isLocked(featured)}
                busy={openingId === featured.id}
                previewHeight={186}
                onPress={() => openDesign(featured)}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                marginTop: 14,
                rowGap: 14,
              }}
            >
              {rest.map((t) => (
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
          </>
        )}

        {/* Always an exit into a blank canvas — browsing shouldn't be the only
            way out of this tab. */}
        <Pressable
          onPress={() => navigation.navigate(ROUTES.newProject)}
          style={{
            marginHorizontal: 24,
            marginTop: 24,
            padding: 18,
            borderRadius: radius.xl,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.line,
            backgroundColor: colors.surface2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.md,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="plus" size={22} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSm">Start from scratch</Text>
            <Text variant="bodySm" color="ink3" style={{ marginTop: 2 }}>
              Draw your own walls, rooms and furniture.
            </Text>
          </View>
          <Icon name="arrow-right" size={18} color={colors.ink3} />
        </Pressable>
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
    </SafeAreaView>
  );
}
