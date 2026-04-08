require('dotenv').config();
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');

async function seed() {
  await connectDB();

  console.log('🌱 Seeding users...');

  const users = [
    { username: 'admin', email: 'admin@officegit.com', password: 'admin123', role: 'admin' },
    { username: 'editor1', email: 'editor@officegit.com', password: 'editor123', role: 'editor' },
    { username: 'viewer1', email: 'viewer@officegit.com', password: 'viewer123', role: 'viewer' },
    { username: 'approver1', email: 'approver@officegit.com', password: 'approver123', role: 'approver' },
  ];

  for (const userData of users) {
    const exists = await User.findOne({ email: userData.email });
    if (!exists) {
      await User.create(userData);
      console.log(`  ✅ Created ${userData.role}: ${userData.email} / ${userData.password}`);
    } else {
      console.log(`  ⏭  ${userData.email} already exists`);
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('\nTest accounts:');
  console.log('  Admin:    admin@officegit.com    / admin123');
  console.log('  Editor:   editor@officegit.com   / editor123');
  console.log('  Viewer:   viewer@officegit.com   / viewer123');
  console.log('  Approver: approver@officegit.com / approver123');

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
