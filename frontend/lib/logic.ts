// polkadotBridge.js - Frontend module for cross-chain staking
// For Encode Hackathon

// Import necessary libraries
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ethers } from 'ethers';

// ========== POLKADOT CONNECTION & STAKING ==========

export async function connectToPolkadot(polkadotWsUrl: any) {
  try {
    // Create the API instance
    const wsProvider = new WsProvider(polkadotWsUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    
    // Wait for the API to be ready
    await api.isReady;
    console.log('Connected to Polkadot network');
    // Do something
    console.log(api.genesisHash.toHex());

    console.log("Now",await api.query.timestamp.now())
    
    return api;
  } catch (error) {
    console.error('Failed to connect to Polkadot:', error);
    throw error;
  }
}

export async function getPolkadotAccount(mnemonic: any) {
  try {
    // Initialize the Polkadot keyring
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    
    // Add account from mnemonic
    const account = keyring.addFromMnemonic(mnemonic);
    console.log(`Polkadot account address: ${account.address}`);
    
    return account;
  } catch (error) {
    console.error('Failed to get Polkadot account:', error);
    throw error;
  }
}

export async function checkDOTBalance(api: any, address:any) {
  try {
    const { data: balance } = await api.query.system.account(address);
    const free = balance.free.toString();
    console.log(`DOT Balance: ${ethers.utils.formatUnits(free, 10)} DOT`);
    return free;
  } catch (error) {
    console.error('Failed to check DOT balance:', error);
    throw error;
  }
}

export async function stakeTokens(api: any, account: any, amount: any, validators: any) {
  try {
    // If no validators provided, fetch a list of active validators
    if (validators.length === 0) {
      console.log('No validators specified, fetching active validators...');
      const validatorAddresses = await api.query.staking.validators.keys();
      validators = validatorAddresses.map((validator:any) => validator.args[0].toString());
      console.log(`Found ${validators.length} validators. Using first 5 for nomination.`);
      validators = validators.slice(0, 5); // Take the first 5 validators
    }
    
    console.log(`Staking ${amount} DOT with validators: ${validators.join(', ')}`);
    
    // Create bond transaction
    const bondTx = api.tx.staking.bond(
      account.address, // Controller is the same as the stash account in this case
      amount,
      { Staked: null } // Rewards will be added to stake
    );
    
    // Create nominate transaction
    const nominateTx = api.tx.staking.nominate(validators);
    
    // Combine both transactions in a batch
    const batchTx = api.tx.utility.batch([bondTx, nominateTx]);
    
    // Sign and send the transaction
    const txHash = await batchTx.signAndSend(account);
    console.log(`Staking transaction submitted: ${txHash.toHex()}`);
    
    return txHash.toHex();
  } catch (error) {
    console.error('Error during staking:', error);
    throw error;
  }
}

// ========== ETHEREUM BRIDGE INTEGRATION ==========

// Constants for the Ethereum bridge (Wormhole example)
const WORMHOLE_ETHEREUM_BRIDGE_ADDRESS = '0x3ee18B2214AFF97000D974cf647E7C347E8fa585'; // Wormhole bridge on Ethereum
const WORMHOLE_ABI = [
  "function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) external payable returns (uint64 sequence)"
];

export async function bridgeFromEthereum(ethPrivateKey: any, tokenAddress: any, amount: any, polkadotRecipient: any) {
  try {
    // Connect to Ethereum - using Metamask provider if available, otherwise fallback to Infura
    let provider;
    if (window.ethereum) {
      console.log('Using MetaMask provider');
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
    } else {
      console.log('MetaMask not available, using fallback provider');
      provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
    }
    
    const wallet = new ethers.Wallet(ethPrivateKey, provider);
    console.log(`Connected to Ethereum with address: ${wallet.address}`);
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
    
    // Convert Polkadot address to bytes32 for the bridge
    const recipientBytes32 = ethers.utils.hexZeroPad(
      ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(polkadotRecipient)
      ), 
      32
    );
    
    // Create bridge contract instance
    const bridgeContract = new ethers.Contract(
      WORMHOLE_ETHEREUM_BRIDGE_ADDRESS,
      WORMHOLE_ABI,
      wallet
    );
    
    // Approve token transfer if using ERC20
    if (tokenAddress !== 'ETH') {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address spender, uint256 amount) external returns (bool)'],
        wallet
      );
      
      console.log('Approving token transfer...');
      const approveTx = await tokenContract.approve(WORMHOLE_ETHEREUM_BRIDGE_ADDRESS, amount);
      await approveTx.wait();
      console.log('Token transfer approved');
    }
    
    // Execute bridge transaction
    console.log('Initiating bridge transfer...');
    const nonce = Math.floor(Math.random() * 1000000);
    const tx = await bridgeContract.transferTokens(
      tokenAddress === 'ETH' ? ethers.constants.AddressZero : tokenAddress,
      amount,
      22,  // Polkadot chain ID in Wormhole (this number may vary, check documentation)
      recipientBytes32,
      0,   // Arbiter fee (0 for direct transfer)
      nonce,
      {
        value: tokenAddress === 'ETH' ? amount : ethers.utils.parseEther('0.001'), // Bridge fee
        gasLimit: 500000
      }
    );
    
    const receipt = await tx.wait();
    console.log(`Bridge transaction confirmed: ${receipt.transactionHash}`);
    
    return {
      txHash: receipt.transactionHash,
      status: 'success'
    };
  } catch (error) {
    console.error('Error in Ethereum bridge:', error);
    throw error;
  }
}

// ========== COMPLETE CROSS-CHAIN FLOW ==========

export async function crossChainStakeFromEth(config:any) {
  try {
    // Step 1: Connect to Polkadot
    const api = await connectToPolkadot(config.polkadot.wsUrl);
    const polkadotAccount = await getPolkadotAccount(config.polkadot.mnemonic);
    
    // Step 2: Check initial DOT balance
    const initialBalance = await checkDOTBalance(api, polkadotAccount.address);
    
    // Step 3: Bridge tokens from Ethereum
    const bridgeResult = await bridgeFromEthereum(
      config.ethereum.privateKey,
      config.ethereum.tokenAddress,
      config.amount,
      polkadotAccount.address
    );
    
    console.log(`Bridge completed: ${JSON.stringify(bridgeResult)}`);
    
    // Step 4: In real implementation, you would monitor for the tokens to arrive
    // For hackathon purposes, we'll use a status tracking approach
    const statusElement = document.getElementById(config.statusElementId);
    if (statusElement) {
      statusElement.innerText = 'Bridge transaction completed. Waiting for tokens to arrive on Polkadot...';
    }
    
    // This function checks if tokens have arrived
    const checkTokenArrival = async () => {
      const newBalance = await checkDOTBalance(api, polkadotAccount.address);
      if (ethers.BigNumber.from(newBalance).gt(ethers.BigNumber.from(initialBalance))) {
        if (statusElement) {
          statusElement.innerText = 'Tokens arrived! Starting staking process...';
        }
        
        // Step 5: Stake tokens
        const stakeAmount = ethers.BigNumber.from(config.stakeAmount || config.amount).toString();
        const stakeTxHash = await stakeTokens(api, polkadotAccount, stakeAmount, config.validators);
        
        if (statusElement) {
          statusElement.innerText = `Staking transaction completed! Hash: ${stakeTxHash}`;
        }
        
        return {
          polkadotAddress: polkadotAccount.address,
          bridgeTransaction: bridgeResult.txHash,
          stakingTransaction: stakeTxHash,
          status: 'completed'
        };
      } else {
        if (statusElement) {
          statusElement.innerText = 'Still waiting for tokens to arrive...';
        }
        // Check again after 30 seconds
        setTimeout(checkTokenArrival, 30000);
      }
    };
    
    // Start checking for token arrival
    setTimeout(checkTokenArrival, 60000); // First check after 1 minute
    
    return {
      polkadotAddress: polkadotAccount.address,
      bridgeTransaction: bridgeResult.txHash,
      status: 'bridge_completed_waiting_for_tokens'
    };
  } catch (error) {
    console.error('Cross-chain staking flow failed:', error);
    const statusElement = document.getElementById(config.statusElementId);
    if (statusElement) {
      statusElement.innerText = `Error: ${(error as Error).message}`;
    }
    throw error;
  }
}

// Example minimal HTML interface usage:
/*
<div>
  <h2>ETH to Polkadot Cross-Chain Staking</h2>
  <div id="status">Ready to start</div>
  <button id="startButton">Start Cross-Chain Staking</button>
  
  <script type="module">
    import { crossChainStakeFromEth } from './polkadotBridge.js';
    
    document.getElementById('startButton').addEventListener('click', async () => {
      const config = {
        amount: ethers.utils.parseEther('0.1').toString(),
        statusElementId: 'status',
        polkadot: {
          wsUrl: 'wss://rpc.polkadot.io',
          mnemonic: 'your twelve word mnemonic phrase for polkadot account here'
        },
        ethereum: {
          privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          tokenAddress: 'ETH'
        }
      };
      
      try {
        document.getElementById('status').innerText = 'Starting cross-chain process...';
        await crossChainStakeFromEth(config);
      } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').innerText = Error: ${error.message};
      }
    });
  </script>
</div>
*/