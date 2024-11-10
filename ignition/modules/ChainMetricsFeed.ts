import { network } from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getOracleProgramId, getSedaConfig } from "../sedaUtils";

const ChainMetricsFeedModule = buildModule("ChainMetricsFeedModule", (m) => {
    let proverAddress;
    let oracleProgramId;

    if (network.name !== "hardhat") {
        const sedaConfig = getSedaConfig(network.name);
        proverAddress = m.getParameter("sedaProverContract", sedaConfig.proverAddress);
        oracleProgramId = m.getParameter("binaryId", getOracleProgramId());
    } else {
        const sedaProverMock = m.contract("SedaProverMock", []);
        proverAddress = sedaProverMock;
        oracleProgramId = ethers.ZeroHash;
    }

    const chainMetricsFeed = m.contract("ChainMetricsFeed", [
        proverAddress,
        oracleProgramId
    ]);

    return { chainMetricsFeed };
});

export default ChainMetricsFeedModule; 