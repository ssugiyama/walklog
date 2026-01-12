# Development Environment

This project includes a complete development container setup using VS Code Dev Containers.

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Starting the Development Environment

1. Open the project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Type "Dev Containers: Reopen in Container" and select it
4. Wait for the container to build and start

### What's Included

The development container includes:
- **Node.js 24** with npm/pnpm
- **PostGIS/PostgreSQL** database
- **VS Code extensions** for TypeScript, ESLint, Prettier, Jest, and more
- **Port forwarding** for Next.js app (3000) and PostgreSQL (5432)
- **Git client** for version control

### Available Services

- **Next.js Application**: http://localhost:3000
- **PostgreSQL Database**: localhost:5432

### Development Commands

```bash
# Install dependencies (run from /workspace/web)
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run ESLint
pnpm lint

# Build for production
pnpm build
```

### Database Access

The PostgreSQL database is automatically initialized with the schema from `walks.sql`. You can connect to it using:

```bash
# From within the container
psql -h db -U <user>> -d <database>>
```

### Troubleshooting

If you encounter issues:

1. **Rebuild container**: Press `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"
2. **Check Docker**: Ensure Docker Desktop is running
3. **Port conflicts**: Make sure ports 3000 and 5432 are not in use by other applications
4. **Permissions**: The container runs as the `node` user with UID 1001