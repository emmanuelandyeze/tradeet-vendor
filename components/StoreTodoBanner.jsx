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
import { LinearGradient } from 'expo-linear-gradient';
import PropTypes from 'prop-types';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 62;
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
					activeOpacity={0.9}
					onPress={() => item.onPress && item.onPress(item)}
					style={styles.cardShadow}
				>
					<LinearGradient
						colors={['#065637', '#032b1b']}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.card}
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
								<Feather name="arrow-up-right" size={20} color="rgba(255,255,255,0.6)" />
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
					</LinearGradient>
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
	cardShadow: {
		shadowColor: '#065637',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.15,
		shadowRadius: 10,
		elevation: 6,
	},
	card: {
		height: CARD_HEIGHT,
		borderRadius: 16,
		padding: 16,
		justifyContent: 'space-between',
		overflow: 'hidden',
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
		backgroundColor: '#EF4444',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	urgentText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	dueBadge: {
		backgroundColor: 'rgba(255,165,0,0.2)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 0.5,
		borderColor: 'rgba(255,165,0,0.5)',
	},
	dueText: {
		color: '#FBBF24',
		fontSize: 10,
		fontWeight: '700',
	},
	setupBadge: {
		backgroundColor: 'rgba(255,255,255,0.15)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	setupText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFFFFF',
		marginBottom: 4,
		letterSpacing: -0.2,
	},
	subtitle: {
		fontSize: 12,
		color: 'rgba(255,255,255,0.7)',
		lineHeight: 18,
	},

	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	progressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		paddingRight: 16,
	},
	progressBarBg: {
		flex: 1,
		height: 4,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: '#10B981', // Success Green / vivid
	},
	progressText: {
		fontSize: 11,
		fontWeight: '600',
		color: 'rgba(255,255,255,0.8)',
	},
	actionBtn: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20, // Perfect pill
	},
	actionBtnText: {
		color: '#065637',
		fontSize: 12,
		fontWeight: '700',
	},
});
