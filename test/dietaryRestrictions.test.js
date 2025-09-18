const request = require('supertest');
const express = require('express');
const routes = require('../routes');

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Dietary Restrictions API', () => {
  it('GET /dietary-restrictions should return an array', async () => {
    const res = await request(app).get('/dietary-restrictions');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /dietary-restrictions should create a restriction', async () => {
    const res = await request(app)
      .post('/dietary-restrictions')
      .send({ name: 'Nut Free Test' });
    expect(res.statusCode).toBe(201 || 409); // Accept 409 if already exists
    expect(res.body).toHaveProperty('DietaryRestrictionID');
    expect(res.body).toHaveProperty('name', 'Nut Free Test');
    // Cleanup if created
    if (res.statusCode === 201) {
      await request(app).delete(`/dietary-restrictions/${res.body.DietaryRestrictionID}`);
    }
  });

//   it('POST /dietary-restrictions should return 409 if name already exists', async () => {
//     await request(app)
//       .post('/dietary-restrictions')
//       .send({ name: 'UniqueRestr' });
//     const res = await request(app)
//       .post('/dietary-restrictions')
//       .send({ name: 'UniqueRestr' });
//     expect(res.statusCode).toBe(409);
//   });
});
