// components/StoreTodoBanner.jsx
import React from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import PropTypes from 'prop-types';

const { width: screenWidth } = Dimensions.get('window');
// Slightly wider card for better readability
const CARD_WIDTH = Math.min(360, Math.round(screenWidth * 0.85));
const CARD_HEIGHT = 140;

function formatDueText(due) {
	if (!due) return null;
	try {
		const d = typeof due === 'string' ? new Date(due) : due;
		if (isNaN(d)) return null;
		const now = new Date();
		const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
		if (diff < 0) return 'Overdue';
		if (diff === 0) return 'Due today';
		if (diff === 1) return 'Due tomorrow';
		return `Due in ${diff}d`;
	} catch {
		return null;
	}
}

const StoreTodoBanner = ({ tasks, style }) => {
	if (!Array.isArray(tasks) || tasks.length === 0) {
		return null;
	}

	const renderItem = ({ item }) => {
		const dueText = formatDueText(item.due);
		const progress =
			typeof item.progress === 'number'
				? Math.max(0, Math.min(1, item.progress))
				: 0;

		return (
			<View style={styles.cardWrapper}>
				<TouchableOpacity
					style={styles.card}
					activeOpacity={0.9}
					onPress={() => item.onPress && item.onPress(item)}
				>
					{/* Header: Title + Badge/Due */}
					<View style={styles.cardHeader}>
						<View style={styles.headerTopRow}>
							{item.urgent ? (
								<View style={styles.urgentBadge}>
									<Text style={styles.urgentText}>URGENT</Text>
								</View>
							) : dueText ? (
								<View style={styles.dueBadge}>
									<Text style={styles.dueText}>{dueText}</Text>
								</View>
							) : (
								<View style={styles.setupBadge}>
									<Text style={styles.setupText}>SETUP</Text>
								</View>
							)}
							{/* Action Arrow (top right) */}
							<Feather name="arrow-right" size={16} color="#9CA3AF" />
						</View>

						<Text style={styles.title} numberOfLines={1}>
							{item.title}
						</Text>
						<Text style={styles.subtitle} numberOfLines={2}>
							{item.subtitle}
						</Text>
					</View>

					{/* Footer: Progress + Button */}
					<View style={styles.cardFooter}>
						{/* Progress Bar */}
						<View style={styles.progressContainer}>
							<View style={styles.progressBarBg}>
								<View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
							</View>
							<Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
						</View>

						{/* Action Button */}
						<View style={styles.actionBtn}>
							<Text style={styles.actionBtnText}>{item.actionLabel || 'Start'}</Text>
						</View>
					</View>
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<View style={[styles.container, style]}>
			<FlatList
				data={tasks}
				keyExtractor={(t) => String(t.id)}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
				renderItem={renderItem}
				snapToAlignment="start"
				decelerationRate="fast"
				snapToInterval={CARD_WIDTH + 12}
				getItemLayout={(_, index) => ({
					length: CARD_WIDTH + 12,
					offset: (CARD_WIDTH + 12) * index,
					index,
				})}
			/>
		</View>
	);
};

StoreTodoBanner.propTypes = {
	tasks: PropTypes.array,
	style: PropTypes.any,
};

export default StoreTodoBanner;

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
	},
	listContent: {
		paddingHorizontal: 16, // Use padding instead of valid margin for first item
	},
	cardWrapper: {
		width: CARD_WIDTH,
		marginRight: 12,
	},
	card: {
		height: CARD_HEIGHT,
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		// Soft shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 8,
		elevation: 2,
	},
	cardHeader: {
		flex: 1,
	},
	headerTopRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	urgentBadge: {
		backgroundColor: '#FEF2F2',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: '#FECACA',
	},
	urgentText: {
		color: '#DC2626',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	dueBadge: {
		backgroundColor: '#FFF7ED',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: '#FED7AA',
	},
	dueText: {
		color: '#EA580C',
		fontSize: 10,
		fontWeight: '700',
	},
	setupBadge: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: '#E5E7EB',
	},
	setupText: {
		color: '#4B5563',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 12,
		color: '#6B7280',
		lineHeight: 18,
	},

	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 12,
	},
	progressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		paddingRight: 12,
	},
	progressBarBg: {
		flex: 1,
		height: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: '#10B981', // Success Green
	},
	progressText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#6B7280',
	},
	actionBtn: {
		backgroundColor: '#065637',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	actionBtnText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
});
