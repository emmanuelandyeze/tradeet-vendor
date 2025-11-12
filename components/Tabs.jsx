
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const Tabs = ({ scenes }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // const translateX = useSharedValue(0);

  const handleTabPress = (index) => {
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {scenes?.map((scene, index) => (
          <TouchableOpacity
            key={scene.key}
            style={styles.tab}
            onPress={() => handleTabPress(index)}
          >
            <Text style={[styles.tabText, activeIndex === index && styles.activeTabText]}>
              {scene.title}
            </Text>
          </TouchableOpacity>
        ))}
        {/* <Animated.View style={[styles.indicator, animatedIndicatorStyle]} /> */}
      </View>
      <View style={styles.sceneContainer}>
        {scenes[activeIndex].content}
      </View>
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
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  tabText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007bff',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#007bff',
  },
  sceneContainer: {
    flex: 1,
  },
});

export default Tabs;
