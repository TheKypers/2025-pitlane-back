const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /preferences - get all preferences
router.get('/', async (req, res) => {
  try {
    const preferences = await prisma.preference.findMany();
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /preferences - create a new preference
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const preference = await prisma.preference.create({ data: { name } });
    res.status(201).json(preference);
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Preference with this name already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;

// DELETE /preferences/:id - delete a preference by id
router.delete('/:id', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const deleted = await prisma.preference.delete({ where: { PreferenceID: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Preference not found' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});
