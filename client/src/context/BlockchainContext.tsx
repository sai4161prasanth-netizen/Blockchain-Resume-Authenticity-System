"use client";
import type React from "react";
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { getWalletErrorMessage } from "@/lib/errors";

type OnChainCertificate = readonly [boolean, string, string, bigint, string];

interface BlockchainContextType {
  account: string | null;
  isReady: boolean;
  connectWallet: () => Promise<void>;
  issueCertificateOnChain: (studentName: string, certHash: string, institution: string) => Promise<string>;
  verifyCertificateOnChain: (certHash: string) => Promise<OnChainCertificate>;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
const ABI = [
  "function issueCertificate(string _studentName, string _certificateHash, string _institution) public returns (bytes32)",
  "function verifyCertificate(string _certificateHash) public view returns (bool, string, string, uint256, address)",
  "function authorizedInstitutions(address) public view returns (bool)"
];

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const response = await window.ethereum.request({ method: "eth_accounts" });
        const accounts = Array.isArray(response) ? response.filter((item): item is string => typeof item === "string") : [];
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
        setIsReady(true);
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const provider = window.ethereum;
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const wallets = Array.isArray(accounts) ? accounts.filter((item): item is string => typeof item === "string") : [];
      setAccount(wallets[0] || null);
    };
    const handleChainChanged = () => window.location.reload();
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [checkConnection]);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const response = await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = Array.isArray(response) ? response.filter((item): item is string => typeof item === "string") : [];
        if (accounts.length === 0) throw new Error("Wallet returned no account.");
        setAccount(accounts[0]);
      } catch (error: unknown) {
        console.error("User denied wallet access", error);
        throw new Error(getWalletErrorMessage(error, "Failed to connect wallet"));
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const getContract = async (withSigner = true) => {
    if (!CONTRACT_ADDRESS) throw new Error("Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
    if (withSigner && typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    }
    if (!withSigner && RPC_URL) {
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, new ethers.JsonRpcProvider(RPC_URL));
    }
    if (!withSigner && typeof window.ethereum !== "undefined") {
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, new ethers.BrowserProvider(window.ethereum));
    }
    return null;
  };

  const issueCertificateOnChain = async (studentName: string, certHash: string, institution: string) => {
    const contract = await getContract(true);
    if (!contract) throw new Error("Contract not found. Please connect your wallet.");
    
    try {
      const tx = await contract.issueCertificate(studentName, certHash, institution);
      await tx.wait();
      return tx.hash;
    } catch (error: unknown) {
      console.error("Blockchain transaction failed:", error);
      throw new Error(getWalletErrorMessage(error, "Blockchain transaction failed"));
    }
  };

  const verifyCertificateOnChain = async (certHash: string) => {
    const contract = await getContract(false); // Use provider for verification
    if (!contract) throw new Error("Could not connect to blockchain");
    
    return await contract.verifyCertificate(certHash) as OnChainCertificate;
  };

  return (
    <BlockchainContext.Provider value={{ account, isReady, connectWallet, issueCertificateOnChain, verifyCertificateOnChain }}>
      {children}
    </BlockchainContext.Provider>
  );
};

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error("useBlockchain must be used within a BlockchainProvider");
  }
  return context;
};
