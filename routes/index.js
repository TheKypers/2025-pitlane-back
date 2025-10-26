const express = require('express');
const router = express.Router();
const foodsRouter = require('./foods');
const profilesRouter = require('./profile');
const mealsRouter = require('./meals');
const groupsRouter = require('./groups');
const consumptionsRouter = require('./consumptions');
const votingRouter = require('./voting');
const votingHistoryRouter = require('./votingHistory');

const preferencesRouter = require('./preferences');
const dietaryRestrictionsRouter = require('./dietaryRestrictions');

router.use('/foods', foodsRouter);
router.use('/profile', profilesRouter);
router.use('/meals', mealsRouter);
router.use('/groups', groupsRouter);
router.use('/consumptions', consumptionsRouter);
router.use('/voting', votingRouter);
router.use('/voting/history', votingHistoryRouter);

router.use('/preferences', preferencesRouter);
router.use('/dietary-restrictions', dietaryRestrictionsRouter);

module.exports = router;
