import { useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import HeaderBar from '@/components/ui/HeaderBar';
import ProgressDots from '@/components/ui/ProgressDots';
import Icon from '@/components/icons/Icon';
import CurrencyPickerSheet from '@/components/sheets/CurrencyPickerSheet';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore, useActiveProject } from '@/store/useProjectsStore';
import { DEFAULT_CURRENCY, currencyByCode } from '@/data/currencies';
import { greyItems, interiorItems } from '@/data/constructionItems';
import {
  deriveMeasurements,
  totalArea,
  itemQuantity,
  computeEstimate,
} from '@/domain/estimate';
import { formatMoney } from '@/domain/cost';
import { scheduleInterstitial } from '@/services/ads/interstitial';
import { PLACEMENT } from '@/services/ads/placements';
import { useAdFrequency } from '@/store/useAdFrequency';

// Onboarding-styled construction estimator. A single stack screen that manages
// an internal step index: scope → one step per material → summary. Grey
// structure is the first pass; the summary offers an "interior & finishing"
// continuation. State is committed to the active project's plan on Save.
export default function EstimateScreen({ navigation }) {
  const updatePlan = useProjectsStore((s) => s.updatePlan);
  const active = useActiveProject();
  const sheetRef = useRef(null);

  const saved = active?.plan?.estimate || null;

  const [currency, setCurrency] = useState(
    saved ? currencyByCode(saved.currency?.code) : DEFAULT_CURRENCY
  );
  const [measurements, setMeasurements] = useState(
    saved?.measurements || deriveMeasurements(active?.plan, active?.floors?.length || 1)
  );
  const [prices, setPrices] = useState(saved?.prices || {});
  // Active line items: grey only, or grey + interior once the user extends.
  const [items, setItems] = useState(
    saved?.stage === 'interior' ? [...greyItems(), ...interiorItems()] : greyItems()
  );
  const [step, setStep] = useState(0);

  const summaryStep = items.length + 1;
  const totalSteps = items.length + 2;
  const estimate = useMemo(
    () => computeEstimate(measurements, prices, items),
    [measurements, prices, items]
  );

  const patchArea = (text) => {
    const n = parseInt(String(text).replace(/[^0-9]/g, ''), 10);
    setMeasurements((m) => ({ ...m, coveredAreaSqft: Number.isNaN(n) ? 0 : n }));
  };
  const patchStoreys = (delta) =>
    setMeasurements((m) => ({ ...m, storeys: Math.min(20, Math.max(1, (m.storeys || 1) + delta)) }));
  const patchPrice = (id, text) =>
    setPrices((p) => ({ ...p, [id]: String(text).replace(/[^0-9.]/g, '') }));

  const goBack = () => (step > 0 ? setStep((s) => s - 1) : navigation.goBack());
  const next = () => setStep((s) => Math.min(summaryStep, s + 1));

  const addInterior = () => {
    const extended = [...greyItems(), ...interiorItems()];
    setItems(extended);
    setStep(greyItems().length + 1); // first interior item step
  };

  const onSave = () => {
    // Early return is the failure path (no active project) — no ad there.
    if (!active) return navigation.goBack();
    const stage = items.length > greyItems().length ? 'interior' : 'grey';
    updatePlan(active.id, {
      ...active.plan,
      estimate: { currency, measurements, prices, stage, updatedAt: Date.now() },
    });
    navigation.goBack();

    // The estimate is finished and saved: the user is between tasks.
    useAdFrequency.getState().noteQualifyingAction();
    scheduleInterstitial(PLACEMENT.estimateSaved);
  };

  const headerTitle =
    step === 0 ? 'Cost estimate' : step === summaryStep ? 'Estimate summary' : 'Material price';

  return (
    <Screen>
      <HeaderBar title={headerTitle} onBack={goBack} />
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        <ProgressDots total={totalSteps} index={step} />
      </View>

      {step === 0 ? (
        <ScopeStep
          currency={currency}
          measurements={measurements}
          onPickCurrency={() => sheetRef.current?.present()}
          onArea={patchArea}
          onStoreys={patchStoreys}
        />
      ) : step === summaryStep ? (
        <SummaryStep estimate={estimate} currency={currency} measurements={measurements} />
      ) : (
        <ItemStep
          item={items[step - 1]}
          measurements={measurements}
          currency={currency}
          price={prices[items[step - 1].id] ?? ''}
          onPrice={(t) => patchPrice(items[step - 1].id, t)}
          runningSubtotal={estimate.subtotal}
        />
      )}

      {/* Pinned action */}
      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24, gap: 12 }}>
        {step === summaryStep ? (
          <>
            {items.length <= greyItems().length ? (
              <Button
                title="Add interior & finishing"
                variant="secondary"
                icon="arrow-right"
                onPress={addInterior}
              />
            ) : null}
            <Button title="Save estimate" icon="check" onPress={onSave} />
          </>
        ) : (
          <Button
            title={step === summaryStep - 1 ? 'See estimate' : 'Next'}
            icon="arrow-right"
            onPress={next}
          />
        )}
      </View>

      <CurrencyPickerSheet
        ref={sheetRef}
        selected={currency}
        onSelect={(c) => {
          setCurrency(c);
          sheetRef.current?.dismiss();
        }}
      />
    </Screen>
  );
}

// ---- Step 0: scope --------------------------------------------------------

function ScopeStep({ currency, measurements, onPickCurrency, onArea, onStoreys }) {
  const { colors, radius } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 180 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text variant="h2">Estimate construction cost</Text>
      <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
        Enter your covered area and we’ll work out material quantities. You add the prices.
      </Text>

      {/* Currency */}
      <Text variant="label" color="ink2" style={{ marginTop: 26 }}>
        CURRENCY
      </Text>
      <Pressable
        onPress={onPickCurrency}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginTop: 10,
          padding: 16,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ fontSize: 26 }}>{currency.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="titleSm">
            {currency.code} · {currency.symbol}
          </Text>
          <Text variant="bodySm" color="ink2" style={{ marginTop: 1 }}>
            {currency.name}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.ink3} strokeWidth={2.2} />
      </Pressable>

      {/* Covered area */}
      <Input
        label="COVERED AREA (SQ FT)"
        keyboardType="numeric"
        value={measurements.coveredAreaSqft ? String(measurements.coveredAreaSqft) : ''}
        onChangeText={onArea}
        placeholder="e.g. 1500"
        icon="ruler"
        style={{ marginTop: 22 }}
      />

      {/* Storeys */}
      <Text variant="label" color="ink2" style={{ marginTop: 22 }}>
        STOREYS
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
          padding: 14,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <CountButton icon="minus" onPress={() => onStoreys(-1)} tint />
        <View style={{ alignItems: 'center' }}>
          <Text variant="h2">{measurements.storeys || 1}</Text>
          <Text variant="caption" color="ink3">
            {totalArea(measurements).toLocaleString()} sq ft total
          </Text>
        </View>
        <CountButton icon="plus" onPress={() => onStoreys(1)} />
      </View>
    </ScrollView>
  );
}

function CountButton({ icon, onPress, tint }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: tint ? colors.accentSoft : colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={22} color={tint ? colors.accent : colors.onAccent} strokeWidth={2.4} />
    </Pressable>
  );
}

// ---- Steps 1..N: one material each ---------------------------------------

function ItemStep({ item, measurements, currency, price, onPrice, runningSubtotal }) {
  const { colors, radius } = useTheme();
  const isPercent = item.basis === 'percent';
  const qty = itemQuantity(item, measurements);
  const priceNum = Number(price) || 0;
  const lineAmount = isPercent
    ? Math.round((runningSubtotal * priceNum) / 100)
    : qty * priceNum;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 180 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: radius.lg,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={item.icon} size={28} color={colors.accent} strokeWidth={2} />
      </View>
      <Text variant="h2" style={{ marginTop: 16 }}>
        {item.label}
      </Text>
      <Text variant="body" color="ink2" style={{ marginTop: 6 }}>
        {item.hint}
      </Text>

      {!isPercent ? (
        <View
          style={{
            marginTop: 22,
            padding: 18,
            borderRadius: radius.lg,
            backgroundColor: colors.accentTintBg,
            borderWidth: 1,
            borderColor: colors.accentSoft,
          }}
        >
          <Text variant="caption" color="ink3">
            ESTIMATED QUANTITY
          </Text>
          <Text variant="h1" color="accent" style={{ marginTop: 4 }}>
            {qty.toLocaleString()} <Text variant="title" color="accent">{item.unit}</Text>
          </Text>
        </View>
      ) : null}

      <Input
        label={
          isPercent ? 'PERCENTAGE (%)' : `PRICE PER ${item.unit.toUpperCase()} (${currency.code})`
        }
        keyboardType="numeric"
        value={price}
        onChangeText={onPrice}
        placeholder={isPercent ? 'e.g. 5' : `${currency.symbol} 0`}
        style={{ marginTop: 22 }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 18,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <Text variant="bodySm" color="ink2">
          {isPercent ? 'Adds to subtotal' : 'Line total'}
        </Text>
        <Text variant="title">{formatMoney(lineAmount, currency)}</Text>
      </View>
    </ScrollView>
  );
}

// ---- Final: summary -------------------------------------------------------

function SummaryStep({ estimate, currency, measurements }) {
  const { colors, radius } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 200 }}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="h2">Your estimate</Text>

      {/* Grand total */}
      <View
        style={{
          marginTop: 16,
          padding: 20,
          borderRadius: radius.xl,
          backgroundColor: colors.accent,
        }}
      >
        <Text variant="label" style={{ color: '#fff', opacity: 0.85 }}>
          ESTIMATED TOTAL
        </Text>
        <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', marginTop: 4 }}>
          {formatMoney(estimate.total, currency)}
        </Text>
        <Text variant="bodySm" style={{ color: '#fff', opacity: 0.85, marginTop: 4 }}>
          {totalArea(measurements).toLocaleString()} sq ft · {currency.name}
        </Text>
      </View>

      {/* Line items */}
      <Text variant="label" color="ink2" style={{ marginTop: 24 }}>
        BILL OF QUANTITIES
      </Text>
      <View style={{ marginTop: 10 }}>
        {estimate.lines.map((l) => (
          <View
            key={l.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 13,
              borderBottomWidth: 1,
              borderBottomColor: colors.lineSoft,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="bodySm" style={{ fontWeight: '700' }}>
                {l.label}
              </Text>
              <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
                {l.basis === 'percent'
                  ? `${l.qty}% of subtotal`
                  : `${l.qty.toLocaleString()} ${l.unit} × ${formatMoney(l.unitPrice, currency)}`}
              </Text>
            </View>
            <Text variant="bodySm" style={{ fontWeight: '800' }}>
              {formatMoney(l.amount, currency)}
            </Text>
          </View>
        ))}
      </View>

      {/* Grand total row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
        }}
      >
        <Text variant="title">Total</Text>
        <Text variant="title" color="accent">
          {formatMoney(estimate.total, currency)}
        </Text>
      </View>

      <Text variant="caption" color="ink3" style={{ marginTop: 18 }}>
        Quantities are rule-of-thumb takeoffs from your covered area — treat them as a budgeting
        guide, not a final engineered BOQ.
      </Text>
    </ScrollView>
  );
}
