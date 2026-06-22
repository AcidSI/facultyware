const db = require('../lib/db');

async function seed() {
  try {
    const guardName = 'web';

    const permissions = [
      'view-requests',
      'create-request',
      'cancel-request',
    ];

    console.log('Membuat permissions...');
    for (const name of permissions) {
      await db.query(
        `INSERT IGNORE INTO permissions (name, guard_name, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [name, guardName]
      );
    }

    console.log("Membuat role 'student'...");
    await db.query(
      `INSERT IGNORE INTO roles (name, guard_name, created_at, updated_at)
       VALUES ('student', ?, NOW(), NOW())`,
      [guardName]
    );

    console.log('Menghubungkan role student dengan permissions...');
    const [[studentRole]] = await db.query(
      `SELECT id FROM roles WHERE name = 'student' AND guard_name = ?`, [guardName]
    );

    const [allPerms] = await db.query(
      `SELECT id FROM permissions WHERE name IN (?) AND guard_name = ?`,
      [permissions, guardName]
    );

    for (const perm of allPerms) {
      await db.query(
        `INSERT IGNORE INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)`,
        [perm.id, studentRole.id]
      );
    }

    console.log('Seeder ACL selesai!');
    console.log('');
    console.log('Cara assign role ke user (jalankan di MySQL):');
    console.log(`  INSERT INTO model_has_roles (role_id, model_type, model_id)`);
    console.log(`  VALUES (${studentRole.id}, 'App\\\\Models\\\\User', <USER_ID>);`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding ACL:', err.message);
    process.exit(1);
  }
}

seed();
