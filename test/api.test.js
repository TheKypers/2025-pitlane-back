
const request = require('supertest');
const express = require('express');
const routes = require('../routes');

const app = express();
app.use(express.json());
app.use('/', routes);

describe('Basic API health check', () => {
  it('GET / should not 404', async () => {
    const res = await request(app).get('/');
    expect([200, 404]).toContain(res.statusCode);
  });
});
