"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

interface BlockchainContextType {
  account: string | null;
  isReady: boolean;
  connectWallet: () => Promise<void>;
  issueCertificateOnChain: (studentName: string, certHash: string, institution: string) => Promise<string>;
  verifyCertificateOnChain: (certHash: string) => Promise<any>;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Updated after re-deployment
const ABI = [
  "function issueCertificate(string _studentName, string _certificateHash, string _institution) public returns (bytes32)",
  "function verifyCertificate(string _certificateHash) public view returns (bool, string, string, uint256, address)",
  "function authorizedInstitutions(address) public view returns (bool)"
];

export const BlockchainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkConnection();
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
        setIsReady(true);
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (error: any) {
        console.error("User denied wallet access", error);
        throw new Error(error.message || "Failed to connect wallet");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const getContract = async (withSigner = true) => {
    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(window.ethereum);
      if (withSigner) {
        const signer = await provider.getSigner();
        return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      }
      return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
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
    } catch (error: any) {
      console.error("Blockchain transaction failed:", error);
      throw new Error(error.reason || error.message || "Blockchain transaction failed");
    }
  };

  const verifyCertificateOnChain = async (certHash: string) => {
    const contract = await getContract(false); // Use provider for verification
    if (!contract) throw new Error("Could not connect to blockchain");
    
    return await contract.verifyCertificate(certHash);
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
