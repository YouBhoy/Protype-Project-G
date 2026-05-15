USE spartang1;

INSERT INTO facilitators (name, email, password_hash, assigned_college, role)
VALUES
('OGC Facilitator One', 'ogc1@spartang.edu', '$2a$10$JR0Q8fezr1x.PSs.CelnHeOBbudpW3LBdDyXq/f9fayf6jQlbli9u', 'College of Engineering', 'ogc'),
('OGC Facilitator Two', 'ogc2@spartang.edu', '$2a$10$JR0Q8fezr1x.PSs.CelnHeOBbudpW3LBdDyXq/f9fayf6jQlbli9u', 'College of Business', 'ogc');

INSERT INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, consent_at)
VALUES
('2024-0001', 'Alex Cruz', 'alex.cruz@spartang.edu', '$2a$10$xezQsKWKx5QAoQH38ZMaquUfwNXEaxJZ28QLTbb4qTC6OHGHtVC5i', 'College of Engineering', '3rd Year', 'Male', 1, NOW()),
('2024-0002', 'Maria Santos', 'maria.santos@spartang.edu', '$2a$10$xezQsKWKx5QAoQH38ZMaquUfwNXEaxJZ28QLTbb4qTC6OHGHtVC5i', 'College of Business', '2nd Year', 'Female', 0, NULL);

INSERT INTO emergency_contacts (title, organization, phone, description, is_critical)
VALUES
('National Crisis Hotline', 'Department of Health', '1553', '24/7 crisis support and suicide prevention', 1),
('Campus Guidance Office', 'SPARTAN-G OGC', '+63 2 555 0110', 'University counseling and referral services', 0),
('Emergency Services', 'Local Emergency Services', '911', 'Immediate emergency response', 1);