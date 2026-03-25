import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const SkeletonItem = ({ style }) => {
	const opacity = useRef(new Animated.Value(0.3)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0.7,
					duration: 800,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 800,
					easing: Easing.inOut(Easing.quad),
					useNativeDriver: true,
				}),
			])
		).start();
	}, []);

	return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
};

const OrderCardSkeleton = () => (
	<View style={styles.card}>
		<View style={styles.cardHeader}>
			<View style={styles.orderIdRow}>
				<SkeletonItem style={{ width: 80, height: 16, borderRadius: 4 }} />
				<SkeletonItem style={{ width: 60, height: 10, borderRadius: 3, marginTop: 4 }} />
			</View>
			<SkeletonItem style={{ width: 70, height: 20, borderRadius: 6 }} />
		</View>
		<View style={styles.cardBody}>
			<View style={styles.customerRow}>
				<SkeletonItem style={styles.avatar} />
				<View style={{ flex: 1, gap: 6 }}>
					<SkeletonItem style={{ width: '60%', height: 14, borderRadius: 4 }} />
					<SkeletonItem style={{ width: '40%', height: 12, borderRadius: 4 }} />
				</View>
			</View>
			<View style={{ alignItems: 'flex-end', gap: 6 }}>
				<SkeletonItem style={{ width: 80, height: 18, borderRadius: 4 }} />
				<SkeletonItem style={{ width: 40, height: 12, borderRadius: 4 }} />
			</View>
		</View>
	</View>
);

const ProductCardSkeleton = () => (
	<View style={styles.productCard}>
		<SkeletonItem style={styles.cardImage} />
		<View style={styles.productCardContent}>
			<View style={styles.cardHeaderRow}>
				<View style={{ flex: 1, gap: 4 }}>
					<SkeletonItem style={{ width: '70%', height: 14, borderRadius: 4 }} />
					<SkeletonItem style={{ width: '40%', height: 12, borderRadius: 4 }} />
				</View>
				<SkeletonItem style={{ width: 50, height: 18, borderRadius: 6 }} />
			</View>
			<View style={styles.cardFooter}>
				<SkeletonItem style={{ width: 80, height: 16, borderRadius: 4 }} />
				<SkeletonItem style={{ width: 40, height: 11, borderRadius: 3 }} />
			</View>
		</View>
	</View>
);

const OrderDetailSkeleton = ({ headerTopPadding }) => (
	<View style={styles.container}>
		<View style={[styles.header, { paddingTop: headerTopPadding }]}>
			<SkeletonItem style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
			<View style={{ flex: 1, gap: 4 }}>
				<SkeletonItem style={{ width: '50%', height: 18, borderRadius: 4 }} />
				<SkeletonItem style={{ width: '30%', height: 12, borderRadius: 4 }} />
			</View>
			<SkeletonItem style={{ width: 80, height: 24, borderRadius: 20 }} />
		</View>

		<View style={{ padding: 20, gap: 24 }}>
			{/* Customer */}
			<View style={{ gap: 12 }}>
				<SkeletonItem style={{ width: 100, height: 15, borderRadius: 4 }} />
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<SkeletonItem style={{ width: 40, height: 40, borderRadius: 20 }} />
					<View style={{ flex: 1, gap: 6 }}>
						<SkeletonItem style={{ width: '40%', height: 16, borderRadius: 4 }} />
						<SkeletonItem style={{ width: '80%', height: 14, borderRadius: 4 }} />
					</View>
				</View>
			</View>

			{/* Items */}
			<View style={{ gap: 12 }}>
				<SkeletonItem style={{ width: 120, height: 15, borderRadius: 4 }} />
				{[1, 2, 3].map((i) => (
					<View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
						<View style={{ flexDirection: 'row', flex: 1, gap: 12 }}>
							<SkeletonItem style={{ width: 30, height: 20, borderRadius: 4 }} />
							<View style={{ flex: 1, gap: 4 }}>
								<SkeletonItem style={{ width: '70%', height: 14, borderRadius: 4 }} />
								<SkeletonItem style={{ width: '40%', height: 12, borderRadius: 4 }} />
							</View>
						</View>
						<SkeletonItem style={{ width: 60, height: 14, borderRadius: 4 }} />
					</View>
				))}
			</View>
		</View>
	</View>
);

const SkeletonLoader = ({ type = 'list', count = 5, headerTopPadding }) => {
	if (type === 'detail') return <OrderDetailSkeleton headerTopPadding={headerTopPadding} />;
	if (type === 'products') {
		return (
			<View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
				{Array.from({ length: count }).map((_, i) => (
					<ProductCardSkeleton key={i} />
				))}
			</View>
		);
	}

	return (
		<View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
			{Array.from({ length: count }).map((_, i) => (
				<OrderCardSkeleton key={i} />
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	skeleton: {
		backgroundColor: '#E5E7EB',
	},
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F9FAFB',
	},
	orderIdRow: { flexDirection: 'column' },
	cardBody: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	customerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
	avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
	// Product specific
	productCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 16,
		flexDirection: 'row',
		padding: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	cardImage: {
		width: 72,
		height: 72,
		borderRadius: 8,
	},
	productCardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
	cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
	cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
});

export default SkeletonLoader;
