-- Add exercise_type column to exercise_dictionary
ALTER TABLE exercise_dictionary ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'dynamic'
  CHECK (exercise_type IN ('dynamic', 'isometric', 'eccentric'));

-- Add benchmark_target column (will replace master_exercise_id)
ALTER TABLE exercise_dictionary ADD COLUMN benchmark_target TEXT;

-- Add benchmark_value and benchmark_unit to user_benchmarks
ALTER TABLE user_benchmarks ADD COLUMN benchmark_value REAL;
ALTER TABLE user_benchmarks ADD COLUMN benchmark_unit TEXT;

-- Migrate existing data: copy one_rep_max_weight to benchmark_value
UPDATE user_benchmarks SET 
  benchmark_value = one_rep_max_weight,
  benchmark_unit = 'kg'
WHERE benchmark_value IS NULL;

-- Migrate master_exercise_id to benchmark_target by looking up exercise names
-- (For existing data, we'll copy the master exercise name as benchmark_target)
UPDATE exercise_dictionary 
SET benchmark_target = (
  SELECT ed2.name 
  FROM exercise_dictionary ed2 
  WHERE ed2.id = exercise_dictionary.master_exercise_id
)
WHERE master_exercise_id IS NOT NULL;

-- Create index on new columns
CREATE INDEX idx_exercise_dictionary_benchmark_target ON exercise_dictionary(benchmark_target);
CREATE INDEX idx_user_benchmarks_benchmark_unit ON user_benchmarks(benchmark_unit);
