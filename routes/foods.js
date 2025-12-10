
const express = require('express');
const router = express.Router();
const foodsController = require('../controllers/foodsLib');
const nutritionalAlerts = require('../controllers/nutritionalAlerts');

// GET /foods/for-user?restrictions=1,2,3 - get foods filtered by user dietary restrictions
router.get('/for-user', async (req, res) => {
    try {
        const { restrictions } = req.query;
        const userRestrictions = restrictions ? restrictions.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        const foods = await foodsController.getFoodsForUser(userRestrictions);
        res.json(foods);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /foods/user/:profileId - get foods created by a specific user
router.get('/user/:profileId', async (req, res) => {
    try {
        const foods = await foodsController.getFoodsByProfileId(req.params.profileId);
        res.json(foods);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// DELETE /foods/:id - delete a food by id
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await foodsController.deleteFood(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Food not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /foods/:id - get food by id
router.get('/:id', async (req, res) => {
    try {
        const food = await foodsController.getFoodById(req.params.id);
        if (!food) return res.status(404).json({ error: 'Food not found' });
        res.json(food);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /foods/:id - update a food by id
router.put('/:id', async (req, res) => {
    try {
        const { name, svgLink, kCal, preferences, dietaryRestrictions } = req.body;
        const updatedFood = await foodsController.updateFood(req.params.id, { name, svgLink, kCal, preferences, dietaryRestrictions });
        if (!updatedFood) return res.status(404).json({ error: 'Food not found' });
        res.json(updatedFood);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /foods - get all foods
router.get('/', async (req, res) => {
    try {
        const foods = await foodsController.getAllFoods();
        res.json(foods);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /foods - create a new food
router.post('/', async (req, res) => {
    try {
        const { name, svgLink, kCal, preferences, dietaryRestrictions, hasNoRestrictions, profileId } = req.body;
        
        if (!profileId) {
            return res.status(400).json({ error: 'profileId is required' });
        }

        const food = await foodsController.createFood({ name, svgLink, kCal, preferences, dietaryRestrictions, hasNoRestrictions, profileId });
        
        // Check dietary conflicts with user's profile
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: { DietaryRestriction: true }
        });
        
        const conflictCheck = nutritionalAlerts.checkDietaryConflicts(
            food.dietaryRestrictions || [],
            profile?.DietaryRestriction || []
        );
        
        // Add alert info to response
        const response = {
            ...food,
            dietaryAlert: conflictCheck.hasConflict ? {
                hasConflict: true,
                message: `This food contains ingredients that conflict with your dietary restrictions`,
                conflicts: conflictCheck.conflictingRestrictions
            } : {
                hasConflict: false,
                isFit: true,
                message: 'This food fits your dietary profile'
            }
        };
        
        await prisma.$disconnect();
        res.status(201).json(response);
    } catch (err) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'Food with this unique value already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});