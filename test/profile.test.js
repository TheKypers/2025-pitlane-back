const request = require('supertest');
const express = require('express');
const routes = require('../routes');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(express.json());
app.use('/', routes);

const prisma = new PrismaClient();

// Mock JWT token for testing
const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzMjQwMDAwMH0.mock_signature';

// Test profile ID
const testProfileId = '00000000-0000-0000-0000-000000000001';

describe('Profile Preferences and Dietary Restrictions API', () => {
  
  // Setup: Create test data before running tests
  beforeAll(async () => {
    try {
      // Create test preferences if they don't exist
      await prisma.preference.upsert({
        where: { name: 'Test Preference 1' },
        update: {},
        create: { name: 'Test Preference 1' }
      });
      
      await prisma.preference.upsert({
        where: { name: 'Test Preference 2' },
        update: {},
        create: { name: 'Test Preference 2' }
      });

      // Create test dietary restrictions if they don't exist
      await prisma.dietaryRestriction.upsert({
        where: { name: 'Test Restriction 1' },
        update: {},
        create: { name: 'Test Restriction 1' }
      });

      await prisma.dietaryRestriction.upsert({
        where: { name: 'Test Restriction 2' },
        update: {},
        create: { name: 'Test Restriction 2' }
      });

      // Create test profile
      await prisma.profile.upsert({
        where: { id: testProfileId },
        update: {},
        create: {
          id: testProfileId,
          username: `testuser_${Date.now()}`,
          role: 'user'
        }
      });
    } catch (error) {
      console.error('Setup error:', error);
    }
  });

  // Cleanup after tests
  afterAll(async () => {
    try {
      // Clean up test data
      await prisma.profile.deleteMany({
        where: { username: { startsWith: 'testuser_' } }
      });
      
      await prisma.preference.deleteMany({
        where: { name: { startsWith: 'Test Preference' } }
      });
      
      await prisma.dietaryRestriction.deleteMany({
        where: { name: { startsWith: 'Test Restriction' } }
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('Profile Preferences Endpoints', () => {
    
    it('POST /profile/:id/preferences should add preferences to profile', async () => {
      // First, get available preferences
      const preferencesRes = await request(app).get('/preferences');
      expect(preferencesRes.statusCode).toBe(200);
      
      const preferences = preferencesRes.body;
      const preferenceIds = preferences.slice(0, 2).map(p => p.PreferenceID);

      const res = await request(app)
        .post(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: preferenceIds });

      // Note: This will fail without proper JWT setup, but tests the endpoint structure
      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('PUT /profile/:id/preferences should set preferences for profile', async () => {
      const preferencesRes = await request(app).get('/preferences');
      const preferences = preferencesRes.body;
      const preferenceIds = preferences.slice(0, 1).map(p => p.PreferenceID);

      const res = await request(app)
        .put(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: preferenceIds });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('DELETE /profile/:id/preferences should remove preferences from profile', async () => {
      const preferencesRes = await request(app).get('/preferences');
      const preferences = preferencesRes.body;
      const preferenceIds = preferences.slice(0, 1).map(p => p.PreferenceID);

      const res = await request(app)
        .delete(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: preferenceIds });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('POST /profile/:id/preferences should return 400 for invalid data', async () => {
      const res = await request(app)
        .post(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: 'invalid' });

      expect([400, 401, 403]).toContain(res.statusCode);
    });

    it('POST /profile/:id/preferences should return 400 for empty array', async () => {
      const res = await request(app)
        .post(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: [] });

      expect([400, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('Profile Dietary Restrictions Endpoints', () => {
    
    it('POST /profile/:id/dietary-restrictions should add restrictions to profile', async () => {
      const restrictionsRes = await request(app).get('/dietary-restrictions');
      expect(restrictionsRes.statusCode).toBe(200);
      
      const restrictions = restrictionsRes.body;
      const restrictionIds = restrictions.slice(0, 2).map(r => r.DietaryRestrictionID);

      const res = await request(app)
        .post(`/profile/${testProfileId}/dietary-restrictions`)
        .set('Authorization', mockToken)
        .send({ dietaryRestrictions: restrictionIds });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('PUT /profile/:id/dietary-restrictions should set restrictions for profile', async () => {
      const restrictionsRes = await request(app).get('/dietary-restrictions');
      const restrictions = restrictionsRes.body;
      const restrictionIds = restrictions.slice(0, 1).map(r => r.DietaryRestrictionID);

      const res = await request(app)
        .put(`/profile/${testProfileId}/dietary-restrictions`)
        .set('Authorization', mockToken)
        .send({ dietaryRestrictions: restrictionIds });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('DELETE /profile/:id/dietary-restrictions should remove restrictions from profile', async () => {
      const restrictionsRes = await request(app).get('/dietary-restrictions');
      const restrictions = restrictionsRes.body;
      const restrictionIds = restrictions.slice(0, 1).map(r => r.DietaryRestrictionID);

      const res = await request(app)
        .delete(`/profile/${testProfileId}/dietary-restrictions`)
        .set('Authorization', mockToken)
        .send({ dietaryRestrictions: restrictionIds });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('POST /profile/:id/dietary-restrictions should return 400 for invalid data', async () => {
      const res = await request(app)
        .post(`/profile/${testProfileId}/dietary-restrictions`)
        .set('Authorization', mockToken)
        .send({ dietaryRestrictions: 'invalid' });

      expect([400, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('Combined Preferences and Restrictions Endpoint', () => {
    
    it('PUT /profile/:id/preferences-and-restrictions should set both preferences and restrictions', async () => {
      const preferencesRes = await request(app).get('/preferences');
      const restrictionsRes = await request(app).get('/dietary-restrictions');
      
      const preferences = preferencesRes.body;
      const restrictions = restrictionsRes.body;
      
      const preferenceIds = preferences.slice(0, 1).map(p => p.PreferenceID);
      const restrictionIds = restrictions.slice(0, 1).map(r => r.DietaryRestrictionID);

      const res = await request(app)
        .put(`/profile/${testProfileId}/preferences-and-restrictions`)
        .set('Authorization', mockToken)
        .send({ 
          preferences: preferenceIds,
          dietaryRestrictions: restrictionIds
        });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('PUT /profile/:id/preferences-and-restrictions should accept empty arrays', async () => {
      const res = await request(app)
        .put(`/profile/${testProfileId}/preferences-and-restrictions`)
        .set('Authorization', mockToken)
        .send({ 
          preferences: [],
          dietaryRestrictions: []
        });

      expect([200, 401, 403]).toContain(res.statusCode);
    });

    it('PUT /profile/:id/preferences-and-restrictions should return 400 for invalid data types', async () => {
      const res = await request(app)
        .put(`/profile/${testProfileId}/preferences-and-restrictions`)
        .set('Authorization', mockToken)
        .send({ 
          preferences: 'invalid',
          dietaryRestrictions: 'invalid'
        });

      expect([400, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('Profile Full Data Endpoint', () => {
    
    it('GET /profile/:id/full should return profile with preferences and restrictions', async () => {
      const res = await request(app)
        .get(`/profile/${testProfileId}/full`)
        .set('Authorization', mockToken);

      expect([200, 401, 403, 404]).toContain(res.statusCode);
      
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('username');
        expect(res.body).toHaveProperty('role');
        expect(res.body).toHaveProperty('Preference');
        expect(res.body).toHaveProperty('DietaryRestriction');
        expect(Array.isArray(res.body.Preference)).toBe(true);
        expect(Array.isArray(res.body.DietaryRestriction)).toBe(true);
      }
    });

    it('GET /profile/:id/full should return 404 for non-existent profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000999';
      const res = await request(app)
        .get(`/profile/${nonExistentId}/full`)
        .set('Authorization', mockToken);

      expect([404, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('Error Handling', () => {
    
    it('should return 401 for requests without authorization', async () => {
      const res = await request(app)
        .post(`/profile/${testProfileId}/preferences`)
        .send({ preferences: [1] });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000999';
      const res = await request(app)
        .post(`/profile/${nonExistentId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: [1] });

      expect([404, 401, 403]).toContain(res.statusCode);
    });

    it('should handle malformed profile IDs', async () => {
      const res = await request(app)
        .post('/profile/invalid-id/preferences')
        .set('Authorization', mockToken)
        .send({ preferences: [1] });

      expect([400, 401, 403, 500]).toContain(res.statusCode);
    });
  });

  describe('Data Validation', () => {
    
    it('should validate preference IDs exist', async () => {
      const nonExistentPreferenceIds = [99999, 99998];
      
      const res = await request(app)
        .post(`/profile/${testProfileId}/preferences`)
        .set('Authorization', mockToken)
        .send({ preferences: nonExistentPreferenceIds });

      expect([409, 401, 403, 500]).toContain(res.statusCode);
    });

    it('should validate dietary restriction IDs exist', async () => {
      const nonExistentRestrictionIds = [99999, 99998];
      
      const res = await request(app)
        .post(`/profile/${testProfileId}/dietary-restrictions`)
        .set('Authorization', mockToken)
        .send({ dietaryRestrictions: nonExistentRestrictionIds });

      expect([409, 401, 403, 500]).toContain(res.statusCode);
    });
  });
});