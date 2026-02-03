const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function createDemoUsers() {
    console.log('🌱 Seeding database with demo users...');

    const users = [
        { username: 'leader', password: 'leader123', full_name: 'Leader Quality Control', role: 'leader', email: 'leader@qclaptop.com' },
        { username: 'staff', password: 'staff123', full_name: 'Quality Control Staff Office', role: 'staff', email: 'staff@qclaptop.com' }
    ];

    try {
        // Clear existing users if needed
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const existingUser = await db.query('SELECT id FROM users WHERE username = $1', [user.username]);

            if (existingUser.rows.length === 0) {
                await db.query(
                    `INSERT INTO users (username, password, full_name, role, email) VALUES ($1, $2, $3, $4, $5)`,
                    [user.username, hashedPassword, user.full_name, user.role, user.email]
                );
                console.log(`✅ Created user: ${user.username} (${user.role})`);
            } else {
                // Update existing user
                await db.query(
                    `UPDATE users SET password = $1, full_name = $2, role = $3, email = $4 WHERE username = $5`,
                    [hashedPassword, user.full_name, user.role, user.email, user.username]
                );
                console.log(`🔄 Updated user: ${user.username}`);
            }
        }

        console.log('\n🎉 Database seeding completed!');
        console.log('\nDemo Login Credentials:');
        console.log('------------------------');
        console.log('Leader: leader / leader123');
        console.log('Staff:  staff / staff123');
        console.log('------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

createDemoUsers();
