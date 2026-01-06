
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';

const { width } = Dimensions.get('window');

const Tabs = ({ scenes }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const headerScrollViewRef = useRef(null);

  // Sync Header Scroll with Content Scroll
  useEffect(() => {
    if (headerScrollViewRef.current) {
      // Simple logic to center the active tab if possible, or just ensure visibility
      // For a fixed number of tabs (4), usually they fit on screen or we scroll to index
      // Since we are using simple flex tabs, we can just highlight.
      // If we had many scrollable tabs, we'd use scrollTo.
    }
  }, [activeIndex]);

  const handleTabPress = (index) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const renderTabHeader = () => {
    return (
      <View style={styles.tabBar}>
        {scenes.map((scene, index) => {
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={scene.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {scene.title}
              </Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          )
        })}
      </View>
    );
  };

  const renderScene = ({ item }) => {
    return (
      <View style={{ width, flex: 1 }}>
        {item.content}
      </View>
    )
  };

  return (
    <View style={styles.container}>
      {renderTabHeader()}
      <FlatList
        ref={flatListRef}
        data={scenes}
        keyExtractor={(item) => item.key}
        renderItem={renderScene}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        bounces={false}
        scrollEventThrottle={16}
        // Sync scrollX if we want animated indicators later
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  activeTab: {
    // backgroundColor: '#F9FAFB' 
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#10B981', // Brand color
  },
  indicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '60%',
    backgroundColor: '#10B981',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});

export default Tabs;
