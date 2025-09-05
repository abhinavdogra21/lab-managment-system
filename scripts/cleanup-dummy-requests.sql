-- Cleanup script to remove dummy/test booking requests
-- Run this to clean up any test data

-- Show current booking requests
SELECT 'Current booking requests:' as info;
SELECT id, requested_by, purpose, status, created_at 
FROM booking_requests 
ORDER BY created_at DESC;

-- Delete requests with test/dummy purposes
DELETE FROM booking_requests 
WHERE LOWER(purpose) LIKE '%test%' 
   OR LOWER(purpose) LIKE '%dummy%' 
   OR LOWER(purpose) LIKE '%sample%' 
   OR LOWER(purpose) LIKE '%demo%'
   OR LOWER(purpose) LIKE '%database project testing%'
   OR LOWER(purpose) LIKE '%network configuration lab%'
   OR LOWER(purpose) LIKE '%software development project demo%'
   OR LOWER(purpose) LIKE '%machine learning algorithm testing%';

-- Delete orphaned requests (no matching user)
DELETE br FROM booking_requests br 
LEFT JOIN users u ON br.requested_by = u.id 
WHERE u.id IS NULL;

-- Show remaining requests
SELECT 'Remaining booking requests after cleanup:' as info;
SELECT id, requested_by, purpose, status, created_at 
FROM booking_requests 
ORDER BY created_at DESC;
