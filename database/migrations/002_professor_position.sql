-- Optional administrative position for professors; preserves all existing records.
ALTER TABLE public.professors
ADD COLUMN IF NOT EXISTS position_th VARCHAR(255);
