import { Text } from "@radix-ui/themes";
import { useNetworkState } from "@uidotdev/usehooks";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ethers } from "ethers";
import {useWalletContext} from "~/context";
import {ERC20_ABI} from "~/constants";

const TokenBalanceComponent = ({ tokenAddress }: { tokenAddress: string }) => {
    const { currentAccount, currentNetwork, ethersProvider } = useWalletContext()
    const [tokenBalance, setTokenBalance] = useState(0)
    const network = useNetworkState();

    const fetchTokenBalance = useCallback(async () => {
        try {
            // Fetch token balance using ethers
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, ethersProvider)
            const balance = await tokenContract.balanceOf(currentAccount?.address)
            setTokenBalance(Number(ethers.formatEther(balance)))

            // const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress, { from: account })
            // const balance = await contract.methods.balanceOf(account).call()
            // setTokenBalance(web3.utils.fromWei(balance, "ether"))
        } catch (error) {
            toast.error("Error fetching token balance");
            console.error("Error fetching token balance", error)
        }
    }, [ethersProvider, tokenAddress]);

    useEffect(() => {
        if (network.online && currentNetwork?.chainId) {
            fetchTokenBalance()
        }
    }, [network, currentNetwork?.chainId])

    return <Text>{tokenBalance.toString()}</Text>
}

export const TokenBalance = React.memo(TokenBalanceComponent);
