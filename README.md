# Blockchain Resume Authenticity System

A credential management and verification platform that helps detect unauthorized changes to issuer-recorded credentials using blockchain hashes. It does not independently prove that an issuer's original claim is true.

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS, Lucide Icons, Ethers.js
- **Backend:** Node.js, Express, MongoDB, JWT Auth
- **Blockchain:** Ethereum (Solidity, Hardhat)
- **Hashing:** SHA-256

## Project Structure
- `/blockchain`: Smart contracts and Hardhat environment.
- `/server`: Node.js/Express API with MongoDB models.
- `/client`: Next.js frontend with Tailwind and Web3 integration.

## Deployment Steps

Use Node.js 22.13 or later in the Node 22 line for local work and hosting builds. The root and service folders include `.nvmrc` files; their package manifests also declare the supported Node range.

### Configuration
Copy each `.env.example` to `.env` in the matching `server`, `client`, and `blockchain` folders and fill in the values. Never commit real `.env` files, API keys, RPC URLs with secrets, or wallet private keys.

For the server, set a long random `JWT_SECRET`, a MongoDB connection string in `MONGO_URI`, the frontend origin in `CLIENT_URL`, and the blockchain RPC and contract address in `BLOCKCHAIN_RPC_URL` and `CONTRACT_ADDRESS`. For the client, set `NEXT_PUBLIC_API_URL`, the deployed contract address as `NEXT_PUBLIC_CONTRACT_ADDRESS`, and a read-only RPC endpoint as `NEXT_PUBLIC_RPC_URL` so public verification works without MetaMask.

Institution registrations are intentionally left unapproved. An administrator must approve the account in MongoDB (`isApproved: true`) and authorize the institution's wallet in the contract before it can issue credentials. The contract owner is the deployer wallet.

The public profile shows a student's name and verified credential records. Do not place personal identifiers in on-chain fields: blockchain data is public and cannot be deleted. Uploaded certificate files are stored as private MongoDB binary data and downloadable only by the student, issuing institution, or an admin. Uploads are capped at 10 MiB to stay below MongoDB's per-document limit. For high-volume production, move the file payloads to private object storage.

The student dashboard includes a credential assistant at `/dashboard/assistant`. It retrieves up to five relevant verified records belonging to the signed-in student and asks the OpenAI Responses API to answer from those records with citations. It sends credential titles, institutions, dates, and hashes; it does not send uploaded files, names, or email addresses. Set `OPENAI_API_KEY` on the server to enable it. The route is limited to ten requests per student per 15 minutes.

Institutions can optionally request a preliminary visual and text consistency review during certificate upload. The institution must confirm it has permission to send the file to OpenAI. The API sends the PDF/image to the model and stores only its short review summary and observations. A review flag pauses issuance until a person acknowledges the findings. This AI review cannot establish authenticity or fraud; even a clean result is not proof. Live hash and chain checks remain the authentication mechanism. Document screening is limited to six requests per institution per 15 minutes.

### 1. Smart Contract (Blockchain)
```bash
cd blockchain
npm ci
# Start local hardhat node
npx hardhat node
# Deploy contract (in a new terminal)
npm run deploy:localhost
```
Copy the printed address to `client/.env` as `NEXT_PUBLIC_CONTRACT_ADDRESS`. A local Hardhat deployment is only for development; deploy to a public test network before a public launch.

### 2. Backend (Server)
```bash
cd server
npm ci
# Copy .env.example to .env and configure MongoDB and JWT_SECRET
npm start
```

### 3. Frontend (Client)
```bash
cd client
npm ci
# Copy .env.example to .env and set the API URL and contract address
npm run dev
```

For a demo deployment, the included `render.yaml` creates a free Render API service. Connect the repository to Render, then add the requested MongoDB Atlas URI, frontend URL, blockchain RPC URL, deployed contract address, and OpenAI key in Render's environment settings. In Vercel, import the same repository and set the project root directory to `client`; add `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_RPC_URL`, and optionally `NEXT_PUBLIC_BLOCK_EXPLORER_URL`. The API's CORS allowlist is controlled by `CLIENT_URL`. The contract must be deployed to Sepolia first; use `blockchain/.env` and run `npx hardhat run scripts/deploy.js --network sepolia`. Store `PRIVATE_KEY` only on your local deployment machine and never in Render or Vercel.

## Core Features
1. **Role-Based Dashboards:** Distinct interfaces for Students, Institutions, and Employers.
2. **On-Chain Issuance:** Institutions can issue certificates that are hashed and recorded on the blockchain.
3. **Public Verified Resumes:** Students get a public URL with a QR code showing only blockchain-verified credentials.
4. **Instant Verification:** Employers can verify any certificate hash against the blockchain record.
5. **External Credential References:** Institutions can record an external verification URL and credential ID. The app stores a hash of that submitted metadata; it does not automatically query or validate the external provider.

## Security Features
- **SHA-256 Hashing:** Every certificate file is hashed before being recorded.
- **Role-Based Access Control (RBAC):** Only authorized institutions can issue credentials.
- **JWT Authentication:** Secure API access for dashboard actions.
- **Blockchain Hash Verification:** A matching on-chain hash shows that the file matches a hash an authorized issuer recorded. Issuer mistakes or false claims still require confirmation with the issuer.
