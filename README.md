# Blockchain Resume Authenticity System

A decentralized platform that prevents resume fraud and enables secure verification of academic and professional credentials using blockchain technology.

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

### 1. Smart Contract (Blockchain)
```bash
cd blockchain
npm install
# Start local hardhat node
npx hardhat node
# Deploy contract (in a new terminal)
npx hardhat run scripts/deploy.js --network localhost
```
*Note: Copy the deployed contract address and update it in `client/src/context/BlockchainContext.tsx`.*

### 2. Backend (Server)
```bash
cd server
npm install
# Make sure MongoDB is running locally or provide a cloud URI in .env
npm start
```

### 3. Frontend (Client)
```bash
cd client
npm install
npm run dev
```

## Core Features
1. **Role-Based Dashboards:** Distinct interfaces for Students, Institutions, and Employers.
2. **On-Chain Issuance:** Institutions can issue certificates that are hashed and recorded on the blockchain.
3. **Public Verified Resumes:** Students get a public URL with a QR code showing only blockchain-verified credentials.
4. **Instant Verification:** Employers can verify any certificate hash against the blockchain record.
5. **External Credential Support:** Supports manual entry and verification for platforms like Salesforce or Coursera.

## Security Features
- **SHA-256 Hashing:** Every certificate file is hashed before being recorded.
- **Role-Based Access Control (RBAC):** Only authorized institutions can issue credentials.
- **JWT Authentication:** Secure API access for dashboard actions.
- **Decentralized Verification:** Verification happens against the blockchain, making it tamper-proof.
