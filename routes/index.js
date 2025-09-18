const express = require('express');
const router = express.Router();
const foodsRouter = require('./foods');
const profilesRouter = require('./profile');

const preferencesRouter = require('./preferences');
const dietaryRestrictionsRouter = require('./dietaryRestrictions');

router.use('/foods', foodsRouter);
router.use('/profile', profilesRouter);

router.use('/preferences', preferencesRouter);
router.use('/dietary-restrictions', dietaryRestrictionsRouter);

module.exports = router;
