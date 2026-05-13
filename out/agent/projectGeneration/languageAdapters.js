"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageAdapters = void 0;
/**
 * LanguageAdapters
 * Multi-language support with framework-specific adaptations
 */
class LanguageAdapters {
    static SUPPORTED_LANGUAGES = [
        'javascript',
        'typescript',
        'python',
        'go',
        'rust',
        'java',
        'csharp',
        'php',
        'ruby',
    ];
    static LANGUAGE_TEMPLATES = {
        javascript: {
            name: 'JavaScript',
            extension: '.js',
            frameworks: ['Node.js', 'React', 'Vue', 'Svelte', 'Express', 'Next.js'],
            setupCommand: 'npm install',
            runCommand: 'npm run dev',
        },
        typescript: {
            name: 'TypeScript',
            extension: '.ts',
            frameworks: ['Node.js', 'React', 'Vue', 'Express', 'Next.js'],
            setupCommand: 'npm install && npx tsc --init',
            runCommand: 'npm run dev',
        },
        python: {
            name: 'Python',
            extension: '.py',
            frameworks: ['FastAPI', 'Django', 'Flask', 'Celery', 'SQLAlchemy'],
            setupCommand: 'pip install -r requirements.txt',
            runCommand: 'python main.py',
        },
        go: {
            name: 'Go',
            extension: '.go',
            frameworks: ['Gin', 'Echo', 'Fiber', 'Chi', 'GORM'],
            setupCommand: 'go mod download',
            runCommand: 'go run main.go',
        },
        rust: {
            name: 'Rust',
            extension: '.rs',
            frameworks: ['Actix-web', 'Axum', 'Rocket', 'Tokio', 'Serde'],
            setupCommand: 'cargo build',
            runCommand: 'cargo run',
        },
        java: {
            name: 'Java',
            extension: '.java',
            frameworks: ['Spring Boot', 'Quarkus', 'Micronaut', 'Vert.x'],
            setupCommand: 'mvn install',
            runCommand: 'mvn spring-boot:run',
        },
        csharp: {
            name: 'C#',
            extension: '.cs',
            frameworks: ['ASP.NET Core', 'EF Core', 'Blazor'],
            setupCommand: 'dotnet restore',
            runCommand: 'dotnet run',
        },
        php: {
            name: 'PHP',
            extension: '.php',
            frameworks: ['Laravel', 'Symfony', 'Slim', 'CodeIgniter'],
            setupCommand: 'composer install',
            runCommand: 'php artisan serve',
        },
        ruby: {
            name: 'Ruby',
            extension: '.rb',
            frameworks: ['Rails', 'Sinatra', 'Hanami', 'Padrino'],
            setupCommand: 'bundle install',
            runCommand: 'rails server',
        },
    };
    /**
     * Get language config
     */
    static getLanguageConfig(language) {
        return (this.LANGUAGE_TEMPLATES[language.toLowerCase()] ||
            this.LANGUAGE_TEMPLATES.javascript);
    }
    /**
     * Get appropriate package manager for language
     */
    static getPackageManager(language) {
        const managers = {
            javascript: 'npm',
            typescript: 'npm',
            python: 'pip',
            go: 'go',
            rust: 'cargo',
            java: 'maven',
            csharp: 'dotnet',
            php: 'composer',
            ruby: 'gem',
        };
        return managers[language.toLowerCase()] || 'npm';
    }
    /**
     * Get build system for language
     */
    static getBuildSystem(language) {
        const buildSystems = {
            javascript: 'webpack/vite',
            typescript: 'webpack/tsc',
            python: 'setuptools',
            go: 'go build',
            rust: 'cargo',
            java: 'maven/gradle',
            csharp: 'msbuild/dotnet',
            php: 'composer',
            ruby: 'rake',
        };
        return buildSystems[language.toLowerCase()] || 'npm';
    }
    /**
     * Get default config file for language
     */
    static getConfigFile(language) {
        const configFiles = {
            javascript: 'package.json',
            typescript: 'tsconfig.json',
            python: 'pyproject.toml or setup.py',
            go: 'go.mod',
            rust: 'Cargo.toml',
            java: 'pom.xml or build.gradle',
            csharp: '.csproj',
            php: 'composer.json',
            ruby: 'Gemfile',
        };
        return configFiles[language.toLowerCase()] || 'package.json';
    }
    /**
     * Generate language-specific dependencies
     */
    static generateDependencies(language, framework) {
        const dependencies = {
            javascript: {
                react: ['react', 'react-dom', 'react-router-dom'],
                nextjs: ['next', 'react', 'react-dom'],
                express: ['express', 'cors', 'body-parser'],
                vue: ['vue', 'vue-router', 'pinia'],
            },
            python: {
                fastapi: ['fastapi', 'uvicorn', 'pydantic'],
                django: ['django', 'django-rest-framework', 'django-cors-headers'],
                flask: ['flask', 'flask-cors', 'python-dotenv'],
            },
            go: {
                gin: ['github.com/gin-gonic/gin'],
                echo: ['github.com/labstack/echo'],
                fiber: ['github.com/gofiber/fiber/v2'],
            },
            rust: {
                actixweb: ['actix-web', 'tokio', 'serde'],
                axum: ['axum', 'tokio', 'serde'],
            },
        };
        return (dependencies[language.toLowerCase()]?.[framework.toLowerCase()] || []);
    }
    /**
     * Check if language is supported
     */
    static isSupported(language) {
        return this.SUPPORTED_LANGUAGES.includes(language.toLowerCase());
    }
    /**
     * Get all supported frameworks for language
     */
    static getFrameworks(language) {
        const config = this.getLanguageConfig(language);
        return config.frameworks;
    }
    /**
     * Get setup instructions
     */
    static getSetupInstructions(language) {
        const config = this.getLanguageConfig(language);
        const pm = this.getPackageManager(language);
        return {
            install: config.setupCommand,
            dev: config.runCommand,
            build: `${pm} run build`,
        };
    }
}
exports.LanguageAdapters = LanguageAdapters;
exports.default = LanguageAdapters;
//# sourceMappingURL=languageAdapters.js.map