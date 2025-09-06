-- Comprehensive cleanup script to remove ALL booking data and logs
-- WARNING: This will permanently delete all booking requests and related data
-- Use with caution - this is for testing purposes only

-- Show what we're about to delete
SELECT 'Current booking requests count:' as info;
SELECT COUNT(*) as total_requests FROM booking_requests;

SELECT 'Current booking requests by status:' as info;
SELECT status, COUNT(*) as count 
FROM booking_requests 
GROUP BY status 
ORDER BY status;

-- Show recent requests
SELECT 'Recent booking requests (last 10):' as info;
SELECT id, requested_by, purpose, status, created_at 
FROM booking_requests 
ORDER BY created_at DESC 
LIMIT 10;

-- Delete all booking requests (this will cascade to related records if FK constraints exist)
DELETE FROM booking_requests;

-- If there are any audit/log tables, clear them too
-- (Uncomment if these tables exist)
-- DELETE FROM booking_logs WHERE table_name = 'booking_requests';
-- DELETE FROM audit_trail WHERE entity_type = 'booking_request';
-- DELETE FROM system_logs WHERE module = 'booking';

-- Reset auto-increment counter for booking_requests
ALTER TABLE booking_requests AUTO_INCREMENT = 1;

-- Show final state
SELECT 'Final booking requests count:' as info;
SELECT COUNT(*) as total_requests FROM booking_requests;

SELECT 'Cleanup completed successfully!' as status;
