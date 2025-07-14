import React from "react"
import { Box, Button, Flex, Grid, Text } from "@radix-ui/themes";
import { LucideArrowLeft, LucideArrowRightLeft } from "lucide-react";

interface NumericKeypadProps {
    maxValue: string
    inputValue: string
    setInputValue: React.Dispatch<React.SetStateAction<string>>
    onSubmit?: (value: string) => void
    allowDecimal?: boolean
    maxLength?: number
    tokenSymbol: string
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({ maxValue, inputValue, setInputValue, onSubmit, allowDecimal = true, maxLength = 10, tokenSymbol }) => {
    const handleKeyPress = (key: string) => {
        if (key === "clear") {
            setInputValue("")
        } else if (key === "max") {
            setInputValue(maxValue) // Set the max value
        } else if (key === "backspace") {
            setInputValue((prev) => prev.slice(0, -1)); // Remove the last character
        } else if (key === "submit") {
            onSubmit?.(inputValue)
        } else {
            if (inputValue.length < maxLength) {
                if (key === "." && allowDecimal && !inputValue.includes(".")) {
                    setInputValue((prev) => prev + key)
                } else if (!isNaN(Number(key))) {
                    setInputValue((prev) => prev + key)
                }
            }
        }
    }

    const keypadButtons = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        allowDecimal ? "." : "",
        "0",
        inputValue === "" ? "max" : "backspace", // Switch between clear and backspace
    ].filter(Boolean) // Filter out empty buttons if `.` is disabled.

    // Let's Calculate font size based on input length
    const fontSize = Math.max(12, 50 - inputValue.length * 2);

    return (
        <Flex
            direction={"column"}
            align={"center"}
            gap={"3"}
        // style={{
        //   display: "flex",
        //   flexDirection: "column",
        //   alignItems: "center",
        //   gap: "10px",
        // }}
        >
            {/* Display */}

            <Flex
                px={"3"}
                py={"3"}
                gap={"3"}
                align={"center"}
                className={"plasmo-relative plasmo-w-full"}
                style={
                    {
                        // width: "200px",
                        // padding: "10px",
                        // border: "1px solid #ccc",
                        // borderRadius: "4px",
                        // fontSize: "18px",
                        // textAlign: "right",
                    }
                }
            >
                <Box className={"plasmo-absolute -plasmo-bottom-2 plasmo-left-3"}>
                    <Text size={"6"} weight={"bold"}>
                        {/* Display the Dollar equivalent here in amber color */}
                        <Text weight={"bold"} size={"4"} align={"center"} color={"gray"} style={{ opacity: "0.8" }}>
                            (≈{" "}
                            <Text size={"4"} color={"gray"}>
                                $
                            </Text>
                            {0})
                        </Text>
                    </Text>
                </Box>

                <Flex
                    justify={"center"}
                    align={"center"}
                    minWidth={"48px"}
                    className={"plasmo-relative plasmo-size-12 plasmo-rounded-large plasmo-bg-[var(--gray-2)]"}
                    style={{ borderRadius: "12px" }}
                >
                    <LucideArrowRightLeft size={20} />
                </Flex>

                <Text
                    size={"9"}
                    className={"plasmo-w-full plasmo-overflow-auto plasmo-whitespace-nowrap plasmo-text-center plasmo-font-bold"}
                    style={{
                        fontSize: `${fontSize}px`, // For Dynamic font sizing
                        paddingBlock: "0.5rem",
                    }}
                >
                    {inputValue || "0"}
                </Text>

                <Text size={"5"} className={"plasmo-font-bold plasmo-text-gray-400"}>
                    {tokenSymbol}
                </Text>
            </Flex>

            {/* Keypad */}
            <Grid
                columns={"3"}
                gap={"1"}
                rows={"repeat(1, 1fr)"}
                width={"100%"}
                p={"1"}
                style={
                    {
                        // display: "grid",
                        // gridTemplateColumns: "repeat(3, 1fr)",
                        // gap: "10px",
                        // background: "orange",
                    }
                }
            >
                {keypadButtons.map((key) => (
                    <Button
                        key={key}
                        variant={"ghost"}
                        size={"4"}
                        onClick={() => handleKeyPress(key)}
                        style={{
                            cursor: "pointer",
                            userSelect: "none",
                            height: "48px",
                            // fontSize: "22px",
                            fontWeight: "bold",
                        }}
                    >
                        {key === "clear" ? "C" : key === "max" ? "Max" : key === "backspace" ? <LucideArrowLeft size={20} strokeWidth={3} /> : key}
                    </Button>
                ))}
            </Grid>

            {/* Submit Button */}
            {/*<button
        onClick={() => handleKeyPress("submit")}
        style={{
          marginTop: "10px",
          padding: "10px 20px",
          fontSize: "18px",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Submit
      </button>*/}
        </Flex>
    )
}

export default NumericKeypad
