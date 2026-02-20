# Sandrapalli's MarketMind v2.0
**AI-Powered Stock Intelligence Platform**

LSTM Neural Network · NLP Sentiment · Real-Time Decisions

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the server
```bash
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

---

## Project Structure

```
marketmind/
├── app.py                  # Flask backend (API + server)
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML page
└── static/
    ├── css/
    │   └── style.css       # Dark terminal stylesheet
    └── js/
        └── app.js          # Frontend logic
```

---

## Features

- **Single Stock Analysis** — Enter any stock symbol (AAPL, TSLA, RELIANCE.NS…) for full AI analysis
- **LSTM Signals** — BUY / SELL / HOLD with confidence score based on RSI, MACD, SMA, volatility
- **NLP Sentiment** — Overall, News, Social, Analyst sentiment gauges
- **Price Chart** — Interactive historical chart with 1M / 3M / 6M / 1Y periods
- **Portfolio Analyzer** — Enter your holdings to see P&L, current value, and signals per stock
- **Live Ticker** — Scrolling market ticker with real-time price updates
- **Live UTC Clock**

---

## Data

- With `yfinance` installed (included in requirements): **live real-time data** from Yahoo Finance
- Without yfinance or when offline: **realistic simulated data** — the app still fully functions

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/quote/:symbol` | Live quote for a symbol |
| `GET /api/analyze/:symbol?period=3mo` | Full analysis (quote + LSTM + sentiment + history) |
| `GET /api/ticker-data` | Ticker bar data for common symbols |
| `POST /api/portfolio` | Analyze a portfolio (body: `{ holdings: [...] }`) |

### Portfolio request body example
```json
{
  "holdings": [
    { "symbol": "AAPL", "quantity": 10, "avgCost": 175.00 },
    { "symbol": "TSLA", "quantity": 5, "avgCost": 220.00 }
  ]
}
```

---

## Notes

- For educational purposes only — not financial advice
- LSTM signals are computed from technical indicators (RSI, MACD, SMA, volatility)
- Sentiment scores are simulated; integrate a real NLP API for production use
