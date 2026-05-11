// MathText - Renders LaTeX math expressions using KaTeX on web
import React, { useRef, useEffect } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';

interface MathTextProps {
    latex: string;
    style?: any;
    color?: string;
    fontSize?: number;
}

export default function MathText({ latex, style, color = '#fff', fontSize = 15 }: MathTextProps) {
    const containerRef = useRef<any>(null);

    useEffect(() => {
        if (Platform.OS === 'web' && containerRef.current) {
            try {
                const katex = require('katex');
                const html = katex.renderToString(latex, {
                    throwOnError: false,
                    displayMode: false,
                    output: 'html',
                    trust: true,
                });
                // Inject KaTeX CSS if not already loaded
                if (!document.getElementById('katex-css')) {
                    const link = document.createElement('link');
                    link.id = 'katex-css';
                    link.rel = 'stylesheet';
                    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
                    document.head.appendChild(link);
                }
                containerRef.current.innerHTML = html;
                // Apply color to all katex elements
                const katexEls = containerRef.current.querySelectorAll('.katex, .katex *');
                katexEls.forEach((el: HTMLElement) => {
                    el.style.color = color;
                    el.style.fontSize = `${fontSize}px`;
                });
            } catch (e) {
                containerRef.current.innerText = latex;
            }
        }
    }, [latex, color, fontSize]);

    if (Platform.OS === 'web') {
        return (
            <div
                ref={containerRef}
                style={{ display: 'inline', color, fontSize, ...style }}
            />
        );
    }

    // Fallback for native: show raw LaTeX
    return <Text style={[{ color, fontSize }, style]}>{latex}</Text>;
}
