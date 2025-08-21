const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUser() {
  const email = process.argv[2] || 'test@example.com';
  const password = process.argv[3] || 'password123';
  const fullName = process.argv[4] || 'Test User';
  const role = process.argv[5] || 'user';

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role,
        is_active: true
      }
    });

    console.log('User created successfully:');
    console.log({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    console.log(`\nYou can now login with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();