const express = require('express');
const router = express.Router();

const profilesController = require('../controllers/profilesLib');
const authenticateJWT = require('./auth');

// GET /profile - get all profiles (protegido)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const profiles = await profilesController.getAllProfiles();
    // Mapear para devolver solo los campos requeridos
    const result = profiles.map(({ id, username, role }) => ({ id, username, role }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /profile/:id - get profile by id (protegido)
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const profile = await profilesController.getProfileById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    // Devolver solo los campos requeridos
    const { id, username, role } = profile;
    res.json({ id, username, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /profile/:id/username - update username (protegido)
router.patch('/:id/username', authenticateJWT, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    const updated = await profilesController.updateProfileUsername(req.params.id, username);
    // Devolver solo los campos requeridos
    const { id, username: uname, role } = updated;
    res.json({ id, username: uname, role });
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Profile with this username already exists' });
    } else if (err.code === 'P2025') {
      res.status(404).json({ error: 'Profile not found' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH /profile/:id/role - update role (protegido)
router.patch('/:id/role', authenticateJWT, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const updated = await profilesController.updateProfileRole(req.params.id, role);
    // Devolver solo los campos requeridos
    const { id, username, role: newRole } = updated;
    res.json({ id, username, role: newRole });
  } catch (err) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Profile not found' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;

// DELETE /profile/:id - delete a profile by id (protegido)
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const deleted = await profilesController.deleteProfile(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Profile not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /profile - create a new profile (protegido)
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { id, username, preferences, dietaryRestrictions } = req.body;
    const profile = await profilesController.createProfile({ id, username, preferences, dietaryRestrictions });
    // Devolver solo los campos requeridos
    const { id: pid, username: uname, role } = profile;
    res.status(201).json({ id: pid, username: uname, role });
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Profile with this username already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});
