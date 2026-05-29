-- -----------------------------------------------------
-- Table `facultyware`.`students`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `facultyware`.`students` (
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
  INDEX `fk_students_lecturers1_idx` (`advisor_id` ASC) VISIBLE,
  INDEX `fk_students_organization_units1_idx` (`department_id` ASC) VISIBLE,
  CONSTRAINT `fk_students_lecturers1`
    FOREIGN KEY (`advisor_id`)
    REFERENCES `facultyware`.`lecturers` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_students_users`
    FOREIGN KEY (`id`)
    REFERENCES `facultyware`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_students_organization_units1`
    FOREIGN KEY (`department_id`)
    REFERENCES `facultyware`.`organization_units` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;