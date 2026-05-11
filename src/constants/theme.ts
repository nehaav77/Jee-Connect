// JEE Connect - Design System & Theme Constants
export const Colors = {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    secondary: '#ec4899',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Subject-specific colors
    subjects: {
        physics: '#3b82f6',
        chemistry: '#22c55e',
        mathematics: '#f59e0b',
    },

    dark: {
        background: '#0f172a',
        surface: '#1e293b',
        surfaceElevated: '#334155',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#334155',
        cardBorder: '#334155',
    },
    light: {
        background: '#f8fafc',
        surface: '#ffffff',
        surfaceElevated: '#f1f5f9',
        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        cardBorder: '#e2e8f0',
    },
};

export const Gradients = {
    primary: ['#6366f1', '#8b5cf6'],
    hero: ['#6366f1', '#ec4899'],
    physics: ['#3b82f6', '#06b6d4'],
    chemistry: ['#22c55e', '#14b8a6'],
    mathematics: ['#f59e0b', '#f97316'],
};

export const FontSize = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 32,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const BorderRadius = {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const Shadow = {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
};
