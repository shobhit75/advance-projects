#!/usr/bin/env bash
# DocRAG - PDF & Word Document Semantic Search
# ─────────────────────────────────────────────
set -e

PORT=${PORT:-8000}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════╗"
echo "║         DocRAG - Document Search         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 is required. Install it from https://python.org"
    exit 1
fi

# Install deps if needed
echo "📦 Checking dependencies..."
python3 -c "import fastapi, chromadb, pypdf, docx, uvicorn" 2>/dev/null || {
    echo "Installing required packages..."
    python3 -m pip install fastapi uvicorn chromadb pypdf python-docx python-multipart --quiet
}

echo ""
echo "🚀 Starting DocRAG on http://localhost:$PORT"
echo "   Upload PDFs and Word docs, then search semantically."
echo "   Press Ctrl+C to stop."
echo ""

cd "$SCRIPT_DIR"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT --reload