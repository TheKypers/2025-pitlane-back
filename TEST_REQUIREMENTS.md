# Test Requirements

## Prerequisites

1. **Docker installed and running**
2. **Node.js and npm installed**
3. **Prisma CLI installed** (`npm install -g prisma` or use `npx prisma`)

## Test Database Setup

The test suite uses a separate PostgreSQL database running in Docker to avoid affecting your development/production data.

### Configuration

- **Database:** `pitlane_test`
- **User:** `postgres`
- **Password:** `testpassword123`
- **Port:** `5433` (to avoid conflict with development DB on 5432)
- **Connection String:** `postgresql://postgres:testpassword123@localhost:5433/pitlane_test`

## Running Tests

### 1. Start the Test Database

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Run Tests

```bash
npm test
```

The test script automatically:
- Waits for PostgreSQL to be ready
- Runs Prisma migrations
- Seeds the test database
- Executes all test suites
- Cleans up after completion

### 3. Stop the Test Database

```bash
docker-compose -f docker-compose.test.yml down
```

## Manual Testing with Postman

To test API endpoints manually using the test database:

### 1. Start Test Database
```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Run Migrations (first time only)
```bash
$env:DATABASE_URL="postgresql://postgres:testpassword123@localhost:5433/pitlane_test"
npx prisma migrate deploy
```

### 3. Start API Server with Test Database
```bash
$env:DATABASE_URL="postgresql://postgres:testpassword123@localhost:5433/pitlane_test"
npm start
```

### 4. Make Requests in Postman
- **Base URL:** `http://localhost:3000`
- All requests will use the test database

## Test Structure

- **Test Files:** Located in `/test` directory
- **Test Database:** Isolated from development data
- **Seed Data:** Automatically created before each test run
- **Cleanup:** Database reset after tests complete

## Common Issues

### Port Already in Use
If port 5433 is already in use:
```bash
docker-compose -f docker-compose.test.yml down
```

### Database Connection Errors
Check that the test database is running:
```bash
docker ps
```

### Migration Errors
Reset the test database:
```bash
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

## Notes

- The test database is completely separate from your development database
- Test data is seeded automatically before each test run
- All tests should be idempotent and not depend on execution order
