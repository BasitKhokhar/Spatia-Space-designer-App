import { useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';

import ProgressDots from '@/components/ui/ProgressDots';
import AiSpotlight from './AiSpotlight';
import NewProjectPromo from './NewProjectPromo';

// Matches the paddingHorizontal HomeScreen used to wrap these cards with.
const GUTTER = 12;
const GAP = 12;

// Two real hero promos (AI Designer, Start a New Project) as swipeable pages
// with a dot indicator — not a padded-out single card, since both pages are
// substantive destinations on their own.
export default function HeroCarousel({ onAiPress, aiInProgress, onCreatePress, style }) {
  const { width } = useWindowDimensions();
  const pageWidth = width - GUTTER * 2;
  const [index, setIndex] = useState(0);

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (pageWidth + GAP));
    setIndex(i);
  };

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageWidth + GAP}
        snapToAlignment="start"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: GUTTER }}
      >
        <AiSpotlight onPress={onAiPress} inProgress={aiInProgress} style={{ width: pageWidth, marginRight: GAP }} />
        <NewProjectPromo onPress={onCreatePress} style={{ width: pageWidth }} />
      </ScrollView>
      <ProgressDots total={2} index={index} style={{ alignSelf: 'center', marginTop: 14 }} />
    </View>
  );
}
