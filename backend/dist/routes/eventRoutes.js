"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventModel_1 = __importDefault(require("../models/eventModel"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, sportId, status, dateFrom, dateTo, search } = req.query;
        const filter = {};
        if (sportId)
            filter.sportId = sportId;
        if (status)
            filter.status = status;
        if (dateFrom || dateTo) {
            filter.date = {};
            if (dateFrom)
                filter.date.$gte = new Date(dateFrom);
            if (dateTo)
                filter.date.$lte = new Date(dateTo);
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const total = await eventModel_1.default.countDocuments(filter);
        const totalPages = Math.ceil(total / Number(limit));
        const events = await eventModel_1.default.find(filter)
            .populate('sportId', 'name category')
            .populate('organizerId', 'firstName lastName email')
            .sort({ date: 1 })
            .skip(skip)
            .limit(Number(limit));
        const response = {
            success: true,
            data: events,
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
        console.error('Error fetching events:', error);
        const response = {
            success: false,
            error: 'Failed to fetch events'
        };
        res.status(500).json(response);
    }
});
router.get('/:id', async (req, res) => {
    try {
        const event = await eventModel_1.default.findById(req.params.id)
            .populate('sportId', 'name category description')
            .populate('organizerId', 'firstName lastName email phone');
        if (!event) {
            const response = {
                success: false,
                error: 'Event not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: event
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error fetching event:', error);
        const response = {
            success: false,
            error: 'Failed to fetch event'
        };
        res.status(500).json(response);
    }
});
router.post('/', async (req, res) => {
    try {
        const eventData = req.body;
        const requiredFields = ['title', 'description', 'date', 'location', 'sportId', 'organizerId'];
        const missingFields = requiredFields.filter(field => !eventData[field]);
        if (missingFields.length > 0) {
            const response = {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
            return res.status(400).json(response);
        }
        const event = new eventModel_1.default(eventData);
        await event.save();
        const response = {
            success: true,
            data: event,
            message: 'Event created successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error creating event:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to create event'
        };
        res.status(500).json(response);
    }
});
router.put('/:id', async (req, res) => {
    try {
        const eventData = req.body;
        const event = await eventModel_1.default.findByIdAndUpdate(req.params.id, eventData, { new: true, runValidators: true });
        if (!event) {
            const response = {
                success: false,
                error: 'Event not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: event,
            message: 'Event updated successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error updating event:', error);
        if (error instanceof Error && error.name === 'ValidationError') {
            const response = {
                success: false,
                error: error.message
            };
            return res.status(400).json(response);
        }
        const response = {
            success: false,
            error: 'Failed to update event'
        };
        res.status(500).json(response);
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const event = await eventModel_1.default.findByIdAndDelete(req.params.id);
        if (!event) {
            const response = {
                success: false,
                error: 'Event not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            message: 'Event deleted successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error deleting event:', error);
        const response = {
            success: false,
            error: 'Failed to delete event'
        };
        res.status(500).json(response);
    }
});
router.post('/:id/register', async (req, res) => {
    try {
        const { memberId } = req.body;
        if (!memberId) {
            const response = {
                success: false,
                error: 'Member ID is required'
            };
            return res.status(400).json(response);
        }
        const event = await eventModel_1.default.findById(req.params.id);
        if (!event) {
            const response = {
                success: false,
                error: 'Event not found'
            };
            return res.status(404).json(response);
        }
        if (!event.isRegistrationOpen) {
            const response = {
                success: false,
                error: 'Registration is not open for this event'
            };
            return res.status(400).json(response);
        }
        event.currentParticipants = (event.currentParticipants || 0) + 1;
        await event.save();
        const response = {
            success: true,
            message: 'Successfully registered for event',
            data: event
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error registering for event:', error);
        const response = {
            success: false,
            error: 'Failed to register for event'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=eventRoutes.js.map