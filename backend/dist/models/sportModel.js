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
const sportSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Sport name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Sport name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Sport description is required'],
        trim: true,
        maxlength: [1000, 'Sport description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        enum: ['individual', 'team', 'mixed'],
        required: [true, 'Sport category is required'],
        default: 'individual'
    },
    rules: {
        type: String,
        trim: true,
        maxlength: [5000, 'Rules cannot exceed 5000 characters']
    },
    equipment: [{
            type: String,
            trim: true,
            maxlength: [100, 'Equipment item cannot exceed 100 characters']
        }],
    minParticipants: {
        type: Number,
        min: [1, 'Minimum participants must be at least 1'],
        default: 1
    },
    maxParticipants: {
        type: Number,
        min: [1, 'Maximum participants must be at least 1'],
        default: 10
    },
    duration: {
        type: Number,
        min: [1, 'Duration must be at least 1 minute'],
        max: [1440, 'Duration cannot exceed 1440 minutes (24 hours)']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
sportSchema.virtual('formattedDuration').get(function () {
    if (!this.duration)
        return null;
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
    }
    else if (hours > 0) {
        return `${hours}h`;
    }
    else {
        return `${minutes}m`;
    }
});
sportSchema.virtual('participantRange').get(function () {
    if (this.minParticipants === this.maxParticipants) {
        return `${this.minParticipants} participant${this.minParticipants !== 1 ? 's' : ''}`;
    }
    return `${this.minParticipants}-${this.maxParticipants} participants`;
});
sportSchema.index({ name: 1 });
sportSchema.index({ category: 1 });
sportSchema.index({ isActive: 1 });
sportSchema.pre('save', function (next) {
    if (this.maxParticipants && this.minParticipants && this.maxParticipants < this.minParticipants) {
        this.maxParticipants = this.minParticipants;
    }
    next();
});
exports.default = mongoose_1.default.model('Sport', sportSchema);
//# sourceMappingURL=sportModel.js.map