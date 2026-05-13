/**
 * LanguageAdapters
 * Multi-language support with framework-specific adaptations
 */
export class LanguageAdapters {
  static readonly SUPPORTED_LANGUAGES = [
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

  static readonly LANGUAGE_TEMPLATES: Record<
    string,
    {
      name: string;
      extension: string;
      frameworks: string[];
      setupCommand: string;
      runCommand: string;
    }
  > = {
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
  static getLanguageConfig(
    language: string
  ): (typeof LanguageAdapters.LANGUAGE_TEMPLATES)[keyof typeof LanguageAdapters.LANGUAGE_TEMPLATES] {
    return (
      this.LANGUAGE_TEMPLATES[language.toLowerCase()] ||
      this.LANGUAGE_TEMPLATES.javascript
    );
  }

  /**
   * Get appropriate package manager for language
   */
  static getPackageManager(language: string): string {
    const managers: Record<string, string> = {
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
  static getBuildSystem(language: string): string {
    const buildSystems: Record<string, string> = {
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
  static getConfigFile(language: string): string {
    const configFiles: Record<string, string> = {
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
  static generateDependencies(
    language: string,
    framework: string
  ): string[] {
    const dependencies: Record<string, Record<string, string[]>> = {
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

    return (
      dependencies[language.toLowerCase()]?.[framework.toLowerCase()] || []
    );
  }

  /**
   * Check if language is supported
   */
  static isSupported(language: string): boolean {
    return this.SUPPORTED_LANGUAGES.includes(language.toLowerCase());
  }

  /**
   * Get all supported frameworks for language
   */
  static getFrameworks(language: string): string[] {
    const config = this.getLanguageConfig(language);
    return config.frameworks;
  }

  /**
   * Get setup instructions
   */
  static getSetupInstructions(language: string): {
    install: string;
    dev: string;
    build: string;
  } {
    const config = this.getLanguageConfig(language);
    const pm = this.getPackageManager(language);

    return {
      install: config.setupCommand,
      dev: config.runCommand,
      build: `${pm} run build`,
    };
  }
}

export default LanguageAdapters;
