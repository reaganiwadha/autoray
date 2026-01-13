# Development Guide

This project uses [Nix](https://nixos.org/) flakes to manage its development environment.

## 1. Install Nix

If you don't have Nix installed, the recommended way is using the [Determinate Nix Installer](https://github.com/DeterminateSystems/nix-installer):

### Fedora / Ubuntu
```bash
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```
*Note: You may need to restart your shell after installation.*

## 2. Start the Development Environment

1.  **Enter the Nix shell:**
    ```bash
    nix develop
    ```
    This will install all necessary dependencies (PostgreSQL, Minio, Python/uv, Node/Yarn, etc.) into a temporary shell environment.

2.  **Start all services:**
    Once inside the shell, run:
    ```bash
    process-compose up
    ```
    This command will automatically start and manage:
    *   PostgreSQL (with migrations)
    *   Minio (S3-compatible storage)
    *   Backend Service (FastAPI)
    *   Frontend Client (Vite/React)

## 3. Access the Application

*   **Frontend:** [http://localhost:5173](http://localhost:5173)
*   **Backend API:** [http://localhost:8000](http://localhost:8000)
*   **Minio Console:** [http://localhost:9001](http://localhost:9001) (User/Pass: `minioadmin` / `minioadmin`)
