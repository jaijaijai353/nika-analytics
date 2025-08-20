
# Nika AI Add-on

This adds a lightweight **FastAPI** backend to power AI analytics without changing your existing UI.

## Run Backend (Python 3.10+ recommended)

```bash
cd server
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend

Your existing Vite app remains unchanged. Components like `AIInsights` can call:
- `POST http://localhost:8000/api/insights`
- `POST http://localhost:8000/api/query`
- `POST http://localhost:8000/api/forecast`
- `POST http://localhost:8000/api/anomaly`

### Request format

Each endpoint expects JSON like:
```json
{ "data": [ { "col1": 1, "col2": "2024-01-01" }, ... ] }
```

For `/api/query` add `"question": "top 5 by revenue"`

For `/api/forecast` add `"target_column": "sales"` and optionally `"date_column"`.

## Notes

- Heavy dependencies (sklearn, statsmodels) are optional at runtime — the API falls back gracefully.
- This keeps **colors/layout** intact; only functionality is added.


## 🔌 GPT-powered ChatWithData (Optional)
To enable GPT answers and multi-chart suggestions:

1. Install server deps:
   ```bash
   pip install -r server/requirements.txt
   ```
2. Set your API key (bash):
   ```bash
   export OPENAI_API_KEY=your_key
   ```
   On Windows PowerShell:
   ```powershell
   $env:OPENAI_API_KEY="your_key"
   ```
3. Run backend:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
4. Start frontend (in project root):
   ```bash
   npm install
   npm run dev
   ```

If no API key is set, local AI features still work; only ChatWithData's GPT mode is disabled.


---

## 🔑 API Key Setup

This project requires an **OpenAI API key** to enable AI features.

### Local Development
1. Go to `project/server/` and create a file named `.env`
2. Add your key inside it:
   ```env
   OPENAI_API_KEY=sk-your_api_key_here
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install python-dotenv
   ```
4. Start the backend:
   ```bash
   uvicorn main:app --reload
   ```
5. Start the frontend:
   ```bash
   npm install
   npm run dev
   ```

### GitHub & Deployment
- The `.env` file is **ignored by Git** (`.gitignore` updated).
- For deployment (e.g., Vercel, Render, Railway, Docker, etc.), set the `OPENAI_API_KEY` as an **environment variable** in your hosting dashboard or GitHub Actions secrets.
- The backend will automatically detect it.

---
