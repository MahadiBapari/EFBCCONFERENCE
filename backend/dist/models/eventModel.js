"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const eventSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        maxlength: [100, 'Event title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Event description is required'],
        trim: true,
        maxlength: [1000, 'Event description cannot exceed 1000 characters']
    },
    date: {
        type: Date,
        required: [true, 'Event date is required'],
        validate: {
            validator: function (value) {
                return value > new Date();
            },
            message: 'Event date must be in the future'
        }
    },
    location: {
        type: String,
        required: [true, 'Event location is required'],
        trim: true,
        maxlength: [200, 'Event location cannot exceed 200 characters']
    },
    maxParticipants: {
        type: Number,
        min: [1, 'Maximum participants must be at least 1'],
        default: 50
    },
    currentParticipants: {
        type: Number,
        default: 0,
        min: [0, 'Current participants cannot be negative']
    },
    sportId: {
        type: String,
        required: [true, 'Sport ID is required'],
        ref: 'Sport'
    },
    organizerId: {
        type: String,
        required: [true, 'Organizer ID is required'],
        ref: 'Member'
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    registrationDeadline: {
        type: Date,
        validate: {
            validator: function (value) {
                return !value || value < this.date;
            },
            message: 'Registration deadline must be before the event date'
        }
    },
    requirements: [{
            type: String,
            trim: true
        }],
    prizes: [{
            type: String,
            trim: true
        }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
eventSchema.virtual('isRegistrationOpen').get(function () {
    const now = new Date();
    const deadline = this.registrationDeadline || this.date;
    return this.status === 'upcoming' && now < deadline && this.currentParticipants < (this.maxParticipants || 0);
});
eventSchema.virtual('availableSpots').get(function () {
    return Math.max(0, (this.maxParticipants || 0) - (this.currentParticipants || 0));
});
eventSchema.index({ date: 1 });
eventSchema.index({ sportId: 1 });
eventSchema.index({ organizerId: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ date: 1, status: 1 });
eventSchema.pre('save', function (next) {
    if (this.currentParticipants && this.maxParticipants && this.currentParticipants > this.maxParticipants) {
        this.currentParticipants = this.maxParticipants;
    }
    next();
});
exports.default = mongoose_1.default.model('Event', eventSchema);
//# sourceMappingURL=eventModel.js.map