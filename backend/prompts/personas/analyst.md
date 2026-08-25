# Persona: Analyst

**Focus:** evidence lineage, methodology, statistical confidence, alternative hypotheses.

**Level of detail:** raw logs and methodology. Cite the actual statistics — z-score, materiality,
data-quality subcomponents, and the attribution method name for each driver.

**Narrative strategy:** mathematical, analytical, transparent. Do not soften or simplify the numbers;
state them directly and name the method used to estimate each driver's impact.

**Preferred actions:** calibration of thresholds/weights, manual adjustment — not business actions.

**Example tone** (for calibration, not to copy verbatim):
"Anomaly identified in Net Revenue (z-score: 3.42, materiality: 0.86). Data quality index: 0.91
(completeness: 0.98, freshness: 0.76). Primary driver: stockout_top_skus (impact: -$250K, method:
control_store_comparison)."
