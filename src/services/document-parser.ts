// Document Parser Service
import type { Document, DocumentStructure, DocumentSection } from '@/types';

// Generate a simple UUID
function generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

// File validation
function validateFile(file: File): void {
    // Max file size: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
    }

    if (file.size === 0) {
        throw new Error('File is empty. Please upload a file with content.');
    }

    // Validate file extension
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown'];
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
        throw new Error(`Invalid file type. Supported formats: PDF, DOCX, TXT, MD`);
    }
}

export async function parseDocument(
    file: File
): Promise<Document> {
    // Validate file first
    validateFile(file);

    const type = getFileType(file.name);
    let content = '';
    let structure: DocumentStructure | undefined;

    switch (type) {
        case 'txt':
            content = await parseTextFile(file);
            structure = extractTextStructure(content);
            break;
        case 'pdf':
            content = await parsePdfFile(file);
            structure = extractTextStructure(content);
            break;
        case 'docx':
            const result = await parseDocxFile(file);
            content = result.content;
            structure = result.structure;
            break;
        default:
            throw new Error(`Unsupported file type: ${type}`);
    }

    return {
        id: generateId(),
        name: file.name,
        content,
        type,
        size: file.size,
        uploadedAt: new Date(),
        structure,
    };
}

function getFileType(filename: string): 'pdf' | 'docx' | 'txt' {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return 'pdf';
        case 'docx':
        case 'doc':
            return 'docx';
        case 'txt':
        case 'md':
        case 'markdown':
            return 'txt';
        default:
            return 'txt';
    }
}

async function parseTextFile(file: File): Promise<string> {
    return await file.text();
}

async function parsePdfFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to parse PDF');
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }
    return data.content;
}

async function parseDocxFile(file: File): Promise<{ content: string; structure: DocumentStructure }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to parse DOCX');
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error);
    }

    return {
        content: data.content,
        structure: extractTextStructure(data.content),
    };
}

export function extractTextStructure(content: string): DocumentStructure {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    let currentSection: DocumentSection | null = null;
    let currentContent = '';
    let currentStartIndex = 0;
    let charIndex = 0;

    // Common heading patterns
    const headingPatterns = [
        /^#{1,6}\s+(.+)$/,           // Markdown headings
        /^([A-Z][A-Z\s]+)$/,         // ALL CAPS headings
        /^(\d+\.?\s+.+)$/,           // Numbered headings
        /^(Chapter\s+\d+.*)$/i,      // Chapter headings
        /^(Section\s+\d+.*)$/i,      // Section headings
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineStart = charIndex;
        charIndex += line.length + 1; // +1 for newline

        let isHeading = false;
        let headingLevel = 1;
        let headingText = '';

        for (const pattern of headingPatterns) {
            const match = line.match(pattern);
            if (match) {
                isHeading = true;
                headingText = match[1] || line;
                // Determine level from markdown syntax
                if (line.startsWith('#')) {
                    headingLevel = line.match(/^#+/)?.[0].length || 1;
                }
                break;
            }
        }

        if (isHeading) {
            // Save previous section
            if (currentSection) {
                currentSection.content = currentContent.trim();
                currentSection.endIndex = lineStart - 1;
                sections.push(currentSection);
            }

            currentSection = {
                title: headingText.trim(),
                content: '',
                level: headingLevel,
                startIndex: lineStart,
                endIndex: charIndex,
            };
            currentContent = '';
            currentStartIndex = charIndex;
        } else {
            currentContent += line + '\n';
        }
    }

    // Save last section
    if (currentSection) {
        currentSection.content = currentContent.trim();
        currentSection.endIndex = content.length;
        sections.push(currentSection);
    } else if (currentContent.trim()) {
        // No headings found, create a single section
        sections.push({
            title: 'Document',
            content: currentContent.trim(),
            level: 1,
            startIndex: 0,
            endIndex: content.length,
        });
    }

    return {
        title: sections[0]?.title || 'Untitled Document',
        sections,
    };
}

// Utility: Split text into sentences
export function splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by space or newline
    const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=\n\n)/g;
    const sentences = text.split(sentencePattern);
    return sentences.filter((s) => s.trim().length > 0);
}

// Utility: Split text into paragraphs
export function splitIntoParagraphs(text: string): string[] {
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.filter((p) => p.trim().length > 0);
}

// Utility: Estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
}
