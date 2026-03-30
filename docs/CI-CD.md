# CI/CD Pipeline (GitHub Actions + Vercel)

This project now has an automated CI/CD pipeline at:

- `.github/workflows/ci-cd.yml`

## What it does

1. On every Pull Request to `main`:
- installs dependencies
- runs `npm run lint`
- runs `npm run build`

2. On every push to `main`:
- runs the same CI checks
- deploys to **Vercel Production** automatically

This means any code merged into `main` gets reflected on the live website.

## One-time setup (required)

In your GitHub repository:

1. Go to `Settings -> Secrets and variables -> Actions`
2. Add these **Repository secrets**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## How to get the Vercel values

1. `VERCEL_TOKEN`
- Vercel Dashboard -> `Settings -> Tokens` -> create token

2. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
- easiest method from local project:
  - run `vercel link`
  - check `.vercel/project.json`

## Recommended branch protection

In GitHub:

1. `Settings -> Branches -> Add branch protection rule`
2. Branch name pattern: `main`
3. Enable:
- `Require a pull request before merging`
- `Require status checks to pass before merging`
4. Select check: `Lint and Build`

Now broken code cannot be merged, and every merge to `main` deploys safely.
