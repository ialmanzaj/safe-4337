import { PasskeyArgType } from "@safe-global/protocol-kit";
import { Safe4337Pack } from "@safe-global/relay-kit";
import { encodeFunctionData, parseAbiItem, Hex } from "viem";
import {
  BUNDLER_URL,
  NFT_ADDRESS,
  PAYMASTER_ADDRESS,
  PAYMASTER_URL,
  RPC_URL,
} from "./constants";

const paymasterOptions = {
  isSponsored: true,
  paymasterAddress: PAYMASTER_ADDRESS,
  paymasterUrl: PAYMASTER_URL,
};

const transferUserOps = (
  from: string,
  recipient: string,
  amount: number,
  usdcAddress: string
) => {
  const transaction = {
    from: from as Hex,
    to: usdcAddress as Hex,
    value: "0x00",
    data: encodeFunctionData({
      abi: [
        parseAbiItem(
          "function transfer(address recipient, uint256 amount) returns (bool)"
        ),
      ],
      functionName: "transfer",
      args: [recipient as Hex, BigInt(amount * 1e6)],
    }),
  };
  return transaction;
};

/**
 * Mint an NFT.
 * @param {PasskeyArgType} signer - Signer object with rawId and coordinates.
 * @param {string} safeAddress - Safe address.
 * @returns {Promise<void>}
 * @throws {Error} If the operation fails.
 */
export const mintNFT = async ({
  signer,
  safeAddress,
}: {
  signer: PasskeyArgType;
  safeAddress: string;
}) => {
  const safe4337Pack = await Safe4337Pack.init({
    provider: RPC_URL,
    signer,
    bundlerUrl: BUNDLER_URL,
    paymasterOptions,
    options: {
      owners: [
        /* Other owners... */
      ],
      threshold: 1,
    },
  });

  const mintNFTTransaction = {
    to: NFT_ADDRESS,
    data: encodeSafeMintData(safeAddress),
    value: "0",
  };

  const safeOperation = await safe4337Pack.createTransaction({
    transactions: [mintNFTTransaction],
  });

  const signedSafeOperation = await safe4337Pack.signSafeOperation(
    safeOperation
  );

  console.log("SafeOperation", signedSafeOperation);

  // 4) Execute SafeOperation
  const userOperationHash = await safe4337Pack.executeTransaction({
    executable: signedSafeOperation,
  });

  return userOperationHash;
};

/**
 * Send USDC to an address.
 * @param {PasskeyArgType} signer - Signer object with rawId and coordinates.
 * @param {string} safeAddress - Safe address.
 * @param {string} to - Address to send USDC to.
 * @param {string} amount - Amount of USDC to send.
 * @returns {Promise<void>}
 * @throws {Error} If the operation fails.
 */
export const send = async ({
  signer,
  safeAddress,
  to,
  amount,
}: {
  signer: PasskeyArgType;
  safeAddress: string;
  to: string;
  amount: number;
}) => {
  const safe4337Pack = await Safe4337Pack.init({
    provider: RPC_URL,
    signer,
    bundlerUrl: BUNDLER_URL,
    paymasterOptions,
    options: {
      owners: [
        /* Other owners... */
      ],
      threshold: 1,
    },
  });
  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const sendTransaction = transferUserOps(
    safeAddress,
    to,
    amount,
    USDC_ADDRESS
  );

  const safeOperation = await safe4337Pack.createTransaction({
    transactions: [sendTransaction],
  });

  const signedSafeOperation = await safe4337Pack.signSafeOperation(
    safeOperation
  );

  console.log("SafeOperation", signedSafeOperation);

  // 4) Execute SafeOperation
  const userOperationHash = await safe4337Pack.executeTransaction({
    executable: signedSafeOperation,
  });

  return userOperationHash;
};

/**
 * Encodes the data for a safe mint operation.
 * @param to The address to mint the token to.
 * @param tokenId The ID of the token to mint.
 * @returns The encoded data for the safe mint operation.
 */
export function encodeSafeMintData(
  to: string,
  tokenId: bigint = getRandomUint256()
): string {
  return encodeFunctionData({
    abi: [
      {
        constant: false,
        inputs: [
          {
            name: "to",
            type: "address",
          },
          {
            name: "tokenId",
            type: "uint256",
          },
        ],
        name: "safeMint",
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "safeMint",
    args: [to, tokenId],
  });
}

/**
 * Generates a random 256-bit unsigned integer.
 *
 * @returns {bigint} A random 256-bit unsigned integer.
 *
 * This function uses the Web Crypto API's `crypto.getRandomValues()` method to generate
 * a uniformly distributed random value within the range of 256-bit unsigned integers
 * (from 0 to 2^256 - 1).
 */
function getRandomUint256(): bigint {
  const dest = new Uint8Array(32); // Create a typed array capable of storing 32 bytes or 256 bits

  crypto.getRandomValues(dest); // Fill the typed array with cryptographically secure random values

  let result = BigInt(0);
  for (let i = 0; i < dest.length; i++) {
    result |= BigInt(dest[i]) << BigInt(8 * i); // Combine individual bytes into one bigint
  }

  return result;
}
