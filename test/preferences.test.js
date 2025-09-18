const request = require('supertest');
const express = require('express');
const routes = require('../routes');

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Preferences API', () => {
  it('GET /preferences should return an array', async () => {
    const res = await request(app).get('/preferences');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /preferences should create a preference', async () => {
    const res = await request(app)
      .post('/preferences')
      .send({ name: 'Spicy Test' });
    expect(res.statusCode).toBe(201 || 409);
    expect(res.body).toHaveProperty('PreferenceID');
    expect(res.body).toHaveProperty('name', 'Spicy Test');
    // Cleanup if created
    if (res.statusCode === 201) {
      await request(app).delete(`/preferences/${res.body.PreferenceID}`);
    }
  });

//   it('POST /preferences should return 409 if name already exists', async () => {
//     await request(app)
//       .post('/preferences')
//       .send({ name: 'UniquePref' });
//     const res = await request(app)
//       .post('/preferences')
//       .send({ name: 'UniquePref' });
//     expect(res.statusCode).toBe(409);
//   });
});
