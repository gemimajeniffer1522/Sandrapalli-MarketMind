"""
Sandrapalli MarketMind - Flask Backend
Run: python app.py
Install deps: pip install flask flask-cors yfinance numpy
"""

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import json
import math
import random
import time
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ─── Try importing yfinance; fall back to simulated data ───────────────────────
try:
    import yfinance as yf
    import numpy as np
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

# ─── Simulated price data generator ───────────────────────────────────────────
MOCK_BASES = {
    "AAPL": 189.30, "MSFT": 415.60, "GOOGL": 175.40, "TSLA": 248.50,
    "NVDA": 875.20, "AMZN": 198.70, "RELIANCE.NS": 2847.60,
    "TCS.NS": 3921.40, "INFY.NS": 1642.80, "META": 578.30,
    "NFLX": 892.10, "AMD": 168.40, "INTC": 43.20, "BABA": 84.50,
}

def simulate_price_series(base_price, days=90, volatility=0.018):
    """Generate a realistic-looking price series using GBM."""
    prices = [base_price]
    for _ in range(days - 1):
        change = prices[-1] * (1 + random.gauss(0.0003, volatility))
        prices.append(round(change, 2))
    return prices

def get_mock_quote(symbol):
    base = MOCK_BASES.get(symbol.upper(), 100 + random.uniform(0, 900))
    change_pct = random.uniform(-3.5, 3.5)
    price = round(base * (1 + change_pct / 100), 2)
    change = round(price - base, 2)
    volume = random.randint(8_000_000, 120_000_000)
    market_cap = round(price * random.randint(500_000_000, 15_000_000_000) / 1e9, 2)
    pe = round(random.uniform(12, 65), 2)
    week52_low = round(price * random.uniform(0.6, 0.9), 2)
    week52_high = round(price * random.uniform(1.05, 1.6), 2)
    return {
        "symbol": symbol.upper(),
        "price": price,
        "change": change,
        "changePercent": round(change_pct, 2),
        "volume": volume,
        "marketCap": market_cap,
        "pe": pe,
        "week52Low": week52_low,
        "week52High": week52_high,
        "currency": "INR" if symbol.upper().endswith(".NS") else "USD",
        "exchange": "NSE" if symbol.upper().endswith(".NS") else ("NASDAQ" if symbol.upper() in ["AAPL","MSFT","GOOGL","TSLA","NVDA","AMZN","META","NFLX","AMD","INTC"] else "NYSE"),
        "source": "simulated"
    }

def get_real_quote(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="1d", interval="1m")
        price = info.get("currentPrice") or info.get("regularMarketPrice") or (hist["Close"].iloc[-1] if not hist.empty else None)
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose", price)
        if not price:
            return get_mock_quote(symbol)
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
        return {
            "symbol": symbol.upper(),
            "price": round(price, 2),
            "change": change,
            "changePercent": change_pct,
            "volume": info.get("volume", 0),
            "marketCap": round(info.get("marketCap", 0) / 1e9, 2),
            "pe": round(info.get("trailingPE", 0), 2),
            "week52Low": info.get("fiftyTwoWeekLow", 0),
            "week52High": info.get("fiftyTwoWeekHigh", 0),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", "UNKNOWN"),
            "longName": info.get("longName", symbol),
            "sector": info.get("sector", "Unknown"),
            "source": "live"
        }
    except Exception as e:
        return get_mock_quote(symbol)

def get_price_history(symbol, period="3mo"):
    if YFINANCE_AVAILABLE:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            if not hist.empty:
                dates = [str(d.date()) for d in hist.index]
                closes = [round(float(v), 2) for v in hist["Close"].values]
                volumes = [int(v) for v in hist["Volume"].values]
                return {"dates": dates, "closes": closes, "volumes": volumes, "source": "live"}
        except:
            pass
    # Fallback simulated
    base = MOCK_BASES.get(symbol.upper(), 150.0)
    days = 90 if period == "3mo" else (180 if period == "6mo" else 252)
    prices = simulate_price_series(base, days)
    today = datetime.now()
    dates = [(today - timedelta(days=days - i)).strftime("%Y-%m-%d") for i in range(days)]
    volumes = [random.randint(5_000_000, 80_000_000) for _ in range(days)]
    return {"dates": dates, "closes": prices, "volumes": volumes, "source": "simulated"}

def compute_lstm_signals(closes):
    """Compute technical indicators that mimic LSTM output signals."""
    n = len(closes)
    if n < 20:
        return {"signal": "HOLD", "confidence": 50, "predicted_price": closes[-1]}
    # Simple Moving Averages
    sma20 = sum(closes[-20:]) / 20
    sma50 = sum(closes[-50:]) / 50 if n >= 50 else sum(closes) / n
    # RSI
    gains, losses = [], []
    for i in range(1, min(15, n)):
        d = closes[-i] - closes[-(i+1)]
        (gains if d > 0 else losses).append(abs(d))
    avg_gain = sum(gains) / 14 if gains else 0
    avg_loss = sum(losses) / 14 if losses else 0.001
    rsi = 100 - (100 / (1 + avg_gain / avg_loss))
    # MACD
    ema12 = closes[-1]
    ema26 = closes[-1]
    for i in range(1, min(26, n)):
        alpha12 = 2 / (12 + 1)
        alpha26 = 2 / (26 + 1)
        ema12 = closes[-(i+1)] * alpha12 + ema12 * (1 - alpha12)
        ema26 = closes[-(i+1)] * alpha26 + ema26 * (1 - alpha26)
    macd = ema12 - ema26
    # Volatility
    returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(max(1, n-20), n)]
    avg_ret = sum(returns) / len(returns)
    vol = math.sqrt(sum((r - avg_ret)**2 for r in returns) / len(returns)) * math.sqrt(252)
    # Signal logic
    score = 0
    if closes[-1] > sma20: score += 1
    if sma20 > sma50: score += 1
    if rsi < 35: score += 2
    elif rsi > 65: score -= 2
    if macd > 0: score += 1
    else: score -= 1
    if score >= 3: signal, confidence = "STRONG BUY", min(92, 70 + score * 4)
    elif score >= 1: signal, confidence = "BUY", min(80, 60 + score * 5)
    elif score <= -3: signal, confidence = "STRONG SELL", min(88, 68 + abs(score) * 4)
    elif score <= -1: signal, confidence = "SELL", min(75, 58 + abs(score) * 5)
    else: signal, confidence = "HOLD", 55
    # Predicted price (simple mean reversion + momentum)
    momentum = (closes[-1] - closes[-5]) / closes[-5] if n >= 5 else 0
    predicted = round(closes[-1] * (1 + momentum * 0.3 + 0.002), 2)
    return {
        "signal": signal,
        "confidence": round(confidence, 1),
        "predicted_price": predicted,
        "rsi": round(rsi, 1),
        "sma20": round(sma20, 2),
        "sma50": round(sma50, 2),
        "macd": round(macd, 4),
        "volatility": round(vol * 100, 1),
        "score": score
    }

def compute_sentiment():
    """Simulate NLP sentiment scores."""
    base = random.uniform(40, 85)
    return {
        "overall": round(base, 1),
        "news": round(base + random.uniform(-10, 10), 1),
        "social": round(base + random.uniform(-15, 15), 1),
        "analyst": round(base + random.uniform(-8, 8), 1),
        "label": "BULLISH" if base > 60 else ("BEARISH" if base < 45 else "NEUTRAL")
    }

# ─── API Routes ────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/quote/<symbol>")
def quote(symbol):
    symbol = symbol.upper().strip()
    if YFINANCE_AVAILABLE:
        data = get_real_quote(symbol)
    else:
        data = get_mock_quote(symbol)
    return jsonify(data)

@app.route("/api/analyze/<symbol>")
def analyze(symbol):
    symbol = symbol.upper().strip()
    period = request.args.get("period", "3mo")
    quote_data = get_real_quote(symbol) if YFINANCE_AVAILABLE else get_mock_quote(symbol)
    history = get_price_history(symbol, period)
    closes = history["closes"]
    lstm = compute_lstm_signals(closes)
    sentiment = compute_sentiment()
    support = round(min(closes[-20:]) * 0.99, 2) if len(closes) >= 20 else closes[-1] * 0.95
    resistance = round(max(closes[-20:]) * 1.01, 2) if len(closes) >= 20 else closes[-1] * 1.05
    return jsonify({
        "quote": quote_data,
        "history": history,
        "lstm": lstm,
        "sentiment": sentiment,
        "support": support,
        "resistance": resistance,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

@app.route("/api/ticker-data")
def ticker_data():
    symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMZN", "META", "RELIANCE.NS", "TCS.NS", "INFY.NS"]
    results = []
    for s in symbols:
        q = get_mock_quote(s)
        results.append({"symbol": s, "price": q["price"], "changePercent": q["changePercent"]})
    return jsonify(results)

@app.route("/api/portfolio", methods=["POST"])
def portfolio():
    holdings = request.json.get("holdings", [])
    results = []
    total_value = 0
    total_cost = 0
    for h in holdings:
        sym = h.get("symbol", "").upper()
        qty = float(h.get("quantity", 0))
        avg_cost = float(h.get("avgCost", 0))
        q = get_real_quote(sym) if YFINANCE_AVAILABLE else get_mock_quote(sym)
        current_val = q["price"] * qty
        cost_val = avg_cost * qty
        pnl = current_val - cost_val
        pnl_pct = (pnl / cost_val * 100) if cost_val else 0
        hist = get_price_history(sym, "1mo")
        lstm = compute_lstm_signals(hist["closes"])
        results.append({
            "symbol": sym,
            "quantity": qty,
            "avgCost": avg_cost,
            "currentPrice": q["price"],
            "currentValue": round(current_val, 2),
            "pnl": round(pnl, 2),
            "pnlPercent": round(pnl_pct, 2),
            "signal": lstm["signal"],
            "confidence": lstm["confidence"],
            "change": q["change"],
            "changePercent": q["changePercent"]
        })
        total_value += current_val
        total_cost += cost_val
    return jsonify({
        "holdings": results,
        "totalValue": round(total_value, 2),
        "totalCost": round(total_cost, 2),
        "totalPnl": round(total_value - total_cost, 2),
        "totalPnlPercent": round((total_value - total_cost) / total_cost * 100, 2) if total_cost else 0
    })

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    print("=" * 60)
    print("  Sandrapalli's MarketMind v2.0")
    print(f"  yfinance: {'LIVE DATA' if YFINANCE_AVAILABLE else 'simulated'}")
    print(f"  Running at http://0.0.0.0:{port}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=debug)


