USE spartang1;

INSERT INTO facilitators (name, email, password_hash, assigned_college, role)
VALUES
('OGC Facilitator One', 'ogc1@spartang.edu', '$2a$10$brINO3BAWe9/TdgNOz6MnO4SJoaOs/rR4JKQzDbM0eSuXPsaaWz2a', 'College of Engineering', 'ogc'),
('OGC Facilitator Two', 'ogc2@spartang.edu', '$2a$10$brINO3BAWe9/TdgNOz6MnO4SJoaOs/rR4JKQzDbM0eSuXPsaaWz2a', 'College of Business', 'ogc')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
password_hash = VALUES(password_hash),
assigned_college = VALUES(assigned_college),
role = VALUES(role);

INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, consent_at)
VALUES
('2024-0001', 'Alex Cruz', 'alex.cruz@spartang.edu', '$2a$10$xezQsKWKx5QAoQH38ZMaquUfwNXEaxJZ28QLTbb4qTC6OHGHtVC5i', 'College of Engineering', '3rd Year', 'Male', 1, NOW()),
('2024-0002', 'Maria Santos', 'maria.santos@spartang.edu', '$2a$10$xezQsKWKx5QAoQH38ZMaquUfwNXEaxJZ28QLTbb4qTC6OHGHtVC5i', 'College of Business', '2nd Year', 'Female', 0, NULL)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
password_hash = VALUES(password_hash),
college = VALUES(college),
year_level = VALUES(year_level),
sex = VALUES(sex),
consent_flag = VALUES(consent_flag),
consent_at = VALUES(consent_at);

INSERT INTO emergency_contacts (title, organization, phone, description, is_critical)
VALUES
('National Crisis Hotline', 'Department of Health', '1553', '24/7 crisis support and suicide prevention', 1),
('Campus Guidance Office', 'SPARTAN-G OGC', '+63 2 555 0110', 'University counseling and referral services', 0),
('Emergency Services', 'Local Emergency Services', '911', 'Immediate emergency response', 1);

-- Seed a conversation and messages for testing between Alex Cruz (student) and OGC Facilitator One
-- This uses subselects to find IDs by email so it is safe to run after the users exist.
INSERT INTO conversations (student_id, facilitator_id)
SELECT s.id, f.id FROM students s, facilitators f
WHERE s.email = 'alex.cruz@spartang.edu' AND f.email = 'ogc1@spartang.edu'
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Insert a couple of initial messages into the conversation_messages table
INSERT INTO conversation_messages (conversation_id, sender_id, sender_role, content)
SELECT c.id, s.id, 'student', 'Hi, I would like to talk about my recent assessment.'
FROM conversations c
JOIN students s ON s.email = 'alex.cruz@spartang.edu'
JOIN facilitators f ON f.email = 'ogc1@spartang.edu'
WHERE c.student_id = s.id AND c.facilitator_id = f.id
LIMIT 1;

INSERT INTO conversation_messages (conversation_id, sender_id, sender_role, content)
SELECT c.id, f.id, 'facilitator', 'Hello Alex — I received your message. When are you available?'
FROM conversations c
JOIN students s ON s.email = 'alex.cruz@spartang.edu'
JOIN facilitators f ON f.email = 'ogc1@spartang.edu'
WHERE c.student_id = s.id AND c.facilitator_id = f.id
LIMIT 1;

-- Dev/test accounts with known password: DevPass123!
-- bcrypt hash for DevPass123!: $2a$10$brINO3BAWe9/TdgNOz6MnO4SJoaOs/rR4JKQzDbM0eSuXPsaaWz2a
INSERT INTO facilitators (name, email, password_hash, assigned_college, role)
VALUES ('Justin Mercado', 'justin.mercado@spartang.edu', '$2a$10$brINO3BAWe9/TdgNOz6MnO4SJoaOs/rR4JKQzDbM0eSuXPsaaWz2a', 'College of Engineering', 'ogc')
ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), assigned_college = VALUES(assigned_college), role = VALUES(role);

INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, consent_at)
VALUES ('2024-0999', 'Dev Student', 'dev.student@spartang.edu', '$2a$10$brINO3BAWe9/TdgNOz6MnO4SJoaOs/rR4JKQzDbM0eSuXPsaaWz2a', 'College of Engineering', '3rd Year', 'Male', 1, NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), college = VALUES(college), year_level = VALUES(year_level), sex = VALUES(sex), consent_flag = VALUES(consent_flag), consent_at = VALUES(consent_at);

