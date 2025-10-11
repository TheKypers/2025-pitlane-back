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
        const { name, description, foods, profileId, consumedAt } = req.body;
        
        if (!name || !profileId || !foods) {
            return res.status(400).json({ 
                error: 'Name, profileId, and foods are required' 
            });
        }
        
        const consumptionData = { name, description, foods, consumedAt };
        const newConsumption = await consumptionsLib.createIndividualConsumption(
            consumptionData, 
            profileId
        );
        
        res.status(201).json(newConsumption);
    } catch (error) {
        console.error('Error creating individual consumption:', error);
        
        if (error.message.includes('Foods array is required') || 
            error.message.includes('Food with ID') || 
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
        const { name, description, foods, profileId, groupId, consumedAt } = req.body;
        
        if (!name || !profileId || !groupId || !foods) {
            return res.status(400).json({ 
                error: 'Name, profileId, groupId, and foods are required' 
            });
        }
        
        const consumptionData = { name, description, foods, groupId, consumedAt };
        const newConsumption = await consumptionsLib.createGroupConsumption(
            consumptionData, 
            profileId
        );
        
        res.status(201).json(newConsumption);
    } catch (error) {
        console.error('Error creating group consumption:', error);
        
        if (error.message.includes('Foods array is required') || 
            error.message.includes('Group ID is required') ||
            error.message.includes('User is not a member') ||
            error.message.includes('Food with ID') || 
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
        const { name, description, foods, profileId, consumedAt } = req.body;
        
        if (!profileId) {
            return res.status(400).json({ 
                error: 'Profile ID is required' 
            });
        }
        
        const consumptionData = { name, description, foods, consumedAt };
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
        
        if (error.message.includes('Food with ID') && error.message.includes('not found')) {
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
 * GET /consumptions/groups/:groupId/filtered-foods
 * Get foods filtered by group dietary restrictions
 */
router.get('/groups/:groupId/filtered-foods', async (req, res) => {
    try {
        const { groupId } = req.params;
        const filteredFoods = await consumptionsLib.getGroupFilteredFoods(groupId);
        
        res.json(filteredFoods);
    } catch (error) {
        console.error('Error fetching group filtered foods:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch group filtered foods',
            details: error.message 
        });
    }
});

module.exports = router;