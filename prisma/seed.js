// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Preferences
  const healthy = await prisma.preference.upsert({
    where: { name: 'Healthy' },
    update: {},
    create: { name: 'Healthy' },
  });
  const vegan = await prisma.preference.upsert({
    where: { name: 'Vegan' },
    update: {},
    create: { name: 'Vegan' },
  });

  // Create Dietary Restrictions
  const glutenFree = await prisma.dietaryRestriction.upsert({
    where: { name: 'Gluten Free' },
    update: {},
    create: { name: 'Gluten Free' },
  });
  const lactoseFree = await prisma.dietaryRestriction.upsert({
    where: { name: 'Lactose Free' },
    update: {},
    create: { name: 'Lactose Free' },
  });

  // Create Profile (only id and username)
  const testProfile = await prisma.profile.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001', // Example UUID, replace as needed
      username: 'testuser',
    },
  });

  // Create Foods
  const tofu = await prisma.food.create({
    data: {
      name: 'Tofu',
      svgLink: '/images/tofu.svg',
      profileId: testProfile.id,
      preferences: { connect: [{ PreferenceID: vegan.PreferenceID }, { PreferenceID: healthy.PreferenceID }] },
      dietaryRestrictions: { connect: [{ DietaryRestrictionID: glutenFree.DietaryRestrictionID }] },
    },
  });
  const salad = await prisma.food.create({
    data: {
      name: 'Salad',
      svgLink: '/images/salad.svg',
      profileId: testProfile.id,
      preferences: { connect: [{ PreferenceID: healthy.PreferenceID }] },
      dietaryRestrictions: { connect: [{ DietaryRestrictionID: glutenFree.DietaryRestrictionID }, { DietaryRestrictionID: lactoseFree.DietaryRestrictionID }] },
    },
  });

  // Create Badges
  console.log('Creating badges...');
  
  const groupCreatorBadge = await prisma.badge.upsert({
    where: { name: 'Group Creator' },
    update: {},
    create: {
      name: 'Group Creator',
      description: 'Created your first group to share meals with friends',
      badgeType: 'group_creation',
      iconUrl: '🏆',
      requirements: 'Create at least 1 group',
      isActive: true,
    },
  });

  const votingParticipantBadge = await prisma.badge.upsert({
    where: { name: 'Democracy Enthusiast' },
    update: {},
    create: {
      name: 'Democracy Enthusiast',
      description: 'Participated in group meal voting sessions',
      badgeType: 'voting_participation',
      iconUrl: '🗳️',
      requirements: 'Participate in at least 1 voting session',
      isActive: true,
    },
  });

  const votingWinnerBadge = await prisma.badge.upsert({
    where: { name: 'Taste Maker' },
    update: {},
    create: {
      name: 'Taste Maker',
      description: 'Your meal proposals have won group voting sessions',
      badgeType: 'voting_winner',
      iconUrl: '🥇',
      requirements: 'Win at least 1 voting session',
      isActive: true,
    },
  });

  const mealCreatorBadge = await prisma.badge.upsert({
    where: { name: 'Chef' },
    update: {},
    create: {
      name: 'Chef',
      description: 'Created and shared meal recipes with the community',
      badgeType: 'meal_creation',
      iconUrl: '👨‍🍳',
      requirements: 'Create at least 1 meal',
      isActive: true,
    },
  });

  console.log('Badges created successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
