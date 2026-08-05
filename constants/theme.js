/**
 * Tradeet Business Design System & Accessibility Theme Tokens
 * Unified typography scale, accessible color palette (WCAG AA compliant), spacing, and touch target rules.
 */

export const COLORS = {
	// Brand Colors
	primary: '#065637',
	primaryLight: '#E6F4EA',
	primaryDark: '#043E27',

	// Text & Content Contrast
	textPrimary: '#0F172A',   // Slate 900 (High Contrast body/titles)
	textSecondary: '#475569', // Slate 600 (Accessible secondary)
	textMuted: '#64748B',     // Slate 500 (Captions/Subtexts)
	textLight: '#94A3B8',     // Slate 400 (Placeholders)
	textWhite: '#FFFFFF',

	// Backgrounds & Surface
	background: '#F8FAFC',    // Slate 50
	surface: '#FFFFFF',
	surfaceSubtle: '#F1F5F9', // Slate 100

	// Borders
	border: '#E2E8F0',       // Slate 200
	borderSubtle: '#F1F5F9',

	// Semantic Status Colors
	success: '#16A34A',
	successBg: '#E6F4EA',
	warning: '#D97706',
	warningBg: '#FFFBEB',
	danger: '#DC2626',
	dangerBg: '#FEF2F2',
	info: '#1D4ED8',
	infoBg: '#EFF6FF',
	purple: '#7C3AED',
	purpleBg: '#F3E8FF',
};

export const TYPOGRAPHY = {
	// Screen Main Headers
	h1: {
		fontSize: 22,
		fontWeight: '800',
		lineHeight: 28,
		color: COLORS.textPrimary,
	},
	// Section Titles & Subheaders
	h2: {
		fontSize: 16,
		fontWeight: '700',
		lineHeight: 22,
		color: COLORS.textPrimary,
	},
	// Card Titles / List Item Titles
	h3: {
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
		color: COLORS.textPrimary,
	},
	// Standard Body Text
	body: {
		fontSize: 14,
		fontWeight: '400',
		lineHeight: 20,
		color: COLORS.textSecondary,
	},
	bodyBold: {
		fontSize: 14,
		fontWeight: '700',
		lineHeight: 20,
		color: COLORS.textPrimary,
	},
	// Small Captions & Labels
	caption: {
		fontSize: 12,
		fontWeight: '500',
		lineHeight: 16,
		color: COLORS.textMuted,
	},
	captionBold: {
		fontSize: 12,
		fontWeight: '700',
		lineHeight: 16,
		color: COLORS.textSecondary,
	},
	// Micro uppercase badges
	micro: {
		fontSize: 10,
		fontWeight: '800',
		lineHeight: 14,
		letterSpacing: 0.5,
	},
};

export const LAYOUT = {
	borderRadiusSm: 8,
	borderRadiusMd: 12,
	borderRadiusLg: 16,
	borderRadiusXl: 20,

	// Accessibility Minimum Touch Target Size (44pt per iOS/Android A11y Guidelines)
	minTouchTarget: 44,
};

export const ACCESSIBILITY = {
	buttonProps: (label, hint = '') => ({
		accessible: true,
		accessibilityRole: 'button',
		accessibilityLabel: label,
		accessibilityHint: hint,
	}),
	inputProps: (label) => ({
		accessible: true,
		accessibilityLabel: label,
	}),
};
