// components/StoreTodoBanner.js
import React from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PropTypes from 'prop-types';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(
	340,
	Math.round(screenWidth * 0.78),
);
const CARD_HEIGHT = 130;

function formatDueText(due) {
	if (!due) return null;
	// due can be a Date string or Date object
	try {
		const d = typeof due === 'string' ? new Date(due) : due;
		if (isNaN(d)) return null;
		const now = new Date();
		const diff = Math.ceil(
			(d - now) / (1000 * 60 * 60 * 24),
		); // days
		if (diff < 0) return 'Overdue';
		if (diff === 0) return 'Due today';
		if (diff === 1) return 'Due tomorrow';
		return `Due in ${diff}d`;
	} catch {
		return null;
	}
}

/**
 * tasks: [
 *  {
 *    id: string|number,
 *    title: string,
 *    subtitle?: string,
 *    due?: Date|string,
 *    urgent?: boolean,
 *    progress?: number, // 0..1
 *    actionLabel?: string, // e.g. "Complete", "Edit"
 *    onPress?: () => void
 *  }
 * ]
 */
const StoreTodoBanner = ({ tasks, style }) => {
	if (!Array.isArray(tasks) || tasks.length === 0) {
		return null; // nothing to show
	}

	const renderItem = ({ item }) => {
		const dueText = formatDueText(item.due);
		const progress =
			typeof item.progress === 'number'
				? Math.max(0, Math.min(1, item.progress))
				: 0;

		return (
			<View style={styles.cardWrapper}>
				<View style={styles.card}>
					<View style={styles.cardHeader}>
						<View style={styles.titleBlock}>
							<Text style={styles.title} numberOfLines={1}>
								{item.title}
							</Text>
							{item.subtitle ? (
								<Text
									style={styles.subtitle}
									numberOfLines={1}
								>
									{item.subtitle}
								</Text>
							) : null}
						</View>

						{item.urgent ? (
							<View
								style={styles.urgentBadge}
								accessibilityLabel="Urgent"
							>
								<Text style={styles.urgentText}>
									URGENT
								</Text>
							</View>
						) : dueText ? (
							<Text style={styles.dueText}>{dueText}</Text>
						) : null}
					</View>

					<View style={styles.progressRow}>
						<View style={styles.progressBarBackground}>
							<View
								style={[
									styles.progressBarFill,
									{ width: `${progress * 100}%` },
								]}
							/>
						</View>
						<Text style={styles.progressLabel}>
							{Math.round(progress * 100)}%
						</Text>
					</View>

					<View style={styles.cardFooter}>
						<TouchableOpacity
							style={styles.actionButton}
							activeOpacity={0.75}
							onPress={() => {
								if (typeof item.onPress === 'function')
									item.onPress(item);
							}}
							accessibilityRole="button"
							accessibilityLabel={
								item.actionLabel || 'Take action'
							}
						>
							<Ionicons
								name="checkmark-circle-outline"
								size={18}
								color="#fff"
							/>
							<Text style={styles.actionLabel}>
								{item.actionLabel || 'Take action'}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.chev}
							onPress={() => {
								if (typeof item.onPress === 'function')
									item.onPress(item);
							}}
							accessibilityRole="button"
							accessibilityLabel="Open item"
						>
							<Ionicons
								name="chevron-forward"
								size={22}
								color="#1C2634"
							/>
						</TouchableOpacity>
					</View>
				</View>
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
				snapToInterval={CARD_WIDTH + 16} // card width + margin
				getItemLayout={(_, index) => ({
					length: CARD_WIDTH + 16,
					offset: (CARD_WIDTH + 16) * index,
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

StoreTodoBanner.defaultProps = {
	tasks: [],
	style: undefined,
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
		backgroundColor: 'transparent',
	},
	listContent: {
		paddingLeft: 4,
		paddingRight: 12,
	},
	cardWrapper: {
		width: CARD_WIDTH,
		paddingRight: 16,
	},
	card: {
		height: CARD_HEIGHT,
		borderRadius: 14,
		backgroundColor: '#fff',
		padding: 14,
		// shadowColor: '#000',
		// shadowOffset: { width: 0, height: 6 },
		// shadowOpacity: 0.08,
		// shadowRadius: 14,
		// elevation: 6,
		borderWidth: 1,
		borderColor: '#f0f0f3',
		justifyContent: 'space-between',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleBlock: {
		flex: 1,
		paddingRight: 8,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1C2634',
	},
	subtitle: {
		fontSize: 13,
		color: '#6b7280',
		marginTop: 4,
	},
	urgentBadge: {
		backgroundColor: '#ff4d6d',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		alignSelf: 'flex-start',
	},
	urgentText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 11,
	},
	dueText: {
		color: '#ef8a00',
		fontWeight: '600',
		fontSize: 12,
	},
	progressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
	},
	progressBarBackground: {
		flex: 1,
		height: 8,
		backgroundColor: '#f1f5f9',
		borderRadius: 8,
		overflow: 'hidden',
		marginRight: 10,
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: '#007bff',
	},
	progressLabel: {
		minWidth: 36,
		textAlign: 'right',
		color: '#374151',
		fontWeight: '600',
		fontSize: 12,
	},
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#1C99FF',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 10,
	},
	actionLabel: {
		color: '#fff',
		fontWeight: '700',
		marginLeft: 8,
		fontSize: 13,
	},
	chev: {
		padding: 6,
		borderRadius: 8,
	},
});

export default StoreTodoBanner;
