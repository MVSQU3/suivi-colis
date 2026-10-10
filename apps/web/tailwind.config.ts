import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.tsx', './components/**/*.tsx'], theme: { extend: { colors: { primaire: '#F77F00', fonce: '#0B2545', succes: '#009E60', fond: '#F5F1EA', gris: '#8D99AE', 'gris-texte': '#5C677D', alerte: '#D62828', info: '#3A86FF' } } }, plugins: [] } satisfies Config;
