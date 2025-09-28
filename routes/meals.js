const express = require('express');
const router = express.Router();
const mealsLib = require('../controllers/mealsLib');

// GET /meals/all - Get all meals from all users with profile information
router.get('/all', async (req, res) => {
    try {
        const meals = await mealsLib.getAllMealsWithProfiles();
        res.json(meals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /meals/user - Get all meals created by a specific user (using profileId from query)
router.get('/user', async (req, res) => {
    try {
        const { profileId } = req.query;
        
        if (!profileId) {
            return res.status(400).json({ error: 'profileId query parameter is required' });
        }

        // profileId should be a UUID string, no conversion needed
        if (typeof profileId !== 'string' || profileId.trim() === '') {
            return res.status(400).json({ error: 'Invalid profileId format' });
        }
        
        const meals = await mealsLib.getMeals(profileId);
        
        res.json(meals || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /meals - Get all meals or filter by profile
router.get('/', async (req, res) => {
    try {
        const { profileId } = req.query;
        const meals = await mealsLib.getMeals(profileId);
        res.json(meals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /meals/:id - Get a specific meal by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const meal = await mealsLib.getMealById(parseInt(id));
        if (!meal) {
            return res.status(404).json({ error: 'Meal not found' });
        }
        res.json(meal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /meals - Create a new meal
router.post('/', async (req, res) => {
    try {
        const { name, description, profileId, foodIds } = req.body;
        
        if (!name || !profileId || !foodIds || !Array.isArray(foodIds) || foodIds.length === 0) {
            return res.status(400).json({ 
                error: 'Name, profileId, and at least one food ID are required' 
            });
        }

        const meal = await mealsLib.createMeal(name, description, profileId, foodIds);
        res.status(201).json(meal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /meals/:id - Update a meal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, foodIds } = req.body;
        
        const meal = await mealsLib.updateMeal(parseInt(id), name, description, foodIds);
        if (!meal) {
            return res.status(404).json({ error: 'Meal not found' });
        }
        res.json(meal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /meals/:id - Delete a meal
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await mealsLib.deleteMeal(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ error: 'Meal not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;