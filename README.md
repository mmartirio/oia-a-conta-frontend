# Oia a Conta — Frontend

Aplicação web (React + TypeScript + Vite) do sistema Oia a Conta.

Este repositório foi extraído do monorepo original em 2026-08-27, preservando o histórico de commits da pasta `frontend/`. O backend (microsserviços, infraestrutura Docker Compose etc.) vive em [oia-a-conta-backend](https://github.com/mmartirio/oia-a-conta-backend).

## Desenvolvimento local

```bash
yarn install
yarn dev
```

Variáveis de ambiente esperadas (crie um `.env.local`):

```
VITE_API_URL=http://localhost:8090
VITE_WS_URL=http://localhost:8090
VITE_GOOGLE_CLIENT_ID=
```

## Build

```bash
yarn build
yarn preview
```

## Docker

```bash
docker build \
  --build-arg VITE_API_URL=... \
  --build-arg VITE_WS_URL=... \
  --build-arg VITE_GOOGLE_CLIENT_ID=... \
  -t comanda-frontend .
```

## CI/CD

- `.github/workflows/ci.yml` — type check, build e build da imagem Docker em cada push/PR.
- `.github/workflows/cd-deploy.yml` — publica a imagem no GHCR (`ghcr.io/mmartirio/comanda-digital-frontend`) em push para `main` ou tags `v*`.

O deploy em produção (`docker compose up`) é orquestrado a partir do repositório backend, que referencia esta imagem.
