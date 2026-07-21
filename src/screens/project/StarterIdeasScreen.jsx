import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, Image } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import TemplateThumbnail from '@/components/graphics/TemplateThumbnail';
import { useTheme } from '@/theme/useTheme';
import { categoryById } from '@/data/categories';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { useUnlocksStore } from '@/store/useUnlocksStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { unlockTemplate } from '@/services/api/templatesApi';
import { ROUTES } from '@/navigation/routes';

// Step 2 of "Try Our Creative Designs": browse premade designs for the chosen
// category. A story tab bar (Single / Double / Triple story, Ground … N floors)
// filters the grid — shown only when the category has more than one tab. Free
// designs open straight into the (editable) editor; premium designs unlock with
// credits first. All data is backend-driven and cached offline.
export default function StarterIdeasScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const categoryKey = route.params?.categoryId;

  const storeCategories = useTemplatesStore((s) => s.categories);
  const tabs = useTemplatesStore((s) => s.tabs);
  const templates = useTemplatesStore((s) => s.templates);
  const hydrate = useTemplatesStore((s) => s.hydrate);
  const isUnlocked = useUnlocksStore((s) => s.isUnlocked);
  const unlock = useUnlocksStore((s) => s.unlock);
  const createProject = useProjectsStore((s) => s.createProject);

  useEffect(() => {
    if (!templates.length) hydrate();
  }, [templates.length, hydrate]);

  const category =
    storeCategories.find((c) => c.key === categoryKey) || categoryById(categoryKey);
  const categoryName = category?.name || 'Designs';

  const catTabs = useMemo(
    () =>
      tabs
        .filter((t) => t.categoryKey === categoryKey)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [tabs, categoryKey]
  );

  const [activeTab, setActiveTab] = useState(null);
  useEffect(() => {
    // Default to the first tab whenever the tab set changes.
    if (catTabs.length && (activeTab === null || !catTabs.some((t) => t.key === activeTab))) {
      setActiveTab(catTabs[0].key);
    }
  }, [catTabs, activeTab]);

  const shown = useMemo(
    () =>
      templates
        .filter((t) => t.categoryKey === categoryKey && (!activeTab || t.tabKey === activeTab))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [templates, categoryKey, activeTab]
  );

  const isLocked = (t) => t.premium && (t.cost || 0) > 0 && !isUnlocked(t.id);

  const openTemplate = async (t) => {
    if (isLocked(t)) {
      try {
        await unlockTemplate(t.id);
        unlock(t.id);
      } catch {
        // Not enough credits (or offline) → send the user to earn/buy credits.
        navigation.navigate(ROUTES.earnCredits);
        return;
      }
    }
    createProject({ template: t });
    navigation.navigate(ROUTES.editor);
  };

  const startCustom = () => {
    navigation.navigate(ROUTES.roomType, { category: categoryKey });
  };

  const showTabBar = catTabs.length > 1;

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

        {/* Story tab bar */}
        {showTabBar ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10, marginTop: 18 }}
          >
            {catTabs.map((t) => {
              const active = t.key === activeTab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setActiveTab(t.key)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: radius.pill ?? 999,
                    borderWidth: 1.5,
                    borderColor: active ? colors.accent : colors.line,
                    backgroundColor: active ? colors.accent : colors.surface,
                  }}
                >
                  <Text variant="label" color={active ? 'onAccent' : 'ink2'}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 24 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 20,
              marginTop: 22,
            }}
          >
            {/* Custom / blank tile */}
            <Pressable onPress={startCustom} style={{ width: '47%' }}>
              <View
                style={{
                  height: 100,
                  borderRadius: 16,
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
              <Text variant="label" color="ink" style={{ marginTop: 8 }}>
                Blank canvas
              </Text>
              <Text variant="bodySm" color="ink3">
                Draw from scratch
              </Text>
            </Pressable>

            {/* Premade designs */}
            {shown.map((t) => {
              const locked = isLocked(t);
              return (
                <Pressable key={t.id} onPress={() => openTemplate(t)} style={{ width: '47%' }}>
                  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                    {/* Realistic image when available, else the generated sketch */}
                    {t.imageUrl ? (
                      <Image
                        source={{ uri: t.imageUrl }}
                        style={{ height: 100, width: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <TemplateThumbnail template={t} height={100} />
                    )}
                    {/* Story badge */}
                    {t.stories > 1 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                        }}
                      >
                        <Text variant="caption" color="onAccent">
                          {t.stories} floors
                        </Text>
                      </View>
                    ) : null}
                    {/* Lock badge (premium designs added from the dashboard) */}
                    {locked ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 999,
                          backgroundColor: colors.accent,
                        }}
                      >
                        <Icon name="lock" size={11} color={colors.onAccent} />
                        <Text variant="caption" color="onAccent">
                          {t.cost}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                    <Text variant="label" color="ink">
                      {t.name}
                    </Text>
                    <Icon name="pencil" size={12} color={colors.ink3} />
                  </View>
                  <Text variant="bodySm" color="ink3">
                    {t.rooms} {t.rooms === 1 ? 'room' : 'rooms'}
                    {t.stories > 1 ? ` · ${t.stories} floors` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
