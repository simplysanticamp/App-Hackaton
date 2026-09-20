// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FundingRegistry
/// @notice Bitácora onchain de a qué convocatorias aplicó un Project Passport y qué financiación reportó
///         haber recibido.
/// @dev ESTE CONTRATO NO CUSTODIA NI MUEVE FONDOS. No tiene `receive`, ni `fallback`, ni transferencias de
///      ERC-20, ni función de retiro: solo escribe datos. Es un registro AUTO-REPORTADO por el founder (o
///      por un `RECORDER_ROLE`): certifica qué se declaró y cuándo, no que la aplicación exista ni que el
///      dinero haya llegado. Un financiador debe contrastarlo con su propia fuente.
contract FundingRegistry is AccessControl, ReentrancyGuard {
    /// @notice El llamante no es el dueño del passport ni tiene `RECORDER_ROLE`.
    error NotAuthorized();
    /// @notice El nombre de la convocatoria está vacío.
    error EmptyOpportunityName();
    /// @notice El nombre de la convocatoria excede `MAX_NAME_BYTES`.
    error OpportunityNameTooLong();
    /// @notice El monto reportado es cero.
    error ZeroAmount();
    /// @notice Se pasó `address(0)` donde se requiere una dirección válida.
    error ZeroAddress();
    /// @notice No existe un registro con ese índice para ese `tokenId`.
    error RecordNotFound();

    /// @notice Estado de una aplicación a una convocatoria.
    /// @dev `Pending` (0) es el valor por defecto: registrada pero aún no enviada. Al ser un `enum` en la
    ///      firma pública, el ABI rechaza valores fuera de rango antes de entrar a la función.
    enum Status {
        Pending,
        Submitted,
        UnderReview,
        Accepted,
        Rejected
    }

    /// @notice Rol autorizado a registrar en nombre de un founder (en producción, un multisig).
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    /// @notice Tope de bytes del nombre de la convocatoria, para acotar el costo de gas.
    uint256 public constant MAX_NAME_BYTES = 120;

    /// @param opportunityName Nombre de la convocatoria tal como lo declaró el founder.
    /// @param status Estado declarado de la aplicación.
    /// @param recordedAt Timestamp del bloque en que se registró.
    struct Application {
        string opportunityName;
        Status status;
        uint64 recordedAt;
    }

    /// @param amount Monto reportado, en la unidad mínima del token (wei / 6 decimales de USDC / etc).
    /// @param token Dirección del ERC-20 reportado; `address(0)` significa la moneda nativa de la red.
    /// @param recordedAt Timestamp del bloque en que se registró.
    struct FundingReceived {
        uint256 amount;
        address token;
        uint64 recordedAt;
    }

    /// @notice Contrato ProjectPassport contra el que se valida la existencia y titularidad del tokenId.
    IERC721 public immutable passport;

    mapping(uint256 tokenId => Application[]) private _applications;
    mapping(uint256 tokenId => FundingReceived[]) private _funding;

    /// @notice Emitido al registrar una aplicación a una convocatoria.
    event FundingApplicationRecorded(
        uint256 indexed tokenId,
        uint256 indexed applicationId,
        address indexed author,
        string opportunityName,
        Status status
    );
    /// @notice Emitido al reportar financiación recibida. No implica movimiento de fondos en este contrato.
    event FundingReceivedRecorded(
        uint256 indexed tokenId, uint256 indexed recordId, address indexed author, uint256 amount, address token
    );

    /// @notice Despliega el registro apuntando a un ProjectPassport ya desplegado.
    /// @param passport_ Dirección del ProjectPassport.
    /// @param admin_ Dirección que recibe `DEFAULT_ADMIN_ROLE` (puede otorgar `RECORDER_ROLE`).
    constructor(address passport_, address admin_) {
        if (passport_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        passport = IERC721(passport_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    /// @notice Registra que un proyecto aplicó a una convocatoria. Solo el dueño del passport o `RECORDER_ROLE`.
    /// @dev `passport.ownerOf` revierte si el tokenId no existe, así que valida existencia y titularidad
    ///      en una sola llamada. Los registros son inmutables: un cambio de estado se registra como una
    ///      entrada nueva, de modo que el historial completo queda auditable.
    /// @param tokenId Id del Project Passport.
    /// @param opportunityName Nombre de la convocatoria (1..`MAX_NAME_BYTES` bytes).
    /// @param status Estado declarado de la aplicación.
    /// @return applicationId Índice del registro dentro del historial de ese tokenId (empieza en 0).
    function recordFundingApplication(uint256 tokenId, string calldata opportunityName, Status status)
        external
        returns (uint256 applicationId)
    {
        _requireAuthorized(tokenId);

        uint256 len = bytes(opportunityName).length;
        if (len == 0) revert EmptyOpportunityName();
        if (len > MAX_NAME_BYTES) revert OpportunityNameTooLong();

        applicationId = _applications[tokenId].length;
        _applications[tokenId].push(
            // forge-lint: disable-next-line(unsafe-typecast)
            Application({opportunityName: opportunityName, status: status, recordedAt: uint64(block.timestamp)})
        );
        emit FundingApplicationRecorded(tokenId, applicationId, msg.sender, opportunityName, status);
    }

    /// @notice Reporta financiación recibida por un proyecto. Solo el dueño del passport o `RECORDER_ROLE`.
    /// @dev NO MUEVE DINERO. Esta función únicamente escribe un dato: no transfiere ERC-20, no recibe
    ///      valor nativo (no es `payable`) y el contrato no puede retener ni retirar fondos. Lleva
    ///      `nonReentrant` de forma defensiva porque es el punto donde entraría una integración futura de
    ///      custodia o escrow; hoy no hay ninguna llamada externa después de escribir el estado.
    /// @param tokenId Id del Project Passport.
    /// @param amount Monto recibido en la unidad mínima del token; debe ser mayor que cero.
    /// @param token Dirección del ERC-20 recibido, o `address(0)` para la moneda nativa de la red.
    /// @return recordId Índice del registro dentro del historial de ese tokenId (empieza en 0).
    function recordFundingReceived(uint256 tokenId, uint256 amount, address token)
        external
        nonReentrant
        returns (uint256 recordId)
    {
        _requireAuthorized(tokenId);
        if (amount == 0) revert ZeroAmount();

        recordId = _funding[tokenId].length;
        // forge-lint: disable-next-line(unsafe-typecast)
        _funding[tokenId].push(FundingReceived({amount: amount, token: token, recordedAt: uint64(block.timestamp)}));
        emit FundingReceivedRecorded(tokenId, recordId, msg.sender, amount, token);
    }

    /// @notice Cantidad de aplicaciones registradas para un passport.
    /// @param tokenId Id del Project Passport.
    /// @return Número de aplicaciones (0 si el tokenId no existe o no tiene registros).
    function applicationCount(uint256 tokenId) external view returns (uint256) {
        return _applications[tokenId].length;
    }

    /// @notice Lee una aplicación puntual.
    /// @param tokenId Id del Project Passport.
    /// @param applicationId Índice del registro.
    /// @return La aplicación completa.
    function getApplication(uint256 tokenId, uint256 applicationId) external view returns (Application memory) {
        if (applicationId >= _applications[tokenId].length) revert RecordNotFound();
        return _applications[tokenId][applicationId];
    }

    /// @notice Historial completo de aplicaciones de un passport.
    /// @dev Solo para lectura offchain (`eth_call`): el array no tiene tope. Para paginar, usar
    ///      `applicationCount` + `getApplication`.
    /// @param tokenId Id del Project Passport.
    /// @return Array de aplicaciones en orden de registro.
    function getApplications(uint256 tokenId) external view returns (Application[] memory) {
        return _applications[tokenId];
    }

    /// @notice Cantidad de reportes de financiación recibida para un passport.
    /// @param tokenId Id del Project Passport.
    /// @return Número de reportes.
    function fundingReceivedCount(uint256 tokenId) external view returns (uint256) {
        return _funding[tokenId].length;
    }

    /// @notice Lee un reporte puntual de financiación recibida.
    /// @param tokenId Id del Project Passport.
    /// @param recordId Índice del registro.
    /// @return El reporte completo.
    function getFundingReceived(uint256 tokenId, uint256 recordId) external view returns (FundingReceived memory) {
        if (recordId >= _funding[tokenId].length) revert RecordNotFound();
        return _funding[tokenId][recordId];
    }

    /// @notice Historial completo de financiación reportada por un passport.
    /// @dev Solo para lectura offchain (`eth_call`): el array no tiene tope.
    /// @param tokenId Id del Project Passport.
    /// @return Array de reportes en orden de registro.
    function getAllFundingReceived(uint256 tokenId) external view returns (FundingReceived[] memory) {
        return _funding[tokenId];
    }

    /// @dev Revierte si el tokenId no existe (`ownerOf` revierte) o si el llamante no es el dueño del
    ///      passport ni tiene `RECORDER_ROLE`.
    function _requireAuthorized(uint256 tokenId) private view {
        address holder = passport.ownerOf(tokenId);
        if (msg.sender != holder && !hasRole(RECORDER_ROLE, msg.sender)) revert NotAuthorized();
    }
}
