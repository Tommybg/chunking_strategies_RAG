import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG Chunking Visualizer | Compare Chunking Strategies",
  description: "Interactive tool to visualize and compare different text chunking strategies for RAG (Retrieval-Augmented Generation) systems. Supports Fixed-Size, Semantic, Recursive, Document Structure, and LLM-based chunking.",
  keywords: ["RAG", "chunking", "text splitting", "embeddings", "vector database", "Qdrant", "Ollama", "NLP"],
  authors: [{ name: "RAG Chunking Visualizer" }],
  openGraph: {
    title: "RAG Chunking Visualizer",
    description: "Compare different RAG chunking strategies in real-time",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
