import { Avatar, Button, Card, Flex, Spinner, Text } from "@radix-ui/themes";
import { useNavigate } from "react-router";

import type { I_Token } from "~/types"

import CustomSuspense from "./CustomSuspense"
import {TokenBalance} from "~components/TokenBalance";
import {AccountBalance} from "~components/AccountBalance";


export const TokenItem = ({ eachToken, isContract = false }: { eachToken: I_Token; isContract?: boolean }) => {
    const navigate = useNavigate();

    return (
        <Card variant="surface" size="1" onClick={() => isContract ? navigate(`/send`, { tokenAddress: eachToken.tokenAddress!, isContract: "true" }) : navigate(`/send`)}>
            {/*<Button size={"4"} onClick={navigateWithState}>*/}
            {/* <Link href={isContract ? `/tokens/${eachToken.tokenAddress}` : `/send`}> */}
            <Flex gap="3" align="center" width={"100%"}>
                <Avatar size="3" radius="full" fallback={eachToken.tokenName ? eachToken.tokenName[0] : ""} color="gray" />
                <Flex justify={"between"} align={"center"} width={"100%"}>
                    <Text as="div" size="6" color="gray" weight={"bold"}>
                        {isContract ? (
                            <CustomSuspense delay={0} fallback={<Spinner />}>
                                <TokenBalance tokenAddress={eachToken.tokenAddress!} />
                            </CustomSuspense>
                        ) : (
                            <CustomSuspense delay={1000} fallback={<Spinner />}>
                                <AccountBalance address={eachToken.accountAddress!} />
                            </CustomSuspense>
                        )}
                    </Text>
                    <Text as="div" size="2" weight="bold">
                        {eachToken.tokenSymbol}
                    </Text>
                </Flex>
            </Flex>
            {/* </Link> */}
        </Card>
    )
}
