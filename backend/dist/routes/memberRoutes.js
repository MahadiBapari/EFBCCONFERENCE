"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const memberModel_1 = __importDefault(require("../models/memberModel"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, membershipType, isActive, search } = req.query;
        const filter = {};
        if (membershipType)
            filter.membershipType = membershipType;
        if (isActive !== undefined)
            filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await memberModel_1.default.countDocuments(filter);
        const totalPages = Math.ceil(total / Number(limit));
        const members = await memberModel_1.default.find(filter)
            .sort({ firstName: 1, lastName: 1 })
            .skip(skip)
            .limit(Number(limit));
        const response = {
            success: true,
            data: members,
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
        console.error('Error fetching members:', error);
        const response = {
            success: false,
            error: 'Failed to fetch members'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const member = await memberModel_1.default.findById(req.params.id);
        if (!member) {
            const response = {
                success: false,
                error: 'Member not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: member
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching member:', error);
        const response = {
            success: false,
            error: 'Failed to fetch member'
        };
        res.status(500).json(response);
    }
});
router.post('/', async (req, res) => {
    try {
        const memberData = req.body;
        const requiredFields = ['firstName', 'lastName', 'email', 'membershipType'];
        const missingFields = requiredFields.filter(field => !memberData[field]);
        if (missingFields.length > 0) {
            const response = {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
            return res.status(400).json(response);
        }
        const member = new memberModel_1.default(memberData);
        await member.save();
        const response = {
            success: true,
            data: member,
            message: 'Member created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating member:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        if (error instanceof Error && error.code === 11000) {
            const response = {
                success: false,
                error: 'Email already exists'
            };
            return res.status(409).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to create member'
        };
        res.status(500).json(response);
    }
});
router.put('/:id', async (req, res) => {
    try {
        const memberData = req.body;
        const member = await memberModel_1.default.findByIdAndUpdate(req.params.id, memberData, { new: true, runValidators: true });
        if (!member) {
            const response = {
                success: false,
                error: 'Member not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: member,
            message: 'Member updated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error updating member:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        if (error instanceof Error && error.code === 11000) {
            const response = {
                success: false,
                error: 'Email already exists'
            };
            return res.status(409).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to update member'
        };
        res.status(500).json(response);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const member = await memberModel_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!member) {
            const response = {
                success: false,
                error: 'Member not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            message: 'Member deactivated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error deactivating member:', error);
        const response = {
            success: false,
            error: 'Failed to deactivate member'
        };
        res.status(500).json(response);
    }
});
router.patch('/:id/activate', async (req, res) => {
    try {
        const member = await memberModel_1.default.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        if (!member) {
            const response = {
                success: false,
                error: 'Member not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: member,
            message: 'Member activated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error activating member:', error);
        const response = {
            success: false,
            error: 'Failed to activate member'
        };
        res.status(500).json(response);
    }
});
router.get('/stats/overview', async (req, res) => {
    try {
        const totalMembers = await memberModel_1.default.countDocuments();
        const activeMembers = await memberModel_1.default.countDocuments({ isActive: true });
        const inactiveMembers = totalMembers - activeMembers;
        const membershipTypeStats = await memberModel_1.default.aggregate([
            { $group: { _id: '$membershipType', count: { $sum: 1 } } }
        ]);
        const response = {
            success: true,
            data: {
                totalMembers,
                activeMembers,
                inactiveMembers,
                membershipTypeStats
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching member statistics:', error);
        const response = {
            success: false,
            error: 'Failed to fetch member statistics'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=memberRoutes.js.map