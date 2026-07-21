// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateStore {
    address public owner;

    struct Certificate {
        string studentName;
        string certificateHash; // SHA-256 hash of the certificate
        string institution;
        uint256 issueDate;
        bool isValid;
        address issuedBy;
    }

    // Mapping from certificate ID (or unique hash) to Certificate data
    mapping(bytes32 => Certificate) public certificates;
    
    // Mapping of authorized institutions
    mapping(address => bool) public authorizedInstitutions;

    event CertificateIssued(bytes32 indexed certId, string studentName, string certificateHash, address issuedBy);
    event CertificateRevoked(bytes32 indexed certId);
    event InstitutionAuthorized(address indexed institution);
    event InstitutionRevoked(address indexed institution);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedInstitutions[msg.sender] || msg.sender == owner, "Not authorized to issue certificates");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedInstitutions[msg.sender] = true;
    }

    function authorizeInstitution(address _institution) public onlyOwner {
        authorizedInstitutions[_institution] = true;
        emit InstitutionAuthorized(_institution);
    }

    function revokeInstitution(address _institution) public onlyOwner {
        authorizedInstitutions[_institution] = false;
        emit InstitutionRevoked(_institution);
    }

    function issueCertificate(
        string memory _studentName,
        string memory _certificateHash,
        string memory _institution
    ) public onlyAuthorized returns (bytes32) {
        bytes32 certId = keccak256(abi.encodePacked(_certificateHash));
        // Allow updating or re-issuing if needed, but for now we just store
        certificates[certId] = Certificate({
            studentName: _studentName,
            certificateHash: _certificateHash,
            institution: _institution,
            issueDate: block.timestamp,
            isValid: true,
            issuedBy: msg.sender
        });

        emit CertificateIssued(certId, _studentName, _certificateHash, msg.sender);
        return certId;
    }

    function verifyCertificate(string memory _certificateHash) public view returns (bool, string memory, string memory, uint256, address) {
        bytes32 certId = keccak256(abi.encodePacked(_certificateHash));
        Certificate memory cert = certificates[certId];
        
        if (cert.isValid) {
            return (true, cert.studentName, cert.institution, cert.issueDate, cert.issuedBy);
        } else {
            return (false, "", "", 0, address(0));
        }
    }

    function revokeCertificate(string memory _certificateHash) public onlyAuthorized {
        bytes32 certId = keccak256(abi.encodePacked(_certificateHash));
        require(certificates[certId].isValid, "Certificate does not exist");
        certificates[certId].isValid = false;
        emit CertificateRevoked(certId);
    }
}
