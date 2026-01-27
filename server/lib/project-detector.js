const fs = require('fs');
const path = require('path');

/**
 * Detect project type and return start configuration
 */
function detectProject(projectDir) {
  // Check for .tlc.json custom config first
  const tlcConfigPath = path.join(projectDir, '.tlc.json');
  if (fs.existsSync(tlcConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(tlcConfigPath, 'utf-8'));
      if (config.server?.startCommand) {
        const parts = config.server.startCommand.split(' ');
        return {
          name: 'Custom (.tlc.json)',
          cmd: parts[0],
          args: parts.slice(1),
          port: config.server.appPort || 3000
        };
      }
    } catch (e) {
      // Continue with auto-detection
    }
  }

  // Node.js / JavaScript
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      // Next.js
      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        return {
          name: 'Next.js',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 3000
        };
      }

      // Vite
      if (pkg.dependencies?.vite || pkg.devDependencies?.vite) {
        return {
          name: 'Vite',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 5173
        };
      }

      // Create React App
      if (pkg.dependencies?.['react-scripts']) {
        return {
          name: 'Create React App',
          cmd: 'npm',
          args: ['start'],
          port: 3000
        };
      }

      // Express / Node server
      if (pkg.dependencies?.express) {
        if (pkg.scripts?.dev) {
          return {
            name: 'Express (dev script)',
            cmd: 'npm',
            args: ['run', 'dev'],
            port: parseInt(process.env.PORT || '3000')
          };
        }
        return {
          name: 'Express',
          cmd: 'npm',
          args: ['start'],
          port: parseInt(process.env.PORT || '3000')
        };
      }

      // Nuxt.js
      if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) {
        return {
          name: 'Nuxt.js',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 3000
        };
      }

      // Astro
      if (pkg.dependencies?.astro || pkg.devDependencies?.astro) {
        return {
          name: 'Astro',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 4321
        };
      }

      // SvelteKit
      if (pkg.devDependencies?.['@sveltejs/kit']) {
        return {
          name: 'SvelteKit',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 5173
        };
      }

      // Generic npm dev script
      if (pkg.scripts?.dev) {
        return {
          name: 'Node.js (npm run dev)',
          cmd: 'npm',
          args: ['run', 'dev'],
          port: 3000
        };
      }

      // Generic npm start
      if (pkg.scripts?.start) {
        return {
          name: 'Node.js (npm start)',
          cmd: 'npm',
          args: ['start'],
          port: 3000
        };
      }
    } catch (e) {
      // Continue with other detection
    }
  }

  // Python - pyproject.toml
  const pyprojectPath = path.join(projectDir, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, 'utf-8');

    // FastAPI/Uvicorn
    if (content.includes('fastapi') || content.includes('uvicorn')) {
      return {
        name: 'FastAPI',
        cmd: 'uvicorn',
        args: ['main:app', '--reload', '--port', '8000'],
        port: 8000
      };
    }

    // Django
    if (content.includes('django')) {
      return {
        name: 'Django',
        cmd: 'python',
        args: ['manage.py', 'runserver', '8000'],
        port: 8000
      };
    }
  }

  // Python - requirements.txt
  const requirementsPath = path.join(projectDir, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    const content = fs.readFileSync(requirementsPath, 'utf-8');

    // Flask
    if (content.includes('flask') || content.includes('Flask')) {
      return {
        name: 'Flask',
        cmd: 'flask',
        args: ['run', '--port', '5000'],
        port: 5000
      };
    }

    // FastAPI
    if (content.includes('fastapi') || content.includes('uvicorn')) {
      return {
        name: 'FastAPI',
        cmd: 'uvicorn',
        args: ['main:app', '--reload', '--port', '8000'],
        port: 8000
      };
    }

    // Django
    if (content.includes('django') || content.includes('Django')) {
      return {
        name: 'Django',
        cmd: 'python',
        args: ['manage.py', 'runserver', '8000'],
        port: 8000
      };
    }
  }

  // Go
  const goModPath = path.join(projectDir, 'go.mod');
  if (fs.existsSync(goModPath)) {
    return {
      name: 'Go',
      cmd: 'go',
      args: ['run', '.'],
      port: 8080
    };
  }

  // Ruby - Rails
  const gemfilePath = path.join(projectDir, 'Gemfile');
  if (fs.existsSync(gemfilePath)) {
    const content = fs.readFileSync(gemfilePath, 'utf-8');

    if (content.includes('rails')) {
      return {
        name: 'Ruby on Rails',
        cmd: 'rails',
        args: ['server', '-p', '3000'],
        port: 3000
      };
    }

    // Sinatra
    if (content.includes('sinatra')) {
      return {
        name: 'Sinatra',
        cmd: 'ruby',
        args: ['app.rb'],
        port: 4567
      };
    }
  }

  // Rust
  const cargoPath = path.join(projectDir, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    return {
      name: 'Rust (Cargo)',
      cmd: 'cargo',
      args: ['run'],
      port: 8080
    };
  }

  // PHP - Laravel
  const composerPath = path.join(projectDir, 'composer.json');
  if (fs.existsSync(composerPath)) {
    try {
      const composer = JSON.parse(fs.readFileSync(composerPath, 'utf-8'));
      if (composer.require?.['laravel/framework']) {
        return {
          name: 'Laravel',
          cmd: 'php',
          args: ['artisan', 'serve'],
          port: 8000
        };
      }
    } catch (e) {
      // Continue
    }
  }

  // Elixir - Phoenix
  const mixPath = path.join(projectDir, 'mix.exs');
  if (fs.existsSync(mixPath)) {
    const content = fs.readFileSync(mixPath, 'utf-8');
    if (content.includes('phoenix')) {
      return {
        name: 'Phoenix',
        cmd: 'mix',
        args: ['phx.server'],
        port: 4000
      };
    }
  }

  // Deno
  const denoPath = path.join(projectDir, 'deno.json');
  if (fs.existsSync(denoPath)) {
    return {
      name: 'Deno',
      cmd: 'deno',
      args: ['run', '--allow-net', '--allow-read', 'main.ts'],
      port: 8000
    };
  }

  // Static site (has index.html)
  const indexPath = path.join(projectDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return {
      name: 'Static Site',
      cmd: 'npx',
      args: ['serve', '-p', '3000'],
      port: 3000
    };
  }

  return null;
}

module.exports = { detectProject };
