// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Milestones
/// @notice Registro de hitos de un Project Passport. Solo se guarda el hash de la evidencia (bytes32),
///         nunca el archivo: la evidencia real vive offchain y el hash permite probar que no cambió.
/// @dev Control de acceso con AccessControl (no Ownable) para que en producción `VALIDATOR_ROLE` pueda
///      otorgarse a un multisig o a varios verificadores sin migrar el contrato. En la demo es una sola
///      dirección, y eso es un riesgo reconocido explícitamente en el pitch.
contract Milestones is AccessControl {
    /// @notice El llamante no es el dueño del passport ni tiene `VALIDATOR_ROLE`.
    error NotAuthorized();
    /// @notice La descripción del hito está vacía.
    error EmptyDescription();
    /// @notice La descripción excede `MAX_DESCRIPTION_BYTES`.
    error DescriptionTooLong();
    /// @notice El hash de evidencia es `bytes32(0)`.
    error EmptyEvidenceHash();
    /// @notice No existe un hito con ese `milestoneId` para ese `tokenId`.
    error MilestoneNotFound();
    /// @notice El hito ya fue verificado; la verificación no se repite (para invalidarla, `revokeVerification`).
    error AlreadyVerified();
    /// @notice Un validator no puede verificar un hito que él mismo registró.
    error SelfVerification();
    /// @notice Solo se puede revocar la verificación de un hito que está verificado.
    error NotVerified();
    /// @notice La verificación de este hito ya fue revocada; la revocación es definitiva.
    error AlreadyRevoked();
    /// @notice La dirección pasada como Passport no tiene código (no es un contrato).
    error NotAContract();
    /// @notice Se pasó `address(0)` donde se requiere una dirección válida.
    error ZeroAddress();

    /// @notice Rol autorizado a verificar hitos y a registrarlos en nombre de un founder.
    /// @dev En producción debe apuntar a un multisig. `DEFAULT_ADMIN_ROLE` lo otorga y lo revoca.
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    /// @notice Tope de bytes de la descripción, para acotar el costo de gas de la escritura.
    uint256 public constant MAX_DESCRIPTION_BYTES = 280;

    /// @param description Texto corto del hito (no es evidencia, es contexto humano).
    /// @param evidenceHash keccak256 del archivo de evidencia, calculado offchain.
    /// @param createdAt Timestamp del bloque en que se registró.
    /// @param verifiedAt Timestamp de la verificación; `0` significa sin verificar.
    /// @param revokedAt Timestamp en que un validator revocó la verificación; `0` significa no revocada.
    ///        Un hito cuenta como verificado solo si `verifiedAt != 0 && revokedAt == 0`. La verificación
    ///        original NO se borra: queda como rastro auditable de que existió y luego se invalidó.
    /// @param author Quién registró el hito: el dueño del passport o un `VALIDATOR_ROLE`. Va en storage y
    ///        no solo en el evento, para que quien lea el historial sepa de quién es cada declaración sin
    ///        tener que reconstruir logs.
    struct Milestone {
        string description;
        bytes32 evidenceHash;
        uint64 createdAt;
        uint64 verifiedAt;
        uint64 revokedAt;
        address author;
    }

    /// @notice Contrato ProjectPassport contra el que se valida la existencia y titularidad del tokenId.
    IERC721 public immutable passport;

    mapping(uint256 tokenId => Milestone[]) private _milestones;

    /// @notice Emitido al registrar un hito nuevo.
    event MilestoneAdded(
        uint256 indexed tokenId,
        uint256 indexed milestoneId,
        address indexed author,
        bytes32 evidenceHash,
        string description
    );
    /// @notice Emitido cuando un validator marca un hito como verificado.
    event MilestoneVerified(uint256 indexed tokenId, uint256 indexed milestoneId, address indexed validator);
    /// @notice Emitido cuando un validator revoca la verificación de un hito.
    event VerificationRevoked(uint256 indexed tokenId, uint256 indexed milestoneId, address indexed validator);

    /// @notice Despliega el registro de hitos apuntando a un ProjectPassport ya desplegado.
    /// @param passport_ Dirección del ProjectPassport.
    /// @param validator_ Dirección que recibe `VALIDATOR_ROLE` al desplegar.
    /// @param admin_ Dirección que recibe `DEFAULT_ADMIN_ROLE` (puede rotar el validator).
    constructor(address passport_, address validator_, address admin_) {
        if (passport_ == address(0) || validator_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        // Atrapa un typo en PASSPORT_ADDRESS al desplegar: sin esto el contrato queda immutable apuntando
        // a una dirección muerta y toda escritura revierte para siempre.
        if (passport_.code.length == 0) revert NotAContract();
        passport = IERC721(passport_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(VALIDATOR_ROLE, validator_);
    }

    /// @notice Registra un hito para un passport. Solo el dueño del passport o un `VALIDATOR_ROLE`.
    /// @dev `passport.ownerOf` revierte si el tokenId no existe, así que valida existencia y titularidad
    ///      en una sola llamada. El archivo de evidencia NUNCA se sube: solo su hash.
    /// @param tokenId Id del Project Passport.
    /// @param description Texto del hito (1..`MAX_DESCRIPTION_BYTES` bytes).
    /// @param evidenceHash keccak256 de la evidencia offchain; no puede ser cero.
    /// @return milestoneId Índice del hito dentro del historial de ese tokenId (empieza en 0).
    function addMilestone(uint256 tokenId, string calldata description, bytes32 evidenceHash)
        external
        returns (uint256 milestoneId)
    {
        address holder = passport.ownerOf(tokenId); // revierte si el tokenId no existe
        if (msg.sender != holder && !hasRole(VALIDATOR_ROLE, msg.sender)) revert NotAuthorized();

        uint256 len = bytes(description).length;
        if (len == 0) revert EmptyDescription();
        if (len > MAX_DESCRIPTION_BYTES) revert DescriptionTooLong();
        if (evidenceHash == bytes32(0)) revert EmptyEvidenceHash();

        milestoneId = _milestones[tokenId].length;
        _milestones[tokenId].push(
            Milestone({
                description: description,
                evidenceHash: evidenceHash,
                // forge-lint: disable-next-line(unsafe-typecast)
                createdAt: uint64(block.timestamp),
                verifiedAt: 0,
                revokedAt: 0,
                author: msg.sender
            })
        );
        emit MilestoneAdded(tokenId, milestoneId, msg.sender, evidenceHash, description);
    }

    /// @notice Marca un hito como verificado. Exclusivo de `VALIDATOR_ROLE`.
    /// @dev Separación de funciones: un validator NO puede verificar un hito que él mismo registró. Sin
    ///      esto, una sola dirección con el rol podría registrar y atestiguar en el mismo bloque, y onchain
    ///      sería indistinguible de una verificación independiente — que es justo la propiedad que
    ///      certifica el producto. Si hace falta que un validator registre y otro verifique, se otorga el
    ///      rol a dos direcciones.
    /// @dev No re-valida la existencia del tokenId contra el Passport: un hito solo puede existir si el
    ///      passport existía al registrarlo, y el passport es soulbound y no se puede quemar. Si el tokenId
    ///      no existe, `_milestones[tokenId]` está vacío y revierte con `MilestoneNotFound`.
    /// @param tokenId Id del Project Passport.
    /// @param milestoneId Índice del hito dentro del historial de ese tokenId.
    function verifyMilestone(uint256 tokenId, uint256 milestoneId) external onlyRole(VALIDATOR_ROLE) {
        if (milestoneId >= _milestones[tokenId].length) revert MilestoneNotFound();
        Milestone storage m = _milestones[tokenId][milestoneId];
        if (m.verifiedAt != 0) revert AlreadyVerified();
        if (m.author == msg.sender) revert SelfVerification();

        // forge-lint: disable-next-line(unsafe-typecast)
        m.verifiedAt = uint64(block.timestamp);
        emit MilestoneVerified(tokenId, milestoneId, msg.sender);
    }

    /// @notice Revoca la verificación de un hito. Exclusivo de `VALIDATOR_ROLE`.
    /// @dev Sin revocación, una verificación errónea o fraudulenta sería permanente y el sistema no sería
    ///      auditable. La revocación es definitiva y no borra `verifiedAt`: el historial conserva que el hito
    ///      fue verificado y luego invalidado. Un hito corregido se registra como hito nuevo. Cualquier
    ///      validator puede revocar, incluido el que verificó (retractarse) o el autor del hito.
    /// @param tokenId Id del Project Passport.
    /// @param milestoneId Índice del hito dentro del historial de ese tokenId.
    function revokeVerification(uint256 tokenId, uint256 milestoneId) external onlyRole(VALIDATOR_ROLE) {
        if (milestoneId >= _milestones[tokenId].length) revert MilestoneNotFound();
        Milestone storage m = _milestones[tokenId][milestoneId];
        if (m.verifiedAt == 0) revert NotVerified();
        if (m.revokedAt != 0) revert AlreadyRevoked();

        // forge-lint: disable-next-line(unsafe-typecast)
        m.revokedAt = uint64(block.timestamp);
        emit VerificationRevoked(tokenId, milestoneId, msg.sender);
    }

    /// @notice Cantidad de hitos registrados para un passport.
    /// @dev OJO: los getters de este contrato NO prueban existencia. Un tokenId inexistente y uno existente
    ///      sin hitos devuelven lo mismo (0 / array vacío). Quien lea debe consultar `passport.ownerOf`
    ///      primero si necesita distinguirlos.
    /// @param tokenId Id del Project Passport.
    /// @return Número de hitos (0 si el tokenId no existe o no tiene hitos).
    function milestoneCount(uint256 tokenId) external view returns (uint256) {
        return _milestones[tokenId].length;
    }

    /// @notice Lee un hito puntual.
    /// @param tokenId Id del Project Passport.
    /// @param milestoneId Índice del hito.
    /// @return El hito completo.
    function getMilestone(uint256 tokenId, uint256 milestoneId) external view returns (Milestone memory) {
        if (milestoneId >= _milestones[tokenId].length) revert MilestoneNotFound();
        return _milestones[tokenId][milestoneId];
    }

    /// @notice Historial completo de hitos de un passport.
    /// @dev Solo para lectura offchain (`eth_call`): el array no tiene tope, así que no debe llamarse
    ///      desde otro contrato. Para paginar, usar `milestoneCount` + `getMilestone`.
    /// @param tokenId Id del Project Passport.
    /// @return Array de hitos en orden de registro.
    function getMilestones(uint256 tokenId) external view returns (Milestone[] memory) {
        return _milestones[tokenId];
    }
}
