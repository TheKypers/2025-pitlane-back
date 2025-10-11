// routes/groups.js
const express = require('express');
const router = express.Router();
const groupsLib = require('../controllers/groupsLib');

/**
 * GET /groups
 * Get all groups or user's groups
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        
        let groups;
        if (userId) {
            groups = await groupsLib.getUserGroups(userId);
        } else {
            groups = await groupsLib.getAllGroups();
        }
        
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ 
            error: 'Failed to fetch groups',
            details: error.message 
        });
    }
});

/**
 * GET /groups/:id
 * Get a specific group by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const group = await groupsLib.getGroupById(id);
        
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ 
            error: 'Failed to fetch group',
            details: error.message 
        });
    }
});

/**
 * POST /groups
 * Create a new group
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, createdBy } = req.body;
        
        if (!name || !createdBy) {
            return res.status(400).json({ 
                error: 'Name and createdBy are required' 
            });
        }
        
        const groupData = { name, description };
        const newGroup = await groupsLib.createGroup(groupData, createdBy);
        
        res.status(201).json(newGroup);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ 
            error: 'Failed to create group',
            details: error.message 
        });
    }
});

/**
 * PUT /groups/:id
 * Update a group
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }
        
        const groupData = { name, description };
        const updatedGroup = await groupsLib.updateGroup(id, groupData, userId);
        
        res.json(updatedGroup);
    } catch (error) {
        console.error('Error updating group:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Insufficient permissions to update group') {
            return res.status(403).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to update group',
            details: error.message 
        });
    }
});

/**
 * DELETE /groups/:id
 * Delete a group (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }
        
        await groupsLib.deleteGroup(id, userId);
        
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Only the group creator can delete the group') {
            return res.status(403).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete group',
            details: error.message 
        });
    }
});

/**
 * POST /groups/:id/members
 * Add a member to a group
 */
router.post('/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const { profileId, role } = req.body;
        
        if (!profileId) {
            return res.status(400).json({ 
                error: 'Profile ID is required' 
            });
        }
        
        const newMember = await groupsLib.addGroupMember(id, profileId, role);
        
        res.status(201).json(newMember);
    } catch (error) {
        console.error('Error adding group member:', error);
        
        if (error.message === 'User is already a member of this group') {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to add group member',
            details: error.message 
        });
    }
});

/**
 * DELETE /groups/:id/members/:profileId
 * Remove a member from a group
 */
router.delete('/:id/members/:profileId', async (req, res) => {
    try {
        const { id, profileId } = req.params;
        const { requesterId } = req.body;
        
        if (!requesterId) {
            return res.status(400).json({ 
                error: 'Requester ID is required' 
            });
        }
        
        await groupsLib.removeGroupMember(id, profileId, requesterId);
        
        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing group member:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Insufficient permissions to remove member') {
            return res.status(403).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to remove group member',
            details: error.message 
        });
    }
});

/**
 * GET /groups/:id/dietary-info
 * Get aggregated dietary preferences and restrictions for a group
 */
router.get('/:id/dietary-info', async (req, res) => {
    try {
        const { id } = req.params;
        const dietaryInfo = await groupsLib.getGroupDietaryInfo(id);
        
        res.json(dietaryInfo);
    } catch (error) {
        console.error('Error fetching group dietary info:', error);
        
        if (error.message === 'Group not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch group dietary info',
            details: error.message 
        });
    }
});

module.exports = router;