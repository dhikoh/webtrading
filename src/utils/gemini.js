import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Sends a base64 encoded screenshot of a chart to Gemini 1.5 Flash for vision technical analysis.
 */
export async function analyzeChartImageWithGemini(apiKey, imageBase64, mimeType = 'image/png') {
  if (!apiKey) {
    return { success: false, error: "API Key is required" };
  }

  const startTime = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert crypto futures technical analyst. Analyze the attached trading chart screenshot.
      Locate and extract any indicators (EMA, RSI, MACD, Bollinger Bands), candlestick shapes, support/resistance levels, trendline breakouts, or market structures.
      Return the analysis STRICTLY in JSON format with no Markdown tags.
      Response must look exactly like this:
      {
        "detectedTicker": "BTCUSDT or other symbol",
        "detectedTimeframe": "1H, 4H, 1D, etc.",
        "detectedPrice": 12345.67,
        "tickerConfidence": 95, // Estimate detection confidence from 0 to 100
        "timeframeConfidence": 92, // Estimate timeframe detection confidence from 0 to 100
        "patternConfidence": 88, // Estimate pattern detection confidence from 0 to 100
        "chartPatterns": ["Bullish Flag", "Double Bottom", "Head and Shoulders", etc.],
        "candlestickPatterns": ["Hammer", "Engulfing", "Doji", etc.],
        "trendlines": "Short description of any visual trendline breakouts/breakdowns",
        "keyObservations": ["Detail 1", "Detail 2"],
        "criticalRisks": ["Risk factor 1", "Risk factor 2"]
      }
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    return {
      success: true,
      data: parsedData,
      latency: Date.now() - startTime,
      error: null
    };
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return {
      success: false,
      data: null,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Generates natural language analysis explanation using structured technical inputs.
 */
export async function generateAIExplanation(apiKey, asset, timeframe, programSignal, scoreComponents, regime) {
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert risk-averse crypto trading coach. Explain this trading setup to a user.
      
      Asset: ${asset}
      Timeframe: ${timeframe}
      Market Regime: ${regime}
      Programmatic Signal Recommendation: ${programSignal}
      Calculated Technical Scores:
      ${JSON.stringify(scoreComponents, null, 2)}
      
      Provide a highly professional explanation in Indonesian:
      1. Explain why this setup is valid or why it is marked NO TRADE.
      2. Detail the exact risks (cons) that the user must watch out for (e.g. key resistance near, upcoming session, volume tapering).
      3. List the positive confluences (pros).
      
      Return your explanation strictly in JSON format (no markdown blocks):
      {
        "pros": ["Reason 1", "Reason 2"],
        "cons": ["Risk 1", "Risk 2"],
        "summary": "Full natural language explanation paragraph"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return null;
  }
}
