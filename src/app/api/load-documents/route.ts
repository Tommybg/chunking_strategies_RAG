// Load Documents API Route - Server-side directory reading
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mammoth from 'mammoth';

interface LoaderConfig {
    directory: string;
    extensions: string[];
    recursive?: boolean;
}

interface LoadedDocument {
    id: string;
    name: string;
    content: string;
    type: 'pdf' | 'docx' | 'txt';
    size: number;
    path: string;
}

export async function POST(request: NextRequest) {
    try {
        const config: LoaderConfig = await request.json();
        const { directory, extensions, recursive = true } = config;

        // Validate directory exists
        try {
            await fs.access(directory);
        } catch {
            return NextResponse.json(
                { error: `Directory not found: ${directory}` },
                { status: 404 }
            );
        }

        // Get all files matching extensions
        const files = await getFilesRecursively(directory, extensions, recursive);

        // Load each file
        const documents: LoadedDocument[] = [];

        for (const filePath of files) {
            try {
                const doc = await loadFile(filePath);
                if (doc) {
                    documents.push(doc);
                }
            } catch (error) {
                console.error(`Failed to load file ${filePath}:`, error);
            }
        }

        return NextResponse.json({
            documents,
            count: documents.length,
            directory,
        });
    } catch (error) {
        console.error('Load documents error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to load documents' },
            { status: 500 }
        );
    }
}

async function getFilesRecursively(
    dir: string,
    extensions: string[],
    recursive: boolean
): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
            const subFiles = await getFilesRecursively(fullPath, extensions, recursive);
            files.push(...subFiles);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

async function loadFile(filePath: string): Promise<LoadedDocument | null> {
    const ext = path.extname(filePath).toLowerCase();
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);

    let content = '';
    let type: 'pdf' | 'docx' | 'txt' = 'txt';

    switch (ext) {
        case '.pdf':
            // El soporte para PDF requiere la librería 'pdf-parse' que no está instalada.
            // Por ahora, devolvemos un mensaje informativo.
            content = "Contenido de PDF no disponible (instale pdf-parse para habilitar)";
            type = 'pdf';
            break;

        case '.docx':
        case '.doc':
            const result = await mammoth.extractRawText({ buffer });
            content = result.value;
            type = 'docx';
            break;

        case '.txt':
        case '.md':
        case '.markdown':
            content = buffer.toString('utf-8');
            type = 'txt';
            break;

        default:
            content = buffer.toString('utf-8');
            type = 'txt';
    }

    return {
        id: generateId(),
        name: path.basename(filePath),
        content,
        type,
        size: stats.size,
        path: filePath,
    };
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
