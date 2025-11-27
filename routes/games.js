const express = require('express');
const router = express.Router();
const gamesLib = require('../controllers/gamesLib');

/**
 * POST /games/create
 * Create a new game session
 */
router.post('/create', async (req, res) => {
  try {
    const { groupId, hostId, gameType, duration, minPlayers } = req.body;

    if (!groupId || !hostId || !gameType) {
      return res.status(400).json({ 
        error: 'Missing required fields: groupId, hostId, gameType' 
      });
    }

    if (!['egg_clicker', 'roulette'].includes(gameType)) {
      return res.status(400).json({ 
        error: 'Invalid game type. Must be egg_clicker or roulette' 
      });
    }

    const gameSession = await gamesLib.createGameSession(
      groupId, 
      hostId, 
      gameType, 
      duration,
      minPlayers
    );

    res.status(201).json(gameSession);
  } catch (error) {
    console.error('[games] Error creating game session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/join
 * Join a game session with a meal proposal
 */
router.post('/:gameSessionId/join', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { profileId, mealId } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Missing required field: profileId' });
    }

    const participant = await gamesLib.joinGameSession(
      gameSessionId, 
      profileId, 
      mealId
    );

    res.status(200).json(participant);
  } catch (error) {
    console.error('[games] Error joining game:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /games/:gameSessionId/ready
 * Mark player as ready
 */
router.put('/:gameSessionId/ready', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { profileId, isReady } = req.body;

    if (!profileId) {
      return res.status(400).json({ error: 'Missing required field: profileId' });
    }

    const participant = await gamesLib.markPlayerReady(
      gameSessionId, 
      profileId, 
      isReady !== false
    );

    res.status(200).json(participant);
  } catch (error) {
    console.error('[games] Error marking ready:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/start-countdown
 * Start the game countdown (host only)
 */
router.post('/:gameSessionId/start-countdown', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { hostId } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing required field: hostId' });
    }

    const gameSession = await gamesLib.startGameCountdown(gameSessionId, hostId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error starting countdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/start-playing
 * Transition from countdown to playing state
 */
router.post('/:gameSessionId/start-playing', async (req, res) => {
  try {
    const { gameSessionId } = req.params;

    const gameSession = await gamesLib.startGamePlaying(gameSessionId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error starting playing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/end-time
 * End game time and transition to submitting state
 */
router.post('/:gameSessionId/end-time', async (req, res) => {
  try {
    const { gameSessionId } = req.params;

    const gameSession = await gamesLib.endGameTime(gameSessionId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error ending time:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/submit-clicks
 * Submit final click count
 */
router.post('/:gameSessionId/submit-clicks', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { profileId, clickCount } = req.body;

    if (!profileId || clickCount === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: profileId, clickCount' 
      });
    }

    const participant = await gamesLib.submitClickCount(
      gameSessionId, 
      profileId, 
      clickCount
    );

    res.status(200).json(participant);
  } catch (error) {
    console.error('[games] Error submitting clicks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /games/:gameSessionId
 * Get game session details
 */
router.get('/:gameSessionId', async (req, res) => {
  try {
    const { gameSessionId } = req.params;

    const gameSession = await gamesLib.getGameSession(gameSessionId);

    if (!gameSession) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error getting game session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /games/group/:groupId/active
 * Get active game session for a group
 */
router.get('/group/:groupId/active', async (req, res) => {
  try {
    const { groupId } = req.params;

    const gameSession = await gamesLib.getActiveGameSession(groupId);

    if (!gameSession) {
      return res.status(404).json({ error: 'No active game session found' });
    }

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error getting active game:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/force-complete
 * Force complete game (host only, skip waiting for all submissions)
 */
router.post('/:gameSessionId/force-complete', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { hostId } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing required field: hostId' });
    }

    const gameSession = await gamesLib.forceCompleteGame(gameSessionId, hostId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error forcing game completion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/roulette/determine-winner
 * Determine the winner for animation (doesn't complete the game)
 */
router.post('/:gameSessionId/roulette/determine-winner', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { hostId } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing required field: hostId' });
    }

    const winnerData = await gamesLib.determineRouletteWinner(gameSessionId, hostId);

    res.status(200).json(winnerData);
  } catch (error) {
    console.error('[games] Error determining roulette winner:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /games/:gameSessionId/roulette/spin
 * Complete a roulette game by randomly selecting a proposed meal (host only)
 * Or use predetermined winner if winnerProfileId is provided
 */
router.post('/:gameSessionId/roulette/spin', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { hostId, winnerProfileId } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing required field: hostId' });
    }

    const gameSession = await gamesLib.completeRoulette(gameSessionId, hostId, winnerProfileId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error spinning roulette:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /games/:gameSessionId
 * Cancel a game session (host only)
 */
router.delete('/:gameSessionId', async (req, res) => {
  try {
    const { gameSessionId } = req.params;
    const { hostId } = req.body;

    if (!hostId) {
      return res.status(400).json({ error: 'Missing required field: hostId' });
    }

    const gameSession = await gamesLib.cancelGameSession(gameSessionId, hostId);

    res.status(200).json(gameSession);
  } catch (error) {
    console.error('[games] Error cancelling game:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
