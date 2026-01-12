// Document Loader Service - Reads documents from directories
import type { Document, DocumentStructure } from '@/types';

interface LoadedDocument {
    id: string;
    name: string;
    content: string;
    type: 'pdf' | 'docx' | 'txt';
    size: number;
    path: string;
    structure?: DocumentStructure;
}

interface LoaderConfig {
    directory: string;
    extensions: string[];
    recursive?: boolean;
}

/**
 * Document Loader Class - Similar to LlamaIndex's SimpleDirectoryReader
 * Scans a directory, filters for specific file types, and loads document content
 */
export class DocumentLoader {
    private config: LoaderConfig;
    private documents: LoadedDocument[] = [];

    constructor(config: LoaderConfig) {
        this.config = {
            ...config,
            recursive: config.recursive ?? true,
        };
    }

    /**
     * Load all documents from the configured directory
     * Returns a promise of loaded documents
     */
    async loadData(): Promise<LoadedDocument[]> {
        // This runs server-side via API route
        const response = await fetch('/api/load-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.config),
        });

        if (!response.ok) {
            throw new Error('Failed to load documents from directory');
        }

        const data = await response.json();
        this.documents = data.documents;
        return this.documents;
    }

    /**
     * Get the currently loaded documents
     */
    getDocuments(): LoadedDocument[] {
        return this.documents;
    }

    /**
     * Get document count
     */
    getDocumentCount(): number {
        return this.documents.length;
    }
}

/**
 * Create a document loader for a specific directory
 * Similar to: loader = SimpleDirectoryReader(input_dir, required_exts=[".pdf"])
 */
export function createDocumentLoader(
    directory: string,
    extensions: string[] = ['.pdf', '.txt', '.docx', '.md'],
    recursive: boolean = true
): DocumentLoader {
    return new DocumentLoader({
        directory,
        extensions,
        recursive,
    });
}
