import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChainMetricsFeed Contract", function () {
    async function deployChainMetricsFeedFixture() {
        const drBinaryId = ethers.ZeroHash;

        const SedaProver = await ethers.getContractFactory("SedaProverMock");
        const sedaProver = await SedaProver.deploy();

        const ChainMetricsFeed = await ethers.getContractFactory("ChainMetricsFeed");
        const chainMetricsFeed = await ChainMetricsFeed.deploy(
            await sedaProver.getAddress(),
            drBinaryId
        );

        return { chainMetricsFeed, sedaProver };
    }

    it("Should transmit data request for specific chain", async function () {
        const { chainMetricsFeed } = await loadFixture(deployChainMetricsFeedFixture);
        
        const chainId = 1; // Ethereum mainnet
        await chainMetricsFeed.transmit(chainId);
        
        const dataRequestId = await chainMetricsFeed.dataRequestId();
        expect(dataRequestId).to.not.equal(ethers.ZeroHash);
    });

    it("Should return latest metrics when consensus is reached", async function () {
        const { chainMetricsFeed, sedaProver } = await loadFixture(deployChainMetricsFeedFixture);
        
        // Transmit request
        await chainMetricsFeed.transmit(1);
        const dataRequestId = await chainMetricsFeed.dataRequestId();

        // Mock metrics data
        const mockMetrics = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint64", "uint64", "uint64", "uint64"],
            [50000000000, 12, 150, Math.floor(Date.now() / 1000)]
        );

        // Set mock result
        await sedaProver.setDataResult(dataRequestId, true, mockMetrics);

        // Fetch and verify metrics
        const metrics = await chainMetricsFeed.latestMetrics();
        expect(metrics.avgGasPrice).to.be.gt(0);
        expect(metrics.avgBlockTime).to.equal(12);
        expect(metrics.txVolume).to.equal(150);
    });

    it("Should return zero values when consensus is not reached", async function () {
        const { chainMetricsFeed, sedaProver } = await loadFixture(deployChainMetricsFeedFixture);
        
        await chainMetricsFeed.transmit(1);
        const dataRequestId = await chainMetricsFeed.dataRequestId();

        // Set mock result without consensus
        const mockMetrics = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint64", "uint64", "uint64", "uint64"],
            [50000000000, 12, 150, Math.floor(Date.now() / 1000)]
        );
        await sedaProver.setDataResult(dataRequestId, false, mockMetrics);

        // Verify zero values are returned
        const metrics = await chainMetricsFeed.latestMetrics();
        expect(metrics.avgGasPrice).to.equal(0);
        expect(metrics.avgBlockTime).to.equal(0);
        expect(metrics.txVolume).to.equal(0);
        expect(metrics.timestamp).to.equal(0);
    });
}); 