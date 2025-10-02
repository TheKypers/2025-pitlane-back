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
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
