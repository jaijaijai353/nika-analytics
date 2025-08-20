
from typing import List, Dict, Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
load_dotenv()
from openai import OpenAI

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
from pydantic import BaseModel
import pandas as pd
import numpy as np

# Optional deps guarded to keep server running even if not installed
try:
    from sklearn.ensemble import IsolationForest
except Exception:
    IsolationForest = None

try:
    import statsmodels.api as sm
except Exception:
    sm = None

app = FastAPI(title="Nika AI Analytics API", version="0.1.0")

class InsightsRequest(BaseModel):
    data: List[Dict[str, Any]]

class QueryRequest(BaseModel):
    data: List[Dict[str, Any]]
    question: str

class ForecastRequest(BaseModel):
    data: List[Dict[str, Any]]
    date_column: Optional[str] = None
    target_column: str

class AnomalyRequest(BaseModel):
    data: List[Dict[str, Any]]
    numeric_columns: Optional[List[str]] = None

def _coerce_dataframe(data: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(data)
    # Try parse dates
    for col in df.columns:
        if df[col].dtype == object:
            # attempt numeric cast
            try:
                df[col] = pd.to_numeric(df[col])
                continue
            except Exception:
                pass
            # attempt datetime cast
            try:
                df[col] = pd.to_datetime(df[col])
            except Exception:
                pass
    return df

@app.post("/api/insights")
def insights(req: InsightsRequest):
    df = _coerce_dataframe(req.data)
    result = {"insights": []}

    if df.empty:
        return result

    # Basic profiling
    result["row_count"] = int(len(df))
    result["column_count"] = int(df.shape[1])

    # Numeric summaries
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols[:10]:
        s = df[col].dropna()
        if len(s) == 0: 
            continue
        insight = f"'{col}': mean={s.mean():.2f}, median={s.median():.2f}, std={s.std(ddof=0):.2f}, min={s.min():.2f}, max={s.max():.2f}."
        result["insights"].append(insight)

    # Trend hint for first datetime + numeric
    dt_cols = df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns.tolist()
    if dt_cols and numeric_cols:
        dt = dt_cols[0]
        val = numeric_cols[0]
        ts = df[[dt, val]].dropna().sort_values(dt)
        if len(ts) >= 4:
            first, last = ts[val].iloc[0], ts[val].iloc[-1]
            change = ((last - first) / (first if first else 1)) * 100
            result["insights"].append(f"Time trend on '{val}' shows a {change:.1f}% change from start to end.")
    # Simple correlation
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr().abs().unstack().sort_values(ascending=False)
        corr = corr[corr < 0.999].dropna()
        if not corr.empty:
            (a,b), v = corr.index[0], corr.iloc[0]
            result["insights"].append(f"Strongest correlation: {a} ~ {b} (|r|={v:.2f}).")

    # Quick outliers (IQR) for first few columns
    for col in numeric_cols[:5]:
        s = df[col].dropna()
        if len(s) < 8:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5*iqr, q3 + 1.5*iqr
        outliers = int(((s < lower) | (s > upper)).sum())
        if outliers > 0:
            result["insights"].append(f"{outliers} potential outliers detected in '{col}' via IQR fence.")

    return result

@app.post("/api/query")
async def query_data(req: QueryRequest):
    import json
    import pandas as pd

    df = pd.DataFrame(req.data)

    # Compact context
    preview = df.head(10).to_dict(orient="records")
    schema = list(df.columns)

    user_prompt = f"""
    You are an AI data analyst.
    Dataset schema: {schema}
    Sample rows (first 10): {preview}
    User question: {req.question}

    Task:
    1) Provide a concise, business-friendly answer.
    2) Suggest up to 3 useful visualizations based on the data and question.
    3) Each suggestion must include fields: type (bar/line/pie/scatter/table/none), x, y, category (nullable).

    Respond with JSON ONLY in this exact structure:
    {{
      "answer": "...",
      "suggestions": [
        {{
          "type": "bar/line/pie/scatter/table/none",
          "x": "column_name or null",
          "y": "column_name or null",
          "category": "column_name or null"
        }}
      ]
    }}
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful data analyst that only returns JSON when asked."},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        content = completion.choices[0].message.content
        # try parse JSON
        result = json.loads(content)
    except Exception as e:
        # Fallback minimal answer
        result = {"answer": f"Could not process with GPT: {str(e)}", "suggestions": []}

    return result

@app.post("/api/forecast")
def forecast(req: ForecastRequest):
    df = _coerce_dataframe(req.data)
    target = req.target_column
    dt_col = req.date_column

    if df.empty or target not in df.columns:
        return {"message": "No data or missing target.", "forecast": []}

    if not dt_col:
        # best guess: first datetime column
        dt_candidates = df.select_dtypes(include=["datetime64[ns]","datetime64[ns, UTC]"]).columns.tolist()
        dt_col = dt_candidates[0] if dt_candidates else None

    if dt_col and dt_col in df.columns:
        ts = df[[dt_col, target]].dropna().sort_values(dt_col)
        ts = ts.set_index(dt_col)[target].asfreq(pd.infer_freq(ts[dt_col]) if dt_col in df.columns else None)
    else:
        # Use index as proxy
        ts = df[target].dropna()
        ts.index = pd.RangeIndex(start=0, stop=len(ts), step=1)

    # Try ARIMA
    forecast_values = []
    try:
        if sm is not None and len(ts) >= 8:
            model = sm.tsa.ARIMA(ts.astype(float), order=(1,1,1))
            res = model.fit()
            fc = res.forecast(steps=12)
            forecast_values = [float(v) for v in fc]
        else:
            raise RuntimeError("statsmodels not available or too few points")
    except Exception:
        # Fallback: moving average projection
        window = min(5, max(2, len(ts)//4)) if len(ts) >= 2 else 2
        ma = ts.rolling(window=window).mean().dropna()
        last = float(ma.iloc[-1]) if len(ma) else float(ts.iloc[-1])
        forecast_values = [last for _ in range(12)]

    return {"forecast": forecast_values, "steps": 12}

@app.post("/api/anomaly")
def anomaly(req: AnomalyRequest):
    df = _coerce_dataframe(req.data)
    if df.empty:
        return {"anomalies": []}

    numeric_cols = req.numeric_columns or df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        return {"anomalies": []}

    X = df[numeric_cols].dropna()
    if X.empty:
        return {"anomalies": []}

    anomalies_idx = []
    try:
        if IsolationForest is None:
            raise RuntimeError("sklearn not available")
        model = IsolationForest(random_state=42, contamination="auto")
        model.fit(X)
        pred = model.predict(X)  # -1 = anomaly
        anomalies_idx = X.index[pred == -1].tolist()
    except Exception:
        # Fallback: z-score threshold
        from numpy import mean, std
        z = (X - X.mean()) / (X.std(ddof=0) + 1e-9)
        mask = (np.abs(z) > 3).any(axis=1)
        anomalies_idx = X.index[mask].tolist()

    return {"anomalies": anomalies_idx}
