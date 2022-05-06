import web3 = require("@solana/web3.js");
import {
  createMint,
  createAccount,
  createAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  burn,
  closeAccount,
  approve,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";
import Dotenv from "dotenv";
Dotenv.config();

async function main() {
  const user = initializeKeypair();
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  await connection.requestAirdrop(user.publicKey, web3.LAMPORTS_PER_SOL * 1);

  // createMint returns "PublicKey" of Mint
  const mint = await createMint(
    connection, // connection to Solana cluster
    user, // payer
    user.publicKey, // mint authority
    null, // freeze authority
    2 // decimals
  );

  console.log(
    `Token Mint: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`
  );

  // generate a new Keypair for the Token Account
  const tokenKeyPair = web3.Keypair.generate();

  // createAssociatedTokenAccount returns "PublicKey" of Associated Token Account
  // Associated Token Account is PDA with user address and mint address as seeds
  const associatedTokenAccount = await createAssociatedTokenAccount(
    connection, //connection to Solana cluster
    user, // payer
    mint, // token mint
    user.publicKey // token account owner
  );

  console.log(
    `User Associated Token Account: https://explorer.solana.com/address/${associatedTokenAccount.toString()}?cluster=devnet`
  );

  // mintTo returns "TransactionSignature"
  const mintTokens = await mintTo(
    connection, // connection to Solana cluster
    user, // payer
    mint, // mint
    associatedTokenAccount, // mint tokens to this token account
    user, // mint authority
    10000 // amount tokens to mint
  );

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${mintTokens}?cluster=devnet`
  );

  // check tokens minted to Token Account
  const Account = await getAccount(connection, associatedTokenAccount);

  console.log("User Associated Token Account Balance:", Number(Account.amount));

  console.log(
    `User Associated Token Account: https://explorer.solana.com/address/${Account.address}?cluster=devnet`
  );

  // generate a new Keypair for the delegate
  const delegate = web3.Keypair.generate();
  await connection.requestAirdrop(
    delegate.publicKey,
    web3.LAMPORTS_PER_SOL * 1
  );

  // approve amount for delegate to transfer
  // returns "TransactionSignature"
  const delegateApprove = await approve(
    connection, // connection to Solana cluster
    user, // payer
    associatedTokenAccount, // token account
    delegate.publicKey, // delegate address
    user.publicKey, // owner of token account
    5000 // amount approved for delgate
  );

  console.log(
    `Delegate Approve Transaction: https://explorer.solana.com/tx/${delegateApprove}?cluster=devnet`
  );

  // put a test wallet address from Phantom wallet here
  const phantomAddress = new web3.PublicKey(
    "4B65V1ySBG35UbStDTUDvBTXRfxh6v5tRbLnVrVLpYD2"
  );

  // create new Associated Token Account for receiver
  const phantomAssociatedTokenAccount = await createAssociatedTokenAccount(
    connection, //connection to Solana cluster
    user, // payer
    mint, // token mint
    phantomAddress // token account owner
  );

  // transfer Tokens
  // returns "TransactionSignature"
  const tokenTransfer = await transfer(
    connection, // connection to Solana cluster
    delegate, // payer
    associatedTokenAccount, // Token Account send Tokens
    phantomAssociatedTokenAccount, // Token Account receive Tokens
    delegate.publicKey, // use delegate as owner user's Token Account in tranfer
    2500 // amount of Tokens to send
  );
  console.log(
    `Transfer Transaction: https://explorer.solana.com/tx/${tokenTransfer}?cluster=devnet`
  );

  // check tokens tranferred from user
  const userAccountAfterTransfer = await getAccount(
    connection,
    associatedTokenAccount
  );

  console.log(
    "User Associated Token Account Balance:",
    Number(userAccountAfterTransfer.amount)
  );

  // check tokens tranferred to receiver
  const phantomAccount = await getAccount(
    connection,
    phantomAssociatedTokenAccount
  );

  console.log(
    "Phantom Associated Token Account Balance:",
    Number(phantomAccount.amount)
  );

  console.log(
    `Phantom Associated Token Account: https://explorer.solana.com/address/${phantomAccount.address}?cluster=devnet`
  );

  // generate a new Keypair for the new mint authority
  const newMintAuthority = web3.Keypair.generate();
  await connection.requestAirdrop(
    newMintAuthority.publicKey,
    web3.LAMPORTS_PER_SOL * 1
  );

  // set new mint authority
  // returns "TransactionSignature"
  const setMintAuthority = await setAuthority(
    connection, // connection to Solana cluster
    user, // payer
    mint, //mint
    user.publicKey, // current authority
    0, // authority type: MintTokens = 0, FreezeAccount = 1, AccountOwner = 2, CloseAccount = 3
    newMintAuthority.publicKey // new authority
  );

  console.log(
    `setAuthority Transaction: https://explorer.solana.com/tx/${setMintAuthority}?cluster=devnet`
  );

  // mint tokens with new mint authority
  // returns "TransactionSignature"
  const mintWithNewAuthority = await mintTo(
    connection, // connection to Solana cluster
    newMintAuthority, //
    mint, // mint
    phantomAssociatedTokenAccount, // mint tokens to this token account
    newMintAuthority, // mint authority
    10000 // amount tokens to mint
  );

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${mintWithNewAuthority}?cluster=devnet`
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
  })
  .catch((error) => {
    console.error(error);
  });

function initializeKeypair(): web3.Keypair {
  const secret = JSON.parse(process.env.PRIVATE_KEY ?? "") as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecretKey = web3.Keypair.fromSecretKey(secretKey);
  return keypairFromSecretKey;
}
