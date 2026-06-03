-- AUTENTIKASI DAN OTORISASI

-- 1.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `two_factor_secret` TEXT NULL DEFAULT NULL,
  `two_factor_recovery_codes` TEXT NULL DEFAULT NULL,
  `two_factor_confirmed_at` TIMESTAMP NULL DEFAULT NULL,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_unique` (`email`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `guard_name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `permissions_name_guard_name_unique` (`name`, `guard_name`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. model_has_permissions
CREATE TABLE IF NOT EXISTS `model_has_permissions` (
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `model_type` VARCHAR(255) NOT NULL,
  `model_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`permission_id`, `model_id`, `model_type`),
  INDEX `model_has_permissions_model_id_model_type_index` (`model_id`, `model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `guard_name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `roles_name_guard_name_unique` (`name`, `guard_name`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5.model_has_roles
CREATE TABLE IF NOT EXISTS `model_has_roles` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `model_type` VARCHAR(255) NOT NULL,
  `model_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `model_id`, `model_type`),
  INDEX `model_has_roles_model_id_model_type_index` (`model_id`, `model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 6. role_has_permissions
CREATE TABLE IF NOT EXISTS `role_has_permissions` (
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`permission_id`, `role_id`),
  INDEX `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;


-- STUDENT REQUEST

-- 1.students 
CREATE TABLE IF NOT EXISTS `students` (
  `id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `regno` VARCHAR(255) NOT NULL,
  `birth_date` DATETIME NULL,
  `birth_place` VARCHAR(45) NULL,
  `gender` INT NULL,
  `religion` INT NULL,
  `email` VARCHAR(255) NULL,
  `campus_email` VARCHAR(255) NULL,
  `phone_no` VARCHAR(45) NULL,
  `home_address` VARCHAR(255) NULL,
  `home_town` VARCHAR(45) NULL,
  `home_province` VARCHAR(45) NULL,
  `home_postalcode` VARCHAR(5) NULL,
  `current_address` VARCHAR(255) NULL,
  `current_town` VARCHAR(45) NULL,
  `current_province` VARCHAR(45) NULL,
  `current_postalcode` VARCHAR(5) NULL,
  `department_id` BIGINT UNSIGNED NULL,
  `year` INT NULL,
  `status` INT NULL,
  `advisor_id` BIGINT UNSIGNED NULL,
  `citizenship` VARCHAR(45) NULL,
  `photo` VARCHAR(45) NULL,
  `updated_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_students_users`
    FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- 2.employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` BIGINT UNSIGNED NOT NULL,
  `employee_number` VARCHAR(255) NOT NULL,
  `national_id_number` VARCHAR(255) NULL DEFAULT NULL,
  `tax_id_number` VARCHAR(255) NULL DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `birth_place` VARCHAR(255) NOT NULL,
  `birth_date` DATE NOT NULL,
  `gender` ENUM('male', 'female') NOT NULL,
  `religion` VARCHAR(255) NULL DEFAULT NULL,
  `marital_status` ENUM('single', 'married', 'divorced') NOT NULL,
  `address` TEXT NOT NULL,
  `phone_number` VARCHAR(255) NULL DEFAULT NULL,
  `organization_unit_id` BIGINT UNSIGNED NOT NULL,
  `hire_date` DATE NOT NULL,
  `employment_status_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `employees_employee_number_unique` (`employee_number`),
  CONSTRAINT `employees_user_id_foreign`
    FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3.student_requests
CREATE TABLE IF NOT EXISTS `student_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_nunmber` VARCHAR(45) NULL,
  `request_type` VARCHAR(45) NULL,
  `title` VARCHAR(45) NULL,
  `description` VARCHAR(45) NULL,
  `status` INT NULL,
  `requested_by` BIGINT UNSIGNED NULL,
  `requested_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_student_requests_students1_idx` (`requested_by`),
  CONSTRAINT `fk_student_requests_students1`
    FOREIGN KEY (`requested_by`) REFERENCES `students` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- 4.student_request_active_references
CREATE TABLE IF NOT EXISTS `student_request_active_references` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_requests_id` BIGINT UNSIGNED NOT NULL,
  `student_study_plan_file` VARCHAR(45) NULL,
  `parent_decree_file` VARCHAR(45) NULL,
  `checked_by` BIGINT UNSIGNED NOT NULL,
  `checked_at` DATETIME NULL,
  `check_reason` TEXT NULL,
  `signed_by` BIGINT UNSIGNED NOT NULL,
  `signed_at` DATETIME NULL,
  `sign_reason` TEXT NULL,
  `status` VARCHAR(45) NULL,
  `updated_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_student_request_recomendations_student_requests1_idx` (`student_requests_id`),
  INDEX `fk_student_request_recomendations_employees1_idx` (`signed_by`),
  INDEX `fk_student_request_recomendations_employees2_idx` (`checked_by`),
  CONSTRAINT `fk_student_request_recomendations_student_requests1`
    FOREIGN KEY (`student_requests_id`) REFERENCES `student_requests` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_student_request_recomendations_employees1`
    FOREIGN KEY (`signed_by`) REFERENCES `employees` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_student_request_recomendations_employees2`
    FOREIGN KEY (`checked_by`) REFERENCES `employees` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB;

-- 5.student_request_grad_references
CREATE TABLE IF NOT EXISTS `student_request_grad_references` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_requests_id` BIGINT UNSIGNED NOT NULL,
  `cover_letter_department_file` VARCHAR(45) NULL,
  `proof_o_grad_registration_file` VARCHAR(45) NULL,
  `checked_by` BIGINT UNSIGNED NOT NULL,
  `checked_at` DATETIME NULL,
  `check_reason` TEXT NULL,
  `signed_by` BIGINT UNSIGNED NOT NULL,
  `signed_at` DATETIME NULL,
  `sign_reason` TEXT NULL,
  `status` VARCHAR(45) NULL,
  `updated_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_student_request_recomendations_student_requests1_idx` (`student_requests_id`),
  INDEX `fk_student_request_recomendations_employees1_idx` (`signed_by`),
  INDEX `fk_student_request_recomendations_employees2_idx` (`checked_by`),
  CONSTRAINT `fk_student_request_recomendations_student_requests10`
    FOREIGN KEY (`student_requests_id`) REFERENCES `student_requests` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_student_request_recomendations_employees10`
    FOREIGN KEY (`signed_by`) REFERENCES `employees` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_student_request_recomendations_employees20`
    FOREIGN KEY (`checked_by`) REFERENCES `employees` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB;

