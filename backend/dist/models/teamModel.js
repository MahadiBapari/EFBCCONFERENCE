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
const teamSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        maxlength: [100, 'Team name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Team description cannot exceed 1000 characters']
    },
    sportId: {
        type: String,
        required: [true, 'Sport ID is required'],
        ref: 'Sport'
    },
    captainId: {
        type: String,
        required: [true, 'Captain ID is required'],
        ref: 'Member'
    },
    members: [{
            type: String,
            ref: 'Member'
        }],
    maxMembers: {
        type: Number,
        min: [1, 'Maximum members must be at least 1'],
        default: 10
    },
    isActive: {
        type: Boolean,
        default: true
    },
    achievements: [{
            type: String,
            trim: true,
            maxlength: [200, 'Achievement cannot exceed 200 characters']
        }],
    foundedDate: {
        type: Date,
        default: Date.now,
        validate: {
            validator: function (value) {
                return !value || value <= new Date();
            },
            message: 'Founded date cannot be in the future'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
teamSchema.virtual('currentMemberCount').get(function () {
    return this.members ? this.members.length : 0;
});
teamSchema.virtual('availableSpots').get(function () {
    const currentCount = this.members ? this.members.length : 0;
    return Math.max(0, (this.maxMembers || 0) - currentCount);
});
teamSchema.virtual('teamAge').get(function () {
    if (!this.foundedDate)
        return null;
    const today = new Date();
    const founded = new Date(this.foundedDate);
    const diffTime = Math.abs(today.getTime() - founded.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
    else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months !== 1 ? 's' : ''}`;
    }
    else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years !== 1 ? 's' : ''}`;
    }
});
teamSchema.index({ name: 1 });
teamSchema.index({ sportId: 1 });
teamSchema.index({ captainId: 1 });
teamSchema.index({ isActive: 1 });
teamSchema.pre('save', function (next) {
    if (this.captainId && this.members && !this.members.includes(this.captainId)) {
        this.members.push(this.captainId);
    }
    if (this.members && this.maxMembers && this.members.length > this.maxMembers) {
        this.members = this.members.slice(0, this.maxMembers);
    }
    next();
});
teamSchema.pre('validate', function (next) {
    if (this.captainId && this.members && !this.members.includes(this.captainId)) {
        this.members.push(this.captainId);
    }
    next();
});
exports.default = mongoose_1.default.model('Team', teamSchema);
//# sourceMappingURL=teamModel.js.map