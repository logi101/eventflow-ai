
-- Upgrade Admin User to Premium/Unlimited
-- User: ew5933070@gmail.com

UPDATE organizations
SET 
    -- 1. Set to Premium Tier
    tier = 'premium',
    
    -- 2. Set Limits to "Infinity" (just in case)
    tier_limits = '{
        "events_per_year": 999999, 
        "participants_per_event": 999999, 
        "messages_per_month": 999999, 
        "ai_chat_messages_per_month": 999999
    }'::jsonb,

    -- 3. Reset Current Usage warning flags
    current_usage = jsonb_set(
        current_usage, 
        '{warned_this_month}', 
        'false'::jsonb
    )
WHERE id = (
    SELECT organization_id 
    FROM user_profiles 
    WHERE email = 'ew5933070@gmail.com'
    LIMIT 1
);

-- Verification: Show the result
SELECT id, name, tier, tier_limits 
FROM organizations 
WHERE id = (
    SELECT organization_id 
    FROM user_profiles 
    WHERE email = 'ew5933070@gmail.com'
);
