import React, { useEffect } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { TabBarIcon } from './TabBarIcon';

export function AnimatedTabIcon({ name, color, focused, size }) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (focused) {
            scale.value = withSpring(1.2, {
                damping: 10,
                stiffness: 100
            });
        } else {
            scale.value = withSpring(1, {
                damping: 10,
                stiffness: 100
            });
        }
    }, [focused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
            <TabBarIcon name={name} color={color} size={size} style={{ marginBottom: 0 }} />
        </Animated.View>
    );
}
