// routes/consumptions.js
const express = require('express');
const router = express.Router();
const consumptionsLib = require('../controllers/consumptionsLib');

/**
 * GET /consumptions
 * Get all consumptions with optional filters
 */
router.get('/', async (req, res) => {
    try {
        const { profileId, groupId, type, startDate, endDate } = req.query;
        
        const filters = {};
        if (profileId) filters.profileId = profileId;
        if (groupId) filters.groupId = groupId;
        if (type) filters.type = type;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const consumptions = await consumptionsLib.getConsumptions(filters);
        
        res.json(consumptions);
    } catch (error) {
        console.error('Error fetching consumptions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch consumptions',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/user/:profileId/meal-portions
 * Get all meal portions for a user (includes voting, game, and individual portions)
 * This provides a unified view of all consumptions regardless of source
 */
router.get('/user/:profileId/meal-portions', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { startDate, endDate, source } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (source) filters.source = source; // 'individual', 'voting', or 'game'
        
        const mealPortions = await consumptionsLib.getUserMealPortions(profileId, filters);
        
        res.json(mealPortions);
    } catch (error) {
        console.error('Error fetching user meal portions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user meal portions',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/user/:profileId
 * Get individual consumptions for a specific user (excludes group consumptions)
 */
router.get('/user/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { type, startDate, endDate } = req.query;
        
        const filters = { 
            profileId,
            individualOnly: true  // Add flag to indicate we only want individual consumptions
        };
        if (type) filters.type = type;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const consumptions = await consumptionsLib.getConsumptions(filters);
        
        res.json(consumptions);
    } catch (error) {
        console.error('Error fetching user consumptions:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user consumptions',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/:id
 * Get a specific consumption by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const consumption = await consumptionsLib.getConsumptionById(id);
        
        if (!consumption) {
            return res.status(404).json({ error: 'Consumption not found' });
        }
        
        res.json(consumption);
    } catch (error) {
        console.error('Error fetching consumption:', error);
        res.status(500).json({ 
            error: 'Failed to fetch consumption',
            details: error.message 
        });
    }
});

/**
 * POST /consumptions/individual
 * Create an individual consumption record
 */
router.post('/individual', async (req, res) => {
    try {
        const { name, description, meals, profileId, consumedAt, portions } = req.body;
        
        console.log('[POST /consumptions/individual] Received request:', {
            name,
            profileId,
            mealsCount: meals?.length,
            hasPortions: !!portions,
            portionsData: portions
        });
        
        if (!name || !profileId || !meals) {
            return res.status(400).json({ 
                error: 'Name, profileId, and meals are required' 
            });
        }
        
        const consumptionData = { name, description, meals, consumedAt, portions };
        const newConsumption = await consumptionsLib.createIndividualConsumption(
            consumptionData, 
            profileId
        );
        
        res.status(201).json(newConsumption);
    } catch (error) {
        console.error('Error creating individual consumption:', error);
        
        if (error.message.includes('Meals array is required') || 
            error.message.includes('Meal with ID') || 
            error.message.includes('not found')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to create individual consumption',
            details: error.message 
        });
    }
});

/**
 * POST /consumptions/group
 * Create a group consumption record
 */
router.post('/group', async (req, res) => {
    try {
        const { name, description, meals, profileId, groupId, consumedAt, portions } = req.body;
        
        console.log('[POST /consumptions/group] Received request:', {
            name,
            profileId,
            groupId,
            mealsCount: meals?.length,
            hasPortions: !!portions,
            portionsData: portions
        });
        
        if (!name || !profileId || !groupId || !meals) {
            return res.status(400).json({ 
                error: 'Name, profileId, groupId, and meals are required' 
            });
        }
        
        const consumptionData = { name, description, meals, groupId, consumedAt, portions };
        const newConsumption = await consumptionsLib.createGroupConsumption(
            consumptionData, 
            profileId
        );
        
        res.status(201).json(newConsumption);
    } catch (error) {
        console.error('Error creating group consumption:', error);
        
        if (error.message.includes('Meals array is required') || 
            error.message.includes('Group ID is required') ||
            error.message.includes('User is not a member') ||
            error.message.includes('Meal with ID') || 
            error.message.includes('not found')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to create group consumption',
            details: error.message 
        });
    }
});

/**
 * PUT /consumptions/:id
 * Update a consumption record
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, meals, profileId, consumedAt } = req.body;
        
        if (!profileId) {
            return res.status(400).json({ 
                error: 'Profile ID is required' 
            });
        }
        
        const consumptionData = { name, description, meals, consumedAt };
        const updatedConsumption = await consumptionsLib.updateConsumption(
            id, 
            consumptionData, 
            profileId
        );
        
        res.json(updatedConsumption);
    } catch (error) {
        console.error('Error updating consumption:', error);
        
        if (error.message === 'Consumption not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Unauthorized to update this consumption') {
            return res.status(403).json({ error: error.message });
        }
        
        if (error.message.includes('Meal with ID') && error.message.includes('not found')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to update consumption',
            details: error.message 
        });
    }
});

/**
 * DELETE /consumptions/:id
 * Delete a consumption record (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { profileId } = req.body;
        
        if (!profileId) {
            return res.status(400).json({ 
                error: 'Profile ID is required' 
            });
        }
        
        await consumptionsLib.deleteConsumption(id, profileId);
        
        res.json({ message: 'Consumption deleted successfully' });
    } catch (error) {
        console.error('Error deleting consumption:', error);
        
        if (error.message === 'Consumption not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Unauthorized to delete this consumption') {
            return res.status(403).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete consumption',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/stats
 * Get consumption statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { profileId, groupId, startDate, endDate } = req.query;
        
        const filters = {};
        if (profileId) filters.profileId = profileId;
        if (groupId) filters.groupId = groupId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const stats = await consumptionsLib.getConsumptionStats(filters);
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching consumption stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch consumption stats',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/groups/:groupId/filtered-meals
 * Get meals filtered by group dietary restrictions
 */
router.get('/groups/:groupId/filtered-meals', async (req, res) => {
    try {
        const { groupId } = req.params;
        const filteredMeals = await consumptionsLib.getGroupFilteredMeals(groupId);
        
        res.json(filteredMeals);
    } catch (error) {
        console.error('Error fetching group filtered meals:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch group filtered meals',
            details: error.message 
        });
    }
});

/**
 * GET /consumptions/groups/:groupId/most-consumed
 * Get the most consumed meals by a group (top 3)
 */
router.get('/groups/:groupId/most-consumed', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 3 } = req.query;
        
        const mostConsumedMeals = await consumptionsLib.getGroupMostConsumedMeals(groupId, parseInt(limit));
        
        res.json(mostConsumedMeals);
    } catch (error) {
        console.error('Error fetching group most consumed meals:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch group most consumed meals',
            details: error.message 
        });
    }
});

module.exports = router;