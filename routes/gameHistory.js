const express = require('express');
const router = express.Router();
const gameHistoryLib = require('../controllers/gameHistoryLib');

/**
 * GET /game-history/group/:groupId
 * Get game history for a specific group
 */
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const history = await gameHistoryLib.getGroupGameHistory(groupId, limit, offset);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch game history',
      message: error.message 
    });
  }
});

/**
 * GET /game-history/session/:sessionId
 * Get detailed information about a specific game session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await gameHistoryLib.getGameSessionDetails(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching game session details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch game session details',
      message: error.message 
    });
  }
});

/**
 * POST /game-history/session/:sessionId/register-portion
 * Register meal portion consumed by a participant
 */
router.post('/session/:sessionId/register-portion', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { profileId, mealId, foodPortions } = req.body;

    if (!profileId || !mealId || !foodPortions || !Array.isArray(foodPortions)) {
      return res.status(400).json({ 
        error: 'Missing required fields: profileId, mealId, foodPortions' 
      });
    }

    const portion = await gameHistoryLib.registerGameMealPortion(
      sessionId,
      profileId,
      mealId,
      foodPortions
    );

    res.json({
      success: true,
      mealPortion: portion
    });
  } catch (error) {
    console.error('Error registering meal portion:', error);
    res.status(500).json({ 
      error: 'Failed to register meal portion',
      message: error.message 
    });
  }
});

module.exports = router;
