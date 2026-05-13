"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutonomySystems = exports.AutonomyController = exports.ConflictResolutionEngine = exports.PrioritizationEngine = exports.GoalDecompositionEngine = exports.ProjectWorldModel = void 0;
var projectWorldModel_1 = require("./projectWorldModel");
Object.defineProperty(exports, "ProjectWorldModel", { enumerable: true, get: function () { return __importDefault(projectWorldModel_1).default; } });
var goalDecompositionEngine_1 = require("./goalDecompositionEngine");
Object.defineProperty(exports, "GoalDecompositionEngine", { enumerable: true, get: function () { return __importDefault(goalDecompositionEngine_1).default; } });
var prioritizationEngine_1 = require("./prioritizationEngine");
Object.defineProperty(exports, "PrioritizationEngine", { enumerable: true, get: function () { return __importDefault(prioritizationEngine_1).default; } });
var conflictResolutionEngine_1 = require("./conflictResolutionEngine");
Object.defineProperty(exports, "ConflictResolutionEngine", { enumerable: true, get: function () { return __importDefault(conflictResolutionEngine_1).default; } });
var autonomyController_1 = require("./autonomyController");
Object.defineProperty(exports, "AutonomyController", { enumerable: true, get: function () { return __importDefault(autonomyController_1).default; } });
/**
 * Factory function to initialize all autonomy systems
 */
function initializeAutonomySystems(projectRoot) {
    const worldModel = new ProjectWorldModel(projectRoot);
    const goalDecomposition = new GoalDecompositionEngine();
    const prioritization = new PrioritizationEngine();
    const conflictResolution = new ConflictResolutionEngine();
    const autonomyController = new AutonomyController();
    return {
        worldModel,
        goalDecomposition,
        prioritization,
        conflictResolution,
        autonomyController,
    };
}
exports.initializeAutonomySystems = initializeAutonomySystems;
//# sourceMappingURL=index.js.map