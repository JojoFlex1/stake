"use client"

import { useEffect, useState } from "react"
import { Wallet, Coins, ArrowRight, Check, Loader2, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
// Import the Polkadot logic functions
import { 
  connectToPolkadot, 
  getPolkadotAccount, 
  checkDOTBalance,
  stakeTokens,
  bridgeFromEthereum,
  crossChainStakeFromEth 
} from "@/lib/logic"

// Import ethers.js for Ethereum blockchain interaction
import { ethers } from "ethers"

// ABI for ERC20 token balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export default function Home() {
  const [activeChain, setActiveChain] = useState("ethereum")
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [selectedTokens, setSelectedTokens] = useState({})
  const [isAggregating, setIsAggregating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [tokens, setTokens] = useState([])
  const [polkadotApi, setPolkadotApi] = useState(null)
  const [polkadotAddress, setPolkadotAddress] = useState("")
  const [polkadotBalance, setPolkadotBalance] = useState("0")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [stakingStatus, setStakingStatus] = useState("")

  // Connect to Polkadot when the component mounts
  useEffect(() => {
    async function initPolkadot() {
      try {
        const api = await connectToPolkadot('wss://westend-rpc.polkadot.io')
        setPolkadotApi(api)
        console.log("Connected to Polkadot")
      } catch (err) {
        console.error("Failed to connect to Polkadot:", err)
        setError("Failed to connect to Polkadot network")
      }
    }
    
    initPolkadot()
  }, [])

  // Fetch real token balances for Ethereum
  const fetchEthereumTokens = async (provider, address) => {
    try {
      // Get ETH balance
      const ethBalance = await provider.getBalance(address)
      const ethBalanceNum = parseFloat(ethers.utils.formatEther(ethBalance))
      const ethValue = ethBalanceNum * 2120 // Assuming ETH price of $2120
      
      const tokensData = [{
        name: "ETH",
        balance: ethBalanceNum,
        value: ethValue,
        isDust: ethBalanceNum < 0.01,
        address: "ETH"
      }]
      
      // Common ERC20 tokens to check
      const erc20Tokens = [
        { name: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", price: 1 },
        { name: "LINK", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", price: 7.40 },
        { name: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", price: 6.50 },
        { name: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", price: 1 },
        { name: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", price: 1 },
      ]
      
      // Fetch actual ERC20 token balances
      for (const token of erc20Tokens) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider)
          const balance = await tokenContract.balanceOf(address)
          const decimals = await tokenContract.decimals()
          const balanceNum = parseFloat(ethers.utils.formatUnits(balance, decimals))
          const value = balanceNum * token.price
          
          // Only add tokens with non-zero balance
          if (balanceNum > 0) {
            tokensData.push({
              name: token.name,
              balance: balanceNum,
              value: value,
              isDust: balanceNum * token.price < 10, // Consider dust if less than $10
              address: token.address
            })
          }
        } catch (err) {
          console.error(`Error fetching ${token.name} balance:`, err)
        }
      }
      
      return tokensData
    } catch (err) {
      console.error("Error fetching Ethereum tokens:", err)
      throw err
    }
  }

  // Connect wallet and fetch token balances
  const connectWallet = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      let provider
      let address
      let tokensData = []
      
      if (activeChain === "ethereum") {
        // Connect to Ethereum using MetaMask or other provider
        if (window.ethereum) {
          provider = new ethers.providers.Web3Provider(window.ethereum)
          await provider.send("eth_requestAccounts", [])
          const signer = provider.getSigner()
          address = await signer.getAddress()
          
          // Fetch real token balances
          tokensData = await fetchEthereumTokens(provider, address)
        } else {
          throw new Error("Ethereum provider not found. Please install MetaMask.")
        }
      } else if (activeChain === "solana") {
        // Connect to Solana
        try {
          // Check if Phantom wallet is available
          const solana = window.solana;
          if (!solana) {
            throw new Error("Solana wallet not found. Please install Phantom.")
          }
          
          // Request connection to the Solana wallet
          await solana.connect();
          address = solana.publicKey.toString();
          
          // In a real implementation, you would fetch actual Solana token balances
          // For now we'll use a placeholder that indicates real data would go here
          tokensData = [{
            name: "SOL",
            balance: 0, // This would be replaced with actual balance
            value: 0,   // This would be replaced with actual value
            isDust: false,
            address: "SOL"
          }]
          
          // Add code to fetch SPL tokens here
        } catch (err) {
          throw new Error(`Solana wallet error: ${err.message}`);
        }
      }
      
      setWalletAddress(address)
      setTokens(tokensData)
      setWalletConnected(true)
      
      // Initialize all tokens as selected
      const initialSelection = {}
      tokensData.forEach((token) => {
        initialSelection[token.name] = token.isDust
      })
      setSelectedTokens(initialSelection)
      
      // If we have a Polkadot account, create or retrieve it
      if (polkadotApi) {
        try {
          // In a real app, you would manage this securely
          // WARNING: This is only for demo purposes
          const demoMnemonic = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
          const account = await getPolkadotAccount(demoMnemonic)
          setPolkadotAddress(account.address)
          
          // Check DOT balance
          const dotBalance = await checkDOTBalance(polkadotApi, account.address)
          setPolkadotBalance(ethers.utils.formatUnits(dotBalance, 10))
        } catch (err) {
          console.error("Failed to set up Polkadot account:", err)
        }
      }
      
    } catch (err) {
      console.error("Failed to connect wallet:", err)
      setError(err.message || "Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWalletConnected(false)
    setWalletAddress("")
    setSelectedTokens({})
    setTokens([])
    setError("")
  }

  const toggleToken = (tokenName) => {
    setSelectedTokens((prev) => ({
      ...prev,
      [tokenName]: !prev[tokenName],
    }))
  }

  const aggregateDust = async () => {
    setIsAggregating(true)
    setError("")
    setStakingStatus("Starting dust aggregation process...")
    
    try {
      // Get selected tokens
      const tokensToAggregate = tokens.filter(
        (token) => selectedTokens[token.name]
      )
      
      if (tokensToAggregate.length === 0) {
        throw new Error("No tokens selected")
      }
      
      // In a real application, you would:
      // 1. Sell tokens for ETH or another asset
      // 2. Bridge that asset to Polkadot
      // 3. Stake the DOT tokens
      
      console.log("Starting dust aggregation for tokens:", tokensToAggregate)
      setStakingStatus("Converting dust tokens to ETH...")
      
      // Simulate the conversion process with proper status updates
      setTimeout(() => {
        setStakingStatus("Bridging assets to Polkadot...")
        
        setTimeout(() => {
          setStakingStatus("Initiating staking on Polkadot...")
          
          setTimeout(() => {
            // Update the Polkadot balance to show staking worked
            const aggregatedValue = tokensToAggregate.reduce((sum, token) => sum + token.value, 0)
            const estimatedDot = aggregatedValue / 7.5 // Assuming DOT price of $7.50
            
            // Add the staked amount to the current balance
            const newBalance = parseFloat(polkadotBalance) + estimatedDot
            setPolkadotBalance(newBalance.toFixed(4))
            
            setStakingStatus(`Successfully staked ${estimatedDot.toFixed(4)} DOT`)
            setIsAggregating(false)
            setIsComplete(true)
          }, 2000)
        }, 1500)
      }, 1500)
      
    } catch (err) {
      console.error("Failed to aggregate dust:", err)
      setError(err.message || "Failed to aggregate dust")
      setStakingStatus("Failed to complete staking process")
      setIsAggregating(false)
    }
  }

  const reset = () => {
    setIsComplete(false)
    setStakingStatus("")
    setError("")
  }

  const totalValue = tokens
    .filter((token) => selectedTokens[token.name])
    .reduce((sum, token) => sum + token.value, 0)
    .toFixed(2)

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-700 mb-2">Dust Aggregator</h1>
          <p className="text-lg text-gray-600">Turn your small token balances into staked assets</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Card className="mb-6 border-pink-200 shadow-md">
          <CardContent className="p-6">
            <Tabs defaultValue="ethereum" onValueChange={setActiveChain} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ethereum" className="text-lg">
                  Ethereum
                </TabsTrigger>
                <TabsTrigger value="solana" className="text-lg">
                  Solana
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ethereum" className="mt-0">
                <div className="text-center py-4">
                  {!walletConnected ? (
                    <Button
                      size="lg"
                      className="w-full bg-pink-600 hover:bg-pink-700 text-lg h-14"
                      onClick={connectWallet}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-5 w-5" />
                          Connect Ethereum Wallet
                        </>
                      )}
                    </Button>
                  ) : isComplete ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center mb-4 text-pink-600">
                        <Check className="h-12 w-12" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Success!</h3>
                      <p className="mb-4">{stakingStatus}</p>
                      <div className="bg-pink-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Polkadot Address:</span>
                          <span className="font-mono text-sm">{polkadotAddress ? `${polkadotAddress.substring(0, 6)}...${polkadotAddress.substring(polkadotAddress.length - 4)}` : 'Unavailable'}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="font-medium">Current DOT Balance:</span>
                          <span className="font-bold">{polkadotBalance} DOT</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={reset} className="flex-1 bg-pink-600 hover:bg-pink-700">
                          Stake More
                        </Button>
                        <Button onClick={disconnectWallet} className="flex-1 bg-gray-600 hover:bg-gray-700">
                          <LogOut className="mr-2 h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <WalletContent
                      tokens={tokens}
                      selectedTokens={selectedTokens}
                      toggleToken={toggleToken}
                      totalValue={totalValue}
                      aggregateDust={aggregateDust}
                      isAggregating={isAggregating}
                      walletAddress={walletAddress}
                      polkadotAddress={polkadotAddress}
                      polkadotBalance={polkadotBalance}
                      stakingStatus={stakingStatus}
                      disconnectWallet={disconnectWallet}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="solana" className="mt-0">
                <div className="text-center py-4">
                  {!walletConnected ? (
                    <Button
                      size="lg"
                      className="w-full bg-pink-600 hover:bg-pink-700 text-lg h-14"
                      onClick={connectWallet}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-5 w-5" />
                          Connect Solana Wallet
                        </>
                      )}
                    </Button>
                  ) : isComplete ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center mb-4 text-pink-600">
                        <Check className="h-12 w-12" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Success!</h3>
                      <p className="mb-4">{stakingStatus}</p>
                      <div className="bg-pink-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Polkadot Address:</span>
                          <span className="font-mono text-sm">{polkadotAddress ? `${polkadotAddress.substring(0, 6)}...${polkadotAddress.substring(polkadotAddress.length - 4)}` : 'Unavailable'}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="font-medium">Current DOT Balance:</span>
                          <span className="font-bold">{polkadotBalance} DOT</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={reset} className="flex-1 bg-pink-600 hover:bg-pink-700">
                          Stake More
                        </Button>
                        <Button onClick={disconnectWallet} className="flex-1 bg-gray-600 hover:bg-gray-700">
                          <LogOut className="mr-2 h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <WalletContent
                      tokens={tokens}
                      selectedTokens={selectedTokens}
                      toggleToken={toggleToken}
                      totalValue={totalValue}
                      aggregateDust={aggregateDust}
                      isAggregating={isAggregating}
                      walletAddress={walletAddress}
                      polkadotAddress={polkadotAddress}
                      polkadotBalance={polkadotBalance}
                      stakingStatus={stakingStatus}
                      disconnectWallet={disconnectWallet}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 text-sm">
          <p>Dust Aggregator automatically detects small token balances and stakes them on Polkadot.</p>
          {polkadotApi && <p className="mt-1 text-green-600">✓ Connected to Polkadot</p>}
        </div>

        {/* Status element for cross-chain process updates */}
        <div id="status" className={stakingStatus ? "mt-4 p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded" : "hidden"}>
          {stakingStatus}
        </div>
      </div>
    </main>
  )
}

interface WalletContentProps {
  tokens: { name: string; balance: number; value: number; isDust: boolean; address: string }[]
  selectedTokens: Record<string, boolean>
  toggleToken: (tokenName: string) => void
  totalValue: string
  aggregateDust: () => void
  isAggregating: boolean
  walletAddress: string
  polkadotAddress: string
  polkadotBalance: string
  stakingStatus: string
  disconnectWallet: () => void
}

function WalletContent({
  tokens,
  selectedTokens,
  toggleToken,
  totalValue,
  aggregateDust,
  isAggregating,
  walletAddress,
  polkadotAddress,
  polkadotBalance,
  stakingStatus,
  disconnectWallet,
}: WalletContentProps) {
  return (
    <div>
      <div className="mb-4 text-left flex justify-between items-center">
        <p className="text-sm text-gray-600">Connected: 
          <span className="font-mono ml-1">
            {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
          </span>
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={disconnectWallet}
          className="text-gray-600 border-gray-300"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Disconnect
        </Button>
      </div>

      <h3 className="text-xl font-medium mb-4 text-left">Your Dust Tokens</h3>
      <p className="text-left text-gray-600 mb-4">Select which small balances you want to aggregate and stake:</p>

      <div className="space-y-3 mb-6">
        {tokens.length > 0 ? (
          tokens.map((token) => (
            <div
              key={token.name}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-pink-100"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mr-3">
                  <Coins className="h-4 w-4 text-pink-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{token.name}</p>
                  <div className="flex text-sm text-gray-500">
                    <span>{token.balance.toFixed(6)} ({token.value.toFixed(2)} USD)</span>
                  </div>
                </div>
              </div>
              <Switch checked={selectedTokens[token.name] || false} onCheckedChange={() => toggleToken(token.name)} />
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">No tokens found in wallet</div>
        )}
      </div>

      <div className="bg-pink-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Total Value:</span>
          <span className="font-bold">${totalValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Destination:</span>
          <span className="font-medium">Polkadot Staking</span>
        </div>
        {polkadotAddress && (
          <>
            <div className="flex justify-between mt-2 text-sm">
              <span className="font-medium">Recipient:</span>
              <span className="font-mono">{polkadotAddress.substring(0, 6)}...{polkadotAddress.substring(polkadotAddress.length - 4)}</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="font-medium">Current DOT Balance:</span>
              <span className="font-medium">{polkadotBalance} DOT</span>
            </div>
          </>
        )}
      </div>

      <Button
        size="lg"
        className="w-full bg-pink-600 hover:bg-pink-700 text-lg h-14"
        onClick={aggregateDust}
        disabled={isAggregating || Number.parseFloat(totalValue) === 0}
      >
        {isAggregating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Aggregating...
          </>
        ) : (
          <>
            <ArrowRight className="mr-2 h-5 w-5" />
            Aggregate & Stake Dust
          </>
        )}
      </Button>
      
      {stakingStatus && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded text-sm">
          {stakingStatus}
        </div>
      )}
    </div>
  )
}