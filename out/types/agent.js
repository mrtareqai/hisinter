"use strict";
// Sinter AI 4.0 - Unified Agent Type Definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryType = exports.RecoveryAction = exports.ErrorType = exports.ActionType = exports.IntentType = void 0;
var IntentType;
(function (IntentType) {
    IntentType["CREATE_PROJECT"] = "create_project";
    IntentType["ADD_FEATURE"] = "add_feature";
    IntentType["FIX_BUG"] = "fix_bug";
    IntentType["REFACTOR"] = "refactor";
    IntentType["EXPLAIN"] = "explain";
    IntentType["ANALYZE"] = "analyze";
    IntentType["OPTIMIZE"] = "optimize";
    IntentType["GENERATE_CODE"] = "generate_code";
    IntentType["SETUP_CONFIG"] = "setup_config";
    IntentType["INSTALL_DEPS"] = "install_deps";
    IntentType["CUSTOM"] = "custom";
})(IntentType || (exports.IntentType = IntentType = {}));
var ActionType;
(function (ActionType) {
    ActionType["CREATE_FILE"] = "create_file";
    ActionType["MODIFY_FILE"] = "modify_file";
    ActionType["DELETE_FILE"] = "delete_file";
    ActionType["CREATE_FOLDER"] = "create_folder";
    ActionType["INSTALL_PACKAGE"] = "install_package";
    ActionType["RUN_COMMAND"] = "run_command";
    ActionType["GENERATE_CODE"] = "generate_code";
    ActionType["ANALYZE_CODE"] = "analyze_code";
    ActionType["UPDATE_CONFIG"] = "update_config";
    ActionType["LINK_DEPENDENCY"] = "link_dependency";
})(ActionType || (exports.ActionType = ActionType = {}));
var ErrorType;
(function (ErrorType) {
    ErrorType["FILE_NOT_FOUND"] = "file_not_found";
    ErrorType["PERMISSION_DENIED"] = "permission_denied";
    ErrorType["COMMAND_FAILED"] = "command_failed";
    ErrorType["PACKAGE_NOT_FOUND"] = "package_not_found";
    ErrorType["SYNTAX_ERROR"] = "syntax_error";
    ErrorType["DEPENDENCY_CONFLICT"] = "dependency_conflict";
    ErrorType["TIMEOUT"] = "timeout";
    ErrorType["UNKNOWN"] = "unknown";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
var RecoveryAction;
(function (RecoveryAction) {
    RecoveryAction["RETRY"] = "retry";
    RecoveryAction["SKIP"] = "skip";
    RecoveryAction["ALTERNATIVE"] = "alternative";
    RecoveryAction["ROLLBACK"] = "rollback";
    RecoveryAction["ASK_USER"] = "ask_user";
})(RecoveryAction || (exports.RecoveryAction = RecoveryAction = {}));
var MemoryType;
(function (MemoryType) {
    MemoryType["TASK_SOLUTION"] = "task_solution";
    MemoryType["CODE_PATTERN"] = "code_pattern";
    MemoryType["USER_PREFERENCE"] = "user_preference";
    MemoryType["PROJECT_PATTERN"] = "project_pattern";
    MemoryType["ERROR_FIX"] = "error_fix";
    MemoryType["FRAMEWORK_KNOWLEDGE"] = "framework_knowledge";
    MemoryType["OPTIMIZATION"] = "optimization";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
//# sourceMappingURL=agent.js.map