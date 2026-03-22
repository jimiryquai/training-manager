---
module: logic
problem_type: logic_error
tags: ["acwr", "historical", "calculation", "testing"]
---
### [2026-03-21] ACWR Historical Calculation Testing Critical Insight
When testing ACWR (Acute:Chronic Workload Ratio) calculations:

1. **Historical ACWR calculates per-day ratios**
   - `calculateHistoricalACWR` computes a DIFFERENT ratio for EACH day
   - Each day uses only sessions up to and including that day
   - This is CRITICAL for accurate chart data

2. **Trend detection compares first half to second half**
   - Uses midpoint split of ratios array
   - Threshold: 0.1 difference triggers "increasing" or "decreasing"
   - Consistent training starting from zero shows "decreasing" trend (chronic load builds up)

3. **Chronic load uses 28-day window averaged over 4 weeks**
   - Formula: sum(28 days of load) / 4
   - With sparse data, single high-load sessions dominate
   - Test with enough data (14+ days) for meaningful trends

4. **Zone classification**
   - Danger zone: ratio > 1.5
   - Optimal zone: 0.8 <= ratio <= 1.3
   - Under-training: ratio < 0.8
   - When ratio = 0 (no data), counts as under-training

5. **Test scenario construction**
   - Use clear "high to low" or "low to high" patterns
   - Allow at least 7 days per half for trend detection
   - Verify the LOGIC works, not specific numeric scenarios
