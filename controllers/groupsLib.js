// controllers/groupsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all groups with their members
 */
async function getAllGroups() {
    return prisma.group.findMany({
        where: {
            isActive: true
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            },
            _count: {
                select: {
                    members: {
                        where: {
                            isActive: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

/**
 * Get groups where a user is a member or creator
 */
async function getUserGroups(profileId) {
    return prisma.group.findMany({
        where: {
            isActive: true,
            OR: [
                { createdBy: profileId },
                {
                    members: {
                        some: {
                            profileId: profileId,
                            isActive: true
                        }
                    }
                }
            ]
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            },
            _count: {
                select: {
                    members: {
                        where: {
                            isActive: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

/**
 * Get a specific group by ID with full details
 */
async function getGroupById(groupId) {
    return prisma.group.findUnique({
        where: {
            GroupID: parseInt(groupId),
            isActive: true
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true,
                            Preference: true,
                            DietaryRestriction: true
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            },
            consumptions: {
                where: {
                    isActive: true
                },
                include: {
                    consumptionFoods: {
                        include: {
                            food: true
                        }
                    }
                },
                orderBy: {
                    consumedAt: 'desc'
                }
            }
        }
    });
}

/**
 * Create a new group
 */
async function createGroup(groupData, creatorId) {
    const { name, description } = groupData;
    
    return prisma.group.create({
        data: {
            name,
            description,
            createdBy: creatorId,
            members: {
                create: {
                    profileId: creatorId,
                    role: 'admin'
                }
            }
        },
        include: {
            members: {
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

/**
 * Update group information
 */
async function updateGroup(groupId, groupData, userId) {
    const { name, description } = groupData;
    
    // Check if user is admin of the group or creator
    const group = await prisma.group.findUnique({
        where: { GroupID: parseInt(groupId) },
        include: {
            members: {
                where: {
                    profileId: userId,
                    isActive: true
                }
            }
        }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    const isCreator = group.createdBy === userId;
    const isGroupAdmin = group.members.some(member => 
        member.profileId === userId && member.role === 'admin'
    );

    if (!isCreator && !isGroupAdmin) {
        throw new Error('Insufficient permissions to update group');
    }

    return prisma.group.update({
        where: {
            GroupID: parseInt(groupId)
        },
        data: {
            name,
            description,
            updatedAt: new Date()
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

/**
 * Add a member to a group
 */
async function addGroupMember(groupId, profileId, role = 'member') {
    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
        where: {
            groupId_profileId: {
                groupId: parseInt(groupId),
                profileId: profileId
            }
        }
    });

    if (existingMember) {
        if (existingMember.isActive) {
            throw new Error('User is already a member of this group');
        } else {
            // Reactivate membership
            return prisma.groupMember.update({
                where: {
                    GroupMemberID: existingMember.GroupMemberID
                },
                data: {
                    isActive: true,
                    role,
                    joinedAt: new Date()
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    }
                }
            });
        }
    }

    return prisma.groupMember.create({
        data: {
            groupId: parseInt(groupId),
            profileId,
            role
        },
        include: {
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

/**
 * Remove a member from a group (soft delete)
 */
async function removeGroupMember(groupId, profileId, requesterId) {
    const group = await prisma.group.findUnique({
        where: { GroupID: parseInt(groupId) },
        include: {
            members: {
                where: {
                    profileId: requesterId,
                    isActive: true
                }
            }
        }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    const requesterMember = group.members.find(member => member.profileId === requesterId);
    const isCreator = group.createdBy === requesterId;
    const isGroupAdmin = requesterMember && requesterMember.role === 'admin';
    const isSelf = profileId === requesterId;

    if (!isCreator && !isGroupAdmin && !isSelf) {
        throw new Error('Insufficient permissions to remove member');
    }

    return prisma.groupMember.updateMany({
        where: {
            groupId: parseInt(groupId),
            profileId: profileId
        },
        data: {
            isActive: false
        }
    });
}

/**
 * Delete a group (soft delete)
 */
async function deleteGroup(groupId, userId) {
    const group = await prisma.group.findUnique({
        where: { GroupID: parseInt(groupId) }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    if (group.createdBy !== userId) {
        throw new Error('Only the group creator can delete the group');
    }

    return prisma.group.update({
        where: {
            GroupID: parseInt(groupId)
        },
        data: {
            isActive: false,
            updatedAt: new Date()
        }
    });
}

/**
 * Get group preferences and dietary restrictions aggregated from all members
 */
async function getGroupDietaryInfo(groupId) {
    const group = await prisma.group.findUnique({
        where: {
            GroupID: parseInt(groupId),
            isActive: true
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        include: {
                            Preference: true,
                            DietaryRestriction: true
                        }
                    }
                }
            }
        }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    // Aggregate preferences and dietary restrictions from all members
    const allPreferences = [];
    const allDietaryRestrictions = [];

    group.members.forEach(member => {
        allPreferences.push(...member.profile.Preference);
        allDietaryRestrictions.push(...member.profile.DietaryRestriction);
    });

    // Remove duplicates
    const uniquePreferences = allPreferences.filter((pref, index, self) =>
        index === self.findIndex(p => p.PreferenceID === pref.PreferenceID)
    );

    const uniqueDietaryRestrictions = allDietaryRestrictions.filter((restriction, index, self) =>
        index === self.findIndex(r => r.DietaryRestrictionID === restriction.DietaryRestrictionID)
    );

    return {
        groupId: group.GroupID,
        groupName: group.name,
        memberCount: group.members.length,
        preferences: uniquePreferences,
        dietaryRestrictions: uniqueDietaryRestrictions
    };
}

module.exports = {
    getAllGroups,
    getUserGroups,
    getGroupById,
    createGroup,
    updateGroup,
    addGroupMember,
    removeGroupMember,
    deleteGroup,
    getGroupDietaryInfo
};