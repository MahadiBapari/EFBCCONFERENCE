"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sportModel_1 = __importDefault(require("../models/sportModel"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, isActive, search } = req.query;
        const filter = {};
        if (category)
            filter.category = category;
        if (isActive !== undefined)
            filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await sportModel_1.default.countDocuments(filter);
        const totalPages = Math.ceil(total / Number(limit));
        const sports = await sportModel_1.default.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(Number(limit));
        const response = {
            success: true,
            data: sports,
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
        console.error('Error fetching sports:', error);
        const response = {
            success: false,
            error: 'Failed to fetch sports'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const sport = await sportModel_1.default.findById(req.params.id);
        if (!sport) {
            const response = {
                success: false,
                error: 'Sport not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: sport
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching sport:', error);
        const response = {
            success: false,
            error: 'Failed to fetch sport'
        };
        res.status(500).json(response);
    }
});
router.post('/', async (req, res) => {
    try {
        const sportData = req.body;
        const requiredFields = ['name', 'description', 'category'];
        const missingFields = requiredFields.filter(field => !sportData[field]);
        if (missingFields.length > 0) {
            const response = {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
            return res.status(400).json(response);
        }
        const sport = new sportModel_1.default(sportData);
        await sport.save();
        const response = {
            success: true,
            data: sport,
            message: 'Sport created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating sport:', error);
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
                error: 'Sport name already exists'
            };
            return res.status(409).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to create sport'
        };
        res.status(500).json(response);
    }
});
router.put('/:id', async (req, res) => {
    try {
        const sportData = req.body;
        const sport = await sportModel_1.default.findByIdAndUpdate(req.params.id, sportData, { new: true, runValidators: true });
        if (!sport) {
            const response = {
                success: false,
                error: 'Sport not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: sport,
            message: 'Sport updated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error updating sport:', error);
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
                error: 'Sport name already exists'
            };
            return res.status(409).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to update sport'
        };
        res.status(500).json(response);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const sport = await sportModel_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!sport) {
            const response = {
                success: false,
                error: 'Sport not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            message: 'Sport deactivated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error deactivating sport:', error);
        const response = {
            success: false,
            error: 'Failed to deactivate sport'
        };
        res.status(500).json(response);
    }
});
router.patch('/:id/activate', async (req, res) => {
    try {
        const sport = await sportModel_1.default.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        if (!sport) {
            const response = {
                success: false,
                error: 'Sport not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: sport,
            message: 'Sport activated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error activating sport:', error);
        const response = {
            success: false,
            error: 'Failed to activate sport'
        };
        res.status(500).json(response);
    }
});
router.get('/stats/overview', async (req, res) => {
    try {
        const totalSports = await sportModel_1.default.countDocuments();
        const activeSports = await sportModel_1.default.countDocuments({ isActive: true });
        const inactiveSports = totalSports - activeSports;
        const categoryStats = await sportModel_1.default.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const response = {
            success: true,
            data: {
                totalSports,
                activeSports,
                inactiveSports,
                categoryStats
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching sport statistics:', error);
        const response = {
            success: false,
            error: 'Failed to fetch sport statistics'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=sportRoutes.js.map