/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as Path from 'path';
import { resolve } from 'path';
import mkcert from 'vite-plugin-mkcert';
import { createHash } from 'crypto';
import pluginRewriteAll from 'vite-plugin-rewrite-all';
import ViteCSSExportPlugin from 'vite-plugin-css-export';

const srcPath = resolve(__dirname, 'src');
const testsPath = resolve(__dirname, 'tests');

export default defineConfig({
    plugins: [react(), mkcert(), pluginRewriteAll(), ViteCSSExportPlugin()],
    server: {
        port: 3000,
        host: 'localhost',
        https: true
    },
    build: {
        target: 'esnext'
    },
    preview: {
        port: 3000,
        host: 'localhost'
    },
    resolve: {
        alias: {
            src: srcPath,
            '@': srcPath,
            '@tests': testsPath
        }
    },
    css: {
        modules: {
            generateScopedName: (name, filename) => {
                const moduleName = Path.parse(filename).name.split('.')[0];
                const hash = createHash('md5').update(filename).digest('hex').slice(0, 5);
                return `${moduleName}__${name}__${hash}`;
            },
            localsConvention: 'camelCaseOnly'
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['tests/setup.ts'],
        reporters: ['junit', 'basic'],
        outputFile: './tests/test-results.xml',
        restoreMocks: true,
        coverage: {
            provider: 'istanbul',
            all: true,
            reportsDirectory: './tests/coverage',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,tsx}']
        },
        css: {
            modules: {
                classNameStrategy: 'non-scoped'
            }
        }
    }
});
