/**
 * Hardened Dockerfile Templates
 *
 * CIS Docker Benchmark compliant templates for production deployments.
 */

export const SECURITY_HEADERS = {
  nginx: `
# Security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
`,
  express: `
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
`,
};

/**
 * Generate hardened Node.js server Dockerfile
 */
export function generateServerDockerfile(options = {}) {
  const {
    nodeVersion = '20',
    port = 5001,
    appDir = '/app',
    user = 'node',
    maintainer = '',
  } = options;

  const labelSection = maintainer ? `LABEL maintainer="${maintainer}"\n` : 'LABEL maintainer="team@example.com"\n';

  return `# Stage 1: Build
FROM node:${nodeVersion}-alpine AS builder

WORKDIR ${appDir}

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build if needed (TypeScript, etc.)
RUN npm run build --if-present

# Remove devDependencies
RUN npm prune --production

# Stage 2: Production
FROM node:${nodeVersion}-alpine AS production

${labelSection}
# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set non-root user
USER ${user}

WORKDIR ${appDir}

# Copy built application from builder
COPY --from=builder --chown=${user}:${user} ${appDir}/node_modules ./node_modules
COPY --from=builder --chown=${user}:${user} ${appDir}/package*.json ./
COPY --from=builder --chown=${user}:${user} ${appDir}/dist ./dist
COPY --from=builder --chown=${user}:${user} ${appDir}/lib ./lib

# Set production environment
ENV NODE_ENV=production
ENV PORT=${port}

EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "lib/index.js"]
`;
}

/**
 * Generate hardened React/Vite dashboard Dockerfile with nginx
 */
export function generateDashboardDockerfile(options = {}) {
  const {
    nodeVersion = '20',
    nginxVersion = '1.25',
    port = 80,
    buildDir = 'dist',
    user = 'nginx',
    maintainer = '',
  } = options;

  const labelSection = maintainer ? `LABEL maintainer="${maintainer}"\n` : 'LABEL maintainer="team@example.com"\n';

  return `# Stage 1: Build
FROM node:${nodeVersion}-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production with nginx
FROM nginx:${nginxVersion}-alpine AS production

${labelSection}
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create non-root user if not nginx
USER ${user}

WORKDIR /usr/share/nginx/html

# Copy built files
COPY --from=builder --chown=${user}:${user} /app/${buildDir} .

# Copy custom nginx config
COPY --chown=${user}:${user} nginx.conf /etc/nginx/conf.d/app.conf

EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
`;
}

/**
 * Generate customizable base Dockerfile
 */
export function generateBaseDockerfile(options = {}) {
  const {
    baseImage,
    user = 'appuser',
    workdir = '/app',
    maintainer = '',
    packages = [],
  } = options;

  if (!baseImage) {
    throw new Error('baseImage is required');
  }

  const isAlpine = baseImage.includes('alpine');
  const labelSection = maintainer ? `LABEL maintainer="${maintainer}"\n` : '';

  let packageInstall = '';
  if (packages.length > 0) {
    if (isAlpine) {
      packageInstall = `RUN apk add --no-cache ${packages.join(' ')}\n`;
    } else {
      packageInstall = `RUN apt-get update && apt-get install -y --no-install-recommends ${packages.join(' ')} && rm -rf /var/lib/apt/lists/*\n`;
    }
  } else {
    // Add minimal security hardening
    if (isAlpine) {
      packageInstall = `RUN apk add --no-cache dumb-init\n`;
    } else {
      packageInstall = `RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*\n`;
    }
  }

  // Create non-root user
  let userSetup = '';
  if (user !== 'root') {
    if (isAlpine) {
      userSetup = `
# Create non-root user
RUN addgroup -g 1001 ${user} && adduser -u 1001 -G ${user} -s /bin/sh -D ${user}
`;
    } else {
      userSetup = `
# Create non-root user
RUN groupadd -g 1001 ${user} && useradd -u 1001 -g ${user} -s /bin/bash -m ${user}
`;
    }
  }

  return `FROM ${baseImage}

${labelSection}${packageInstall}${userSetup}
WORKDIR ${workdir}

USER ${user}
`;
}

/**
 * Generate nginx config for security headers
 */
export function generateNginxConfig(options = {}) {
  const { port = 80, upstream = null } = options;

  const upstreamBlock = upstream
    ? `
upstream backend {
    server ${upstream};
}
`
    : '';

  const proxyBlock = upstream
    ? `
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
`
    : '';

  return `${upstreamBlock}
server {
    listen ${port};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
${proxyBlock}
    # Static file caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
}
