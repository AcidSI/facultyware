-- Dummy employee untuk placeholder (diisi admin nanti)
INSERT INTO users (id, name, email, password, created_at, updated_at)
VALUES (1, 'Admin Sistem', 'admin@facultyware.ac.id',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usl.2DIs', NOW(), NOW())
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO employees (
  id, employee_number, name, birth_place, birth_date,
  gender, marital_status, address, hire_date,
  organization_unit_id, employment_status_id, status,
  created_at, updated_at
) VALUES (
  1, 'EMP-0001', 'Admin Sistem', 'Jakarta', '1980-01-01',
  'male', 'single', '-', '2020-01-01',
  1, 1, 'active', NOW(), NOW()
) ON DUPLICATE KEY UPDATE id=id;

-- Permissions
INSERT IGNORE INTO permissions (name, guard_name, created_at, updated_at) VALUES
('view-requests', 'web', NOW(), NOW()),
('create-request', 'web', NOW(), NOW()),
('cancel-request', 'web', NOW(), NOW());

-- Role student
INSERT IGNORE INTO roles (name, guard_name, created_at, updated_at)
VALUES ('student', 'web', NOW(), NOW());

-- Hubungkan permissions ke role student
INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id 
FROM permissions p, roles r
WHERE p.name IN ('view-requests', 'create-request', 'cancel-request')
AND r.name = 'student';

-- User login
INSERT INTO users (name, email, password, created_at, updated_at)
VALUES (
  'Nurha Mahasiswa',
  'nurha@student.ac.id',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usl.2DIs',
  NOW(), NOW()
);

-- Data student
INSERT INTO students (id, name, regno, created_at, updated_at)
VALUES (LAST_INSERT_ID(), 'Nurha Mahasiswa', '2210000001', NOW(), NOW());

-- Assign role student ke user
INSERT INTO model_has_roles (role_id, model_type, model_id)
SELECT r.id, 'App\\Models\\User', u.id
FROM roles r, users u
WHERE r.name = 'student' AND u.email = 'nurha@student.ac.id';

INSERT IGNORE INTO permissions (name, guard_name, created_at, updated_at) VALUES
('verify-requests', 'web', NOW(), NOW()),
('sign-request', 'web', NOW(), NOW());

INSERT IGNORE INTO roles (name, guard_name, created_at, updated_at) VALUES 
('admin', 'web', NOW(), NOW()),
('dekan', 'web', NOW(), NOW());

INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id FROM permissions p, roles r WHERE p.name = 'verify-requests' AND r.name = 'admin';

INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
SELECT p.id, r.id FROM permissions p, roles r WHERE p.name = 'sign-request' AND r.name = 'dekan';

INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id)
SELECT id, 'App\\Models\\User', 1 FROM roles WHERE name = 'admin';

-- 1. Bersihkan sisa data (jika ada yang setengah masuk sebelumnya)
DELETE FROM users WHERE email = 'dekan@facultyware.ac.id';
DELETE FROM employees WHERE employee_number = 'EMP-0002';

-- 2. Buat Akun Dekan di tabel users dengan ID 99 (Jalur Aman)
INSERT INTO users (id, name, email, password, created_at, updated_at)
VALUES (99, 'Dekan FTI', 'dekan@facultyware.ac.id', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.usl.2DIs', NOW(), NOW());

-- 3. Masukkan detail pegawai Dekan ke tabel employees dengan ID 99
INSERT INTO employees (id, employee_number, name, birth_place, birth_date, gender, marital_status, address, hire_date, organization_unit_id, employment_status_id, status, created_at, updated_at) 
VALUES (99, 'EMP-0002', 'Dekan FTI', 'Padang', '1975-01-01', 'male', 'married', '-', '2010-01-01', 1, 1, 'active', NOW(), NOW());

-- 4. Pastikan role 'dekan' sudah terdaftar
INSERT IGNORE INTO roles (name, guard_name, created_at, updated_at) 
VALUES ('dekan', 'web', NOW(), NOW());

-- 5. Tempelkan jabatan 'dekan' kepada User ID 99
INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id)
SELECT id, 'App\\Models\\User', 99 FROM roles WHERE name = 'dekan';
