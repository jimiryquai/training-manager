### 1\. Product Requirements Document (PRD): Backend Data & API

**Vision:** A solo-first, SaaS-ready concurrent training manager that tracks endurance and strength sessions under a unified training load model, while monitoring fatigue through daily wellness metrics.

**Core Features (v1 Backend Focus):**

* **Unified Training Load:** All sessions (strength and endurance) must calculate a "Training Load" score by multiplying the session's duration in minutes by the user's Session RPE (Borg 1-10 scale).  
* **Modality Categorization:** Sessions must be tagged by modality (e.g., Strength, Rowing, Running) to allow for future external load tracking.  
* **Fatigue & Readiness Tracking:** Users will manually log morning metrics: Resting Heart Rate (RHR) and Heart Rate Variability (HRV), specifically the rMSSD..  
* **Strain Monitoring (ACWR):** The system must calculate the Acute:Chronic Workload Ratio (ACWR) comparing the 7-day acute load against the 28-day chronic load. A warning state should be flagged if the ratio exceeds 1.5.

