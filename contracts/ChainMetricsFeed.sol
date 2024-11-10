// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import "@seda-protocol/contracts/src/SedaProver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ChainMetricsFeed
 * @notice This contract fetches and provides cross-chain metrics data using SEDA's oracle network.
 * It can track metrics like gas prices, block times, and transaction volumes across different chains.
 */
contract ChainMetricsFeed {
    using Strings for uint256;

    // Instance of the SedaProver contract
    SedaProver public sedaProverContract;
    
    // ID of the WASM binary that fetches chain metrics
    bytes32 public oracleProgramId;
    
    // Latest data request ID
    bytes32 public dataRequestId;
    
    // Struct to hold chain metrics
    struct ChainMetrics {
        uint64 avgGasPrice;     // in wei
        uint64 avgBlockTime;    // in seconds
        uint64 txVolume;        // transactions per block
        uint64 timestamp;       // last update timestamp
    }
    
    // Event emitted when new metrics are transmitted
    event MetricsUpdated(
        uint64 avgGasPrice,
        uint64 avgBlockTime,
        uint64 txVolume,
        uint64 timestamp
    );

    constructor(address _sedaProverContract, bytes32 _oracleProgramId) {
        sedaProverContract = SedaProver(_sedaProverContract);
        oracleProgramId = _oracleProgramId;
    }

    /**
     * @notice Transmits a new data request to fetch chain metrics
     * @param chainId The ID of the chain to fetch metrics for
     * @return The ID of the created data request
     */
    function transmit(uint256 chainId) public returns (bytes32) {
        SedaDataTypes.DataRequestInputs memory inputs = SedaDataTypes
            .DataRequestInputs(
                oracleProgramId,                // Oracle Program ID
                bytes(string.concat("chain-metrics-", chainId.toString())), // Chain-specific input
                oracleProgramId,                // Tally binary ID
                hex"00",                        // Tally inputs
                3,                              // Replication factor (3 nodes for better consensus)
                hex"00",                        // Consensus filter
                1,                              // Gas price
                5000000,                        // Gas limit
                abi.encodePacked(block.number)  // Memo
            );

        dataRequestId = sedaProverContract.postDataRequest(inputs);
        return dataRequestId;
    }

    /**
     * @notice Fetches the latest chain metrics
     * @return metrics The latest chain metrics data
     */
    function latestMetrics() public view returns (ChainMetrics memory metrics) {
        require(dataRequestId != bytes32(0), "No data request transmitted");

        SedaDataTypes.DataResult memory result = sedaProverContract
            .getDataResult(dataRequestId);

        if (result.consensus) {
            // Decode the result bytes into our ChainMetrics struct
            (
                uint64 avgGasPrice,
                uint64 avgBlockTime,
                uint64 txVolume,
                uint64 timestamp
            ) = abi.decode(result.result, (uint64, uint64, uint64, uint64));

            return ChainMetrics({
                avgGasPrice: avgGasPrice,
                avgBlockTime: avgBlockTime,
                txVolume: txVolume,
                timestamp: timestamp
            });
        }

        // Return zero values if no consensus
        return ChainMetrics(0, 0, 0, 0);
    }
} 