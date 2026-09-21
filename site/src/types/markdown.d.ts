/// <reference types="vite/client" />

// Allow raw imports of .md files via `import content from './file.md?raw'`
declare module '*.md?raw' {
    const content: string;
    export default content;
}

// Also cover plain .md imports (fallback)
declare module '*.md' {
    const content: string;
    export default content;
}
