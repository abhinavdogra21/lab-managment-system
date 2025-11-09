-- Query to view component request reminder history
SELECT 
    crr.id,
    crr.request_id,
    cr.requester_id,
    u_requester.name as requester_name,
    u_requester.email as requester_email,
    cr.lab_id,
    l.name as lab_name,
    crr.sent_at,
    crr.sent_by_id,
    u_sender.name as sent_by_name,
    u_sender.email as sent_by_email,
    cr.issued_at,
    cr.return_date as expected_return_date,
    DATEDIFF(NOW(), cr.return_date) as days_overdue
FROM component_request_reminders crr
JOIN component_requests cr ON cr.id = crr.request_id
JOIN users u_requester ON u_requester.id = cr.requester_id
JOIN users u_sender ON u_sender.id = crr.sent_by_id
JOIN labs l ON l.id = cr.lab_id
ORDER BY crr.sent_at DESC
LIMIT 50;

-- Query to view component loan reminder history
SELECT 
    clr.id,
    clr.loan_id,
    cl.requester_id,
    u_requester.name as requester_name,
    u_requester.email as requester_email,
    cl.lab_id,
    l.name as lab_name,
    clr.sent_at,
    clr.sent_by_id,
    u_sender.name as sent_by_name,
    u_sender.email as sent_by_email,
    cl.issued_at,
    cl.due_date,
    DATEDIFF(NOW(), cl.due_date) as days_overdue
FROM component_loan_reminders clr
JOIN component_loans cl ON cl.id = clr.loan_id
JOIN users u_requester ON u_requester.id = cl.requester_id
JOIN users u_sender ON u_sender.id = clr.sent_by_id
JOIN labs l ON l.id = cl.lab_id
ORDER BY clr.sent_at DESC
LIMIT 50;
