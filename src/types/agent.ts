// Sinter AI 4.0 - Unified Agent Type Definitions

export interface UserIntent {
  raw: string;
  understood: string;
  type: IntentType;
  confidence: number;
  requiredInfo: string[];
  suggestedQuestions: string[];
  context: IntentContext;
  parameters: Record<string, unknown>;
}

export enum IntentType {
  CREATE_PROJECT = 'create_project',
  ADD_FEATURE = 'add_feature',
  FIX_BUG = 'fix_bug',
  REFACTOR = 'refactor',
  EXPLAIN = 'explain',
  ANALYZE = 'analyze',
  OPTIMIZE = 'optimize',
  GENERATE_CODE = 'generate_code',
  SETUP_CONFIG = 'setup_config',
  INSTALL_DEPS = 'install_deps',
  CUSTOM = 'custom',
}

export interface IntentContext {
  projectRoot: string;
  currentFramework?: string;
  userStyle?: string;
  previousPatterns?: string[];
  relatedTasks?: string[];
}

export interface ExecutionPlan {
  id: string;
  intent: UserIntent;
  steps: ExecutionStep[];
  estimatedDuration: number;
  checkpoints: Checkpoint[];
  rollbackable: boolean;
  dependencies: string[];
}

export interface ExecutionStep {
  id: string;
  order: number;
  action: ActionType;
  description: string;
  narrative: string;
  target: string;
  parameters: Record<string, unknown>;
  expectedOutput: string;
  errorHandling: ErrorStrategy[];
  checkpoint?: string;
}

export enum ActionType {
  CREATE_FILE = 'create_file',
  MODIFY_FILE = 'modify_file',
  DELETE_FILE = 'delete_file',
  CREATE_FOLDER = 'create_folder',
  INSTALL_PACKAGE = 'install_package',
  RUN_COMMAND = 'run_command',
  GENERATE_CODE = 'generate_code',
  ANALYZE_CODE = 'analyze_code',
  UPDATE_CONFIG = 'update_config',
  LINK_DEPENDENCY = 'link_dependency',
}

export interface Checkpoint {
  id: string;
  afterStep: number;
  validation: ValidationRule[];
  recoveryStrategy?: ErrorStrategy;
}

export interface ValidationRule {
  type: 'file_exists' | 'file_contains' | 'command_success' | 'output_matches';
  target: string;
  expected: string | string[];
}

export interface ExecutionResult {
  success: boolean;
  stepId: string;
  output: string;
  duration: number;
  errors: ExecutionError[];
  metadata: Record<string, unknown>;
}

export interface ExecutionError {
  id: string;
  type: ErrorType;
  message: string;
  context: string;
  suggestion: string;
  severity: 'critical' | 'warning' | 'info';
  recoverable: boolean;
}

export enum ErrorType {
  FILE_NOT_FOUND = 'file_not_found',
  PERMISSION_DENIED = 'permission_denied',
  COMMAND_FAILED = 'command_failed',
  PACKAGE_NOT_FOUND = 'package_not_found',
  SYNTAX_ERROR = 'syntax_error',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export interface ErrorStrategy {
  condition: string;
  action: RecoveryAction;
  retries: number;
  backoff: number;
}

export enum RecoveryAction {
  RETRY = 'retry',
  SKIP = 'skip',
  ALTERNATIVE = 'alternative',
  ROLLBACK = 'rollback',
  ASK_USER = 'ask_user',
}

export interface ProjectContext {
  root: string;
  name: string;
  framework?: string;
  language: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  structure: FileTreeNode[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  userStyle: CodeStyle;
  recentPatterns: string[];
  successfulPatterns: string[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  size?: number;
}

export interface CodeStyle {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  arrowParens: 'avoid' | 'always';
  jsxSingleQuote: boolean;
}

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  relevance: number;
  frequency: number;
  success: boolean;
}

export enum MemoryType {
  TASK_SOLUTION = 'task_solution',
  CODE_PATTERN = 'code_pattern',
  USER_PREFERENCE = 'user_preference',
  PROJECT_PATTERN = 'project_pattern',
  ERROR_FIX = 'error_fix',
  FRAMEWORK_KNOWLEDGE = 'framework_knowledge',
  OPTIMIZATION = 'optimization',
}

export interface NarrativeEvent {
  id: string;
  timestamp: number;
  type: 'progress' | 'info' | 'warning' | 'error' | 'success';
  message: string;
  step: string;
  progress: number;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  isActive: boolean;
  currentTask: ExecutionPlan | null;
  currentStep: number;
  progress: number;
  narrativeEvents: NarrativeEvent[];
  errors: ExecutionError[];
  memoryState: Record<string, unknown>;
  contextState: ProjectContext | null;
}
