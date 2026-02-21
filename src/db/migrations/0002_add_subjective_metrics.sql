-- Add subjective metrics columns to daily_wellness
ALTER TABLE daily_wellness ADD COLUMN sleep_score INTEGER CHECK(sleep_score IS NULL OR (sleep_score >= 1 AND sleep_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN fatigue_score INTEGER CHECK(fatigue_score IS NULL OR (fatigue_score >= 1 AND fatigue_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN muscle_soreness_score INTEGER CHECK(muscle_soreness_score IS NULL OR (muscle_soreness_score >= 1 AND muscle_soreness_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN stress_score INTEGER CHECK(stress_score IS NULL OR (stress_score >= 1 AND stress_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN mood_score INTEGER CHECK(mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 5));
ALTER TABLE daily_wellness ADD COLUMN diet_score INTEGER CHECK(diet_score IS NULL OR (diet_score >= 1 AND diet_score <= 5));
