const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

module.exports = async () => {
  console.log('\n🚀 Starting test environment setup...\n');

  try {
    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('❌ Docker is not running. Please start Docker Desktop and try again.');
    }

    // Start the test database container
    console.log('🐳 Starting test database container...');
    try {
      execSync('docker-compose -f docker-compose.test.yml up -d', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..')
      });
    } catch (error) {
      throw new Error('❌ Failed to start Docker container. Make sure docker-compose.test.yml exists.');
    }

    // Wait for database to be ready
    console.log('⏳ Waiting for PostgreSQL to be ready...');
    let retries = 60; // Increased timeout
    let lastError = null;
    while (retries > 0) {
      try {
        execSync('docker exec pitlane-test-db pg_isready -U postgres', { stdio: 'ignore' });
        console.log('✅ PostgreSQL is ready!\n');
        break;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries === 0) {
          console.error('❌ PostgreSQL failed to start. Last error:', lastError.message);
          console.error('\nTroubleshooting:');
          console.error('1. Check if Docker Desktop is running');
          console.error('2. Run: docker-compose -f docker-compose.test.yml logs');
          console.error('3. Run: docker ps -a');
          throw new Error('PostgreSQL failed to start in time');
        }
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Run Prisma migrations
    console.log('📦 Running Prisma migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log('✅ Migrations completed!\n');

    // Generate Prisma Client
    // Generate Prisma Client (skip if fails due to file lock)
    console.log('🔨 Generating Prisma Client...');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit'
      });
      console.log('✅ Prisma Client generated!\n');
    } catch (error) {
      console.log('⚠️  Prisma Client generation skipped (already exists or file locked)\n');
    }

    // Run seed script
    console.log('🌱 Seeding test database...');
    execSync('npm run seed', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log('✅ Database seeded!\n');

    console.log('✨ Test environment setup complete!\n');
  } catch (error) {
    console.error('❌ Error during test setup:', error.message);
    throw error;
  }
};
