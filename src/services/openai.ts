// OpenAI Service for Embeddings and LLM-based Chunking
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(apiKey: string): OpenAI {
    if (!openaiClient || openaiClient.apiKey !== apiKey) {
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

export async function generateOpenAIEmbedding(
    text: string,
    apiKey: string,
    model: string = 'text-embedding-3-small'
): Promise<number[]> {
    try {
        const client = getOpenAIClient(apiKey);
        const response = await client.embeddings.create({
            model,
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Failed to generate OpenAI embedding:', error);
        throw error;
    }
}

export async function generateOpenAIEmbeddings(
    texts: string[],
    apiKey: string,
    model: string = 'text-embedding-3-small'
): Promise<number[][]> {
    try {
        const client = getOpenAIClient(apiKey);
        const response = await client.embeddings.create({
            model,
            input: texts,
        });
        return response.data.map((d) => d.embedding);
    } catch (error) {
        console.error('Failed to generate OpenAI embeddings:', error);
        throw error;
    }
}

export async function llmChunking(
    text: string,
    apiKey: string,
    targetChunks: number = 10,
    model: string = 'gpt-4o-mini'
): Promise<string[]> {
    try {
        const client = getOpenAIClient(apiKey);

        const prompt = `You are a text segmentation expert. Your task is to divide the following text into approximately ${targetChunks} semantically coherent chunks.

Rules:
1. Each chunk should contain a complete thought or topic
2. Preserve the natural flow and meaning of the text
3. Chunks should be roughly similar in size
4. Do not add or remove any content from the original text
5. Return ONLY a JSON array of strings, where each string is a chunk

Text to chunk:
"""
${text}
"""

Return the chunks as a valid JSON array of strings. Do not include any other text or explanation.`;

        const response = await client.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise text segmentation assistant. You always return valid JSON arrays.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 4000,
        });

        const content = response.choices[0]?.message?.content || '[]';

        // Try to parse the JSON response
        try {
            // Clean up the response (remove markdown code blocks if present)
            const cleanedContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const chunks = JSON.parse(cleanedContent);

            if (!Array.isArray(chunks)) {
                throw new Error('Response is not an array');
            }

            return chunks.filter((chunk): chunk is string => typeof chunk === 'string');
        } catch (parseError) {
            console.error('Failed to parse LLM response:', parseError);
            // Fallback: split by double newlines
            return text.split(/\n\n+/).filter((chunk) => chunk.trim().length > 0);
        }
    } catch (error) {
        console.error('Failed to perform LLM chunking:', error);
        throw error;
    }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const client = getOpenAIClient(apiKey);
        // Make a minimal API call to validate the key
        await client.models.list();
        return true;
    } catch {
        return false;
    }
}
