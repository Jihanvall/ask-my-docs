# Ask My Docs

![CI](https://github.com/Jihanvall/ask-my-docs/actions/workflows/ci.yml/badge.svg)

A question-answering system over your own documents. You upload a `.txt`, `.md` or text-based `.pdf` file, ask a question, and get an answer with the sources it came from. If the documents do not contain the answer, it says so instead of guessing.

## How it works

1. **Loading** (`src/loader.py`): reads the file and extracts its text. Scanned PDFs without readable text are rejected with a clear message.
2. **Chunking** (`src/chunker.py`): splits the text into overlapping chunks of words, each keeping its source file and position.
3. **Retrieval**: finds the chunks closest to the question. Three methods are available:
   - TF-IDF (`src/retriever.py`): matches words, runs locally.
   - Embeddings (`src/embedding_retriever.py`): matches meaning using Gemini embeddings.
   - Hybrid (`src/hybrid_retriever.py`): combines both rankings with reciprocal rank fusion.
4. **Answering** (`src/answerer.py`): sends the question and the top chunks to Gemini, which must answer only from them and cite the excerpts. With no relevant chunk, it answers "I don't know" without calling Gemini.
5. **API and interface**: a FastAPI backend (`api.py`) and a React page (`frontend/`).

## Setup

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `GEMINI_API_KEY` | none | Gemini API key (required) |
| `MAX_UPLOAD_MB` | `10` | Maximum size of an uploaded file |
| `SESSION_TTL_SECONDS` | `3600` | How long an indexed document stays in memory |
| `MAX_SESSIONS` | `20` | Maximum documents kept in memory, oldest removed first |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed CORS origins |

## Usage

Start the backend:

```
uvicorn api:app --reload
```

Start the frontend in a second terminal:

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, upload a document and ask a question. The API documentation is at `http://127.0.0.1:8000/docs`.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Status and number of indexed documents |
| POST | `/documents` | Uploads a file and indexes it, returns a `session_id` |
| POST | `/ask` | Answers a question for a `session_id`, with sources |

## Evaluation

16 questions over one document (12 answerable, 4 unanswerable), run with `gemini-3.5-flash-lite`:

| Metric | Result |
| --- | --- |
| Hit rate | 100% |
| Keyword accuracy | 91.7% |
| Correct refusals | 100% |

Run it with `python run_eval.py` (it needs `data/readme.md`).

### Retrieval methods

A hit means a retrieved chunk contains the expected keywords (12 answerable questions):

| Method | k=1 | k=3 |
| --- | --- | --- |
| TF-IDF | 0.75 | 1.00 |
| Gemini embedding | 0.50 | 0.58 |
| Hybrid | 0.75 | 1.00 |

Compare them with `python compare_retrievers.py`.

TF-IDF did best on this technical document, which is full of exact names and numbers. The hybrid matched it and was not hurt by the weaker embedding results. For a reworded question ("language model" versus "LLM"), the embedding ranked the right chunk first, TF-IDF second, and the hybrid kept it first.

## Known limitations

- The sample is small and written from the same document, so the numbers are indicative only.
- Keyword search misses reworded questions on its own.
- Embeddings and answers need Gemini, whose free tier has daily request limits.
- Indexed documents live in server memory and are lost on restart.

## Tests

```
pytest -v
```

The tests use fake Gemini responses, so they need no API key. GitHub Actions runs them on every push and pull request.

## Project structure

```
api.py                  FastAPI backend
src/                    loader, chunker, retrievers, answerer, evaluation
frontend/               React page
eval/questions.json     evaluation questions
run_eval.py             answer evaluation
compare_retrievers.py   retrieval comparison
tests/                  pytest suite
```