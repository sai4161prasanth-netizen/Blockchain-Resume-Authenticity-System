export type CredentialStatus = "pending" | "verified" | "revoked";

export type CertificateRecord = {
  _id: string;
  title: string;
  institution: string;
  issueDate: string;
  certHash: string;
  blockchainTx?: string;
  status?: CredentialStatus;
  fileUrl?: string;
  isExternal?: boolean;
  student?: { name: string };
  issuedBy?: { name: string; walletAddress?: string };
};

export type AiScreeningStatus = "not_run" | "no_obvious_issue" | "review_required" | "unavailable";

export type AiScreening = {
  status: AiScreeningStatus;
  summary: string;
  observations: string[];
  limitations: string[];
};

export type PublicCertificateRecord = CertificateRecord & {
  student?: { name: string };
  issuedBy?: { name: string; walletAddress?: string };
};

export type BlockchainCertificateDetails = {
  studentName: string;
  institution: string;
  issueDate: number;
  issuedBy: string;
};

export type VerificationView = PublicCertificateRecord & {
  onChainVerified: boolean;
  chainMismatch?: boolean;
  blockchainDetails?: BlockchainCertificateDetails;
  bcError?: string;
};

export type CertificateVerifyResponse = {
  valid: boolean;
  certificate?: PublicCertificateRecord;
};
