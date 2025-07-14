import { Text } from "@radix-ui/themes";
import { useNetworkState } from "@uidotdev/usehooks"
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ethers } from "ethers";
import {useWalletContext} from "~/context";

interface AccountBalanceProps {
    address: string;
}

// Memoized AccountBalance component
const AccountBalanceComponent = ({ address }: AccountBalanceProps) => {
    const { currentBlockchain, ethersProvider, networkType, walletUnlocked } = useWalletContext();
    const [accountBalance, setAccountBalance] = useState(0);
    const network = useNetworkState();

    // Memoize the getBalance function to avoid unnecessary re-creation
    const getBalance = useCallback(async () => {
        if (address) {
            try {
                const balance = await ethersProvider.getBalance(address!)
                const balanceInEther = parseFloat(ethers.formatEther(balance))
                setAccountBalance(Number(balanceInEther.toFixed(4)))

                // const ethBalance = await web3.eth.getBalance(address);
                // const balanceInEther = parseFloat(web3.utils.fromWei(ethBalance, "ether"));
                // setAccountBalance(Number(balanceInEther.toFixed(4)));

                // Update account balance to DB.
                // await new WalletManager(web3).updateAccountBalance(address, balanceInEther);
            } catch (error) {
                console.error(error);
                toast.error("Error fetching balance");
            }
        }
    }, [address, ethersProvider]);

    useEffect(() => {
        if (network.online && walletUnlocked && currentBlockchain && networkType) {
            getBalance();
        }
    }, [network, getBalance, walletUnlocked, currentBlockchain, networkType]);

    return <Text>{accountBalance.toString()}</Text>;
};

// AccountBalance.displayName = "AccountBalance";
export const AccountBalance = React.memo(AccountBalanceComponent);
