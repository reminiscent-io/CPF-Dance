-- Run this SQL in your Supabase SQL Editor to update lesson pack pricing

-- Update existing lesson packs with new pricing
UPDATE lesson_packs SET price = 240.00 WHERE name = '2 Lesson Pack';
UPDATE lesson_packs SET price = 550.00 WHERE name = '5 Lesson Pack';
UPDATE lesson_packs SET price = 1000.00 WHERE name = '10 Lesson Pack';

-- Verify the updates
SELECT id, name, lesson_count, price FROM lesson_packs ORDER BY lesson_count;
