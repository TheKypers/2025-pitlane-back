const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BadgesLibrary {
  // Get all available badges
  static async getAllBadges() {
    try {
      const badges = await prisma.badge.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      });
      return { success: true, data: badges };
    } catch (error) {
      console.error('Error fetching badges:', error);
      return { success: false, error: 'Failed to fetch badges' };
    }
  }

  // Get user badges with badge details
  static async getUserBadges(profileId) {
    try {
      const userBadges = await prisma.userBadge.findMany({
        where: { 
          profileId: profileId,
          isCompleted: true 
        },
        include: {
          badge: true
        },
        orderBy: { earnedAt: 'desc' }
      });
      
      return { 
        success: true, 
        data: userBadges.map(ub => ({
          ...ub.badge,
          earnedAt: ub.earnedAt,
          progress: ub.progress,
          maxProgress: ub.maxProgress
        }))
      };
    } catch (error) {
      console.error('Error fetching user badges:', error);
      return { success: false, error: 'Failed to fetch user badges' };
    }
  }

  // Get badge progress for a user (including incomplete badges)
  static async getUserBadgeProgress(profileId) {
    try {
      const allBadges = await prisma.badge.findMany({
        where: { isActive: true }
      });

      const userBadges = await prisma.userBadge.findMany({
        where: { profileId: profileId },
        include: { badge: true }
      });

      const badgeProgress = allBadges.map(badge => {
        const userBadge = userBadges.find(ub => ub.badgeId === badge.BadgeID);
        return {
          badge,
          progress: userBadge ? userBadge.progress : 0,
          maxProgress: userBadge ? userBadge.maxProgress : 1,
          isCompleted: userBadge ? userBadge.isCompleted : false,
          earnedAt: userBadge ? userBadge.earnedAt : null
        };
      });

      return { success: true, data: badgeProgress };
    } catch (error) {
      console.error('Error fetching badge progress:', error);
      return { success: false, error: 'Failed to fetch badge progress' };
    }
  }

  // Award a badge to a user
  static async awardBadge(profileId, badgeId, progress = 1) {
    try {
      // Check if badge exists
      const badge = await prisma.badge.findUnique({
        where: { BadgeID: badgeId, isActive: true }
      });

      if (!badge) {
        return { success: false, error: 'Badge not found' };
      }

      // Check if user already has this badge
      const existingUserBadge = await prisma.userBadge.findUnique({
        where: { 
          profileId_badgeId: { 
            profileId: profileId, 
            badgeId: badgeId 
          }
        }
      });

      if (existingUserBadge) {
        // Update progress if not completed
        if (!existingUserBadge.isCompleted) {
          const newProgress = Math.min(existingUserBadge.progress + progress, existingUserBadge.maxProgress);
          const isCompleted = newProgress >= existingUserBadge.maxProgress;

          const updatedUserBadge = await prisma.userBadge.update({
            where: { UserBadgeID: existingUserBadge.UserBadgeID },
            data: { 
              progress: newProgress,
              isCompleted: isCompleted,
              earnedAt: isCompleted ? new Date() : existingUserBadge.earnedAt
            },
            include: { badge: true }
          });

          return { 
            success: true, 
            data: updatedUserBadge,
            newlyCompleted: isCompleted && !existingUserBadge.isCompleted
          };
        } else {
          return { success: true, data: existingUserBadge, alreadyCompleted: true };
        }
      } else {
        // Create new user badge
        const isCompleted = progress >= 1;
        const userBadge = await prisma.userBadge.create({
          data: {
            profileId: profileId,
            badgeId: badgeId,
            progress: progress,
            maxProgress: 1,
            isCompleted: isCompleted,
            earnedAt: isCompleted ? new Date() : undefined
          },
          include: { badge: true }
        });

        return { 
          success: true, 
          data: userBadge,
          newlyCompleted: isCompleted
        };
      }
    } catch (error) {
      console.error('Error awarding badge:', error);
      return { success: false, error: 'Failed to award badge' };
    }
  }

  // Check and award badges based on user actions
  static async checkAndAwardBadges(profileId, action, data = {}) {
    const results = [];

    try {
      switch (action) {
        case 'group_created':
          const groupCreatorBadge = await prisma.badge.findFirst({
            where: { badgeType: 'group_creation', isActive: true }
          });
          if (groupCreatorBadge) {
            const result = await this.awardBadge(profileId, groupCreatorBadge.BadgeID);
            results.push(result);
          }
          break;

        case 'meal_created':
          const mealCreatorBadge = await prisma.badge.findFirst({
            where: { badgeType: 'meal_creation', isActive: true }
          });
          if (mealCreatorBadge) {
            const result = await this.awardBadge(profileId, mealCreatorBadge.BadgeID);
            results.push(result);
          }
          break;

        case 'voting_participated':
          const votingParticipantBadge = await prisma.badge.findFirst({
            where: { badgeType: 'voting_participation', isActive: true }
          });
          if (votingParticipantBadge) {
            const result = await this.awardBadge(profileId, votingParticipantBadge.BadgeID);
            results.push(result);
          }
          break;

        case 'voting_won':
          const votingWinnerBadge = await prisma.badge.findFirst({
            where: { badgeType: 'voting_winner', isActive: true }
          });
          if (votingWinnerBadge) {
            const result = await this.awardBadge(profileId, votingWinnerBadge.BadgeID);
            results.push(result);
          }
          break;

        default:
          console.warn(`Unknown badge action: ${action}`);
      }

      // Filter successful results that are newly completed
      const newlyEarnedBadges = results
        .filter(r => r.success && r.newlyCompleted)
        .map(r => r.data.badge);

      return {
        success: true,
        newlyEarnedBadges,
        allResults: results
      };

    } catch (error) {
      console.error('Error checking and awarding badges:', error);
      return { success: false, error: 'Failed to check badges' };
    }
  }

  // Get badge statistics for a user
  static async getUserBadgeStats(profileId) {
    try {
      const totalBadges = await prisma.badge.count({
        where: { isActive: true }
      });

      const earnedBadges = await prisma.userBadge.count({
        where: { 
          profileId: profileId,
          isCompleted: true
        }
      });

      const recentBadges = await prisma.userBadge.findMany({
        where: { 
          profileId: profileId,
          isCompleted: true
        },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
        take: 3
      });

      return {
        success: true,
        data: {
          totalBadges,
          earnedBadges,
          completionPercentage: totalBadges > 0 ? Math.round((earnedBadges / totalBadges) * 100) : 0,
          recentBadges: recentBadges.map(ub => ({
            ...ub.badge,
            earnedAt: ub.earnedAt
          }))
        }
      };
    } catch (error) {
      console.error('Error fetching badge statistics:', error);
      return { success: false, error: 'Failed to fetch badge statistics' };
    }
  }
}

module.exports = BadgesLibrary;