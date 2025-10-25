"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teamModel_1 = __importDefault(require("../models/teamModel"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sportId, isActive, search } = req.query;
        const filter = {};
        if (sportId)
            filter.sportId = sportId;
        if (isActive !== undefined)
            filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await teamModel_1.default.countDocuments(filter);
        const totalPages = Math.ceil(total / Number(limit));
        const teams = await teamModel_1.default.find(filter)
            .populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email')
            .populate('members', 'firstName lastName email')
            .sort({ name: 1 })
            .skip(skip)
            .limit(Number(limit));
        const response = {
            success: true,
            data: teams,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching teams:', error);
        const response = {
            success: false,
            error: 'Failed to fetch teams'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const team = await teamModel_1.default.findById(req.params.id)
            .populate('sportId', 'name category description')
            .populate('captainId', 'firstName lastName email phone')
            .populate('members', 'firstName lastName email phone membershipType');
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: team
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching team:', error);
        const response = {
            success: false,
            error: 'Failed to fetch team'
        };
        res.status(500).json(response);
    }
});
router.post('/', async (req, res) => {
    try {
        const teamData = req.body;
        const requiredFields = ['name', 'sportId', 'captainId'];
        const missingFields = requiredFields.filter(field => !teamData[field]);
        if (missingFields.length > 0) {
            const response = {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
            return res.status(400).json(response);
        }
        const team = new teamModel_1.default(teamData);
        await team.save();
        const populatedTeam = await teamModel_1.default.findById(team._id)
            .populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email');
        const response = {
            success: true,
            data: populatedTeam,
            message: 'Team created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating team:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to create team'
        };
        res.status(500).json(response);
    }
});
router.put('/:id', async (req, res) => {
    try {
        const teamData = req.body;
        const team = await teamModel_1.default.findByIdAndUpdate(req.params.id, teamData, { new: true, runValidators: true }).populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email')
            .populate('members', 'firstName lastName email');
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: team,
            message: 'Team updated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error updating team:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to update team'
        };
        res.status(500).json(response);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const team = await teamModel_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            message: 'Team deactivated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error deactivating team:', error);
        const response = {
            success: false,
            error: 'Failed to deactivate team'
        };
        res.status(500).json(response);
    }
});
router.post('/:id/members', async (req, res) => {
    try {
        const { memberId } = req.body;
        if (!memberId) {
            const response = {
                success: false,
                error: 'Member ID is required'
            };
            return res.status(400).json(response);
        }
        const team = await teamModel_1.default.findById(req.params.id);
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        if (!team.isActive) {
            const response = {
                success: false,
                error: 'Cannot add members to inactive team'
            };
            return res.status(400).json(response);
        }
        if (team.members && team.members.includes(memberId)) {
            const response = {
                success: false,
                error: 'Member is already in the team'
            };
            return res.status(400).json(response);
        }
        const currentCount = team.members ? team.members.length : 0;
        if (team.maxMembers && currentCount >= team.maxMembers) {
            const response = {
                success: false,
                error: 'Team is full'
            };
            return res.status(400).json(response);
        }
        if (!team.members)
            team.members = [];
        team.members.push(memberId);
        await team.save();
        const populatedTeam = await teamModel_1.default.findById(team._id)
            .populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email')
            .populate('members', 'firstName lastName email');
        const response = {
            success: true,
            data: populatedTeam,
            message: 'Member added to team successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error adding member to team:', error);
        const response = {
            success: false,
            error: 'Failed to add member to team'
        };
        res.status(500).json(response);
    }
});
router.delete('/:id/members/:memberId', async (req, res) => {
    try {
        const { id, memberId } = req.params;
        const team = await teamModel_1.default.findById(id);
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        if (team.captainId === memberId) {
            const response = {
                success: false,
                error: 'Cannot remove team captain. Transfer captaincy first.'
            };
            return res.status(400).json(response);
        }
        if (team.members) {
            team.members = team.members.filter((member) => member !== memberId);
            await team.save();
        }
        const populatedTeam = await teamModel_1.default.findById(team._id)
            .populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email')
            .populate('members', 'firstName lastName email');
        const response = {
            success: true,
            data: populatedTeam,
            message: 'Member removed from team successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error removing member from team:', error);
        const response = {
            success: false,
            error: 'Failed to remove member from team'
        };
        res.status(500).json(response);
    }
});
router.patch('/:id/captain', async (req, res) => {
    try {
        const { newCaptainId } = req.body;
        if (!newCaptainId) {
            const response = {
                success: false,
                error: 'New captain ID is required'
            };
            return res.status(400).json(response);
        }
        const team = await teamModel_1.default.findById(req.params.id);
        if (!team) {
            const response = {
                success: false,
                error: 'Team not found'
            };
            return res.status(404).json(response);
        }
        if (!team.members || !team.members.includes(newCaptainId)) {
            const response = {
                success: false,
                error: 'New captain must be a member of the team'
            };
            return res.status(400).json(response);
        }
        team.captainId = newCaptainId;
        await team.save();
        const populatedTeam = await teamModel_1.default.findById(team._id)
            .populate('sportId', 'name category')
            .populate('captainId', 'firstName lastName email')
            .populate('members', 'firstName lastName email');
        const response = {
            success: true,
            data: populatedTeam,
            message: 'Team captaincy transferred successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error transferring captaincy:', error);
        const response = {
            success: false,
            error: 'Failed to transfer captaincy'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=teamRoutes.js.map