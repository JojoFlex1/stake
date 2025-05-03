"use client"

import { useState } from "react"
import { Wallet, Coins, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/cards"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

// Mock data for demonstration
const mockEthTokens = [
  { name: "ETH", balance: 0.0012, value: 2.54, isDust: true },
  { name: "USDC", balance: 0.45, value: 0.45, isDust: true },
  { name: "LINK", balance: 0.12, value: 0.89, isDust: true },
  { name: "UNI", balance: 0.05, value: 0.32, isDust: true },
]

const mockSolTokens = [
  { name: "SOL", balance: 0.015, value: 1.23, isDust: true },
  { name: "USDT", balance: 0.67, value: 0.67, isDust: true },
  { name: "RAY", balance: 0.08, value: 0.21, isDust: true },
  { name: "SRM", balance: 0.11, value: 0.18, isDust: true },
]

export default function Home() {
  const [activeChain, setActiveChain] = useState("ethereum")
  const [walletConnected, setWalletConnected] = useState(false)
  const [selectedTokens, setSelectedTokens] = useState<Record<string, boolean>>({})
  const [isAggregating, setIsAggregating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const tokens = activeChain === "ethereum" ? mockEthTokens : mockSolTokens

  const connectWallet = () => {
    // In a real app, this would connect to the actual wallet
    setWalletConnected(true)

    // Initialize all tokens as selected
    const initialSelection: Record<string, boolean> = {}
    tokens.forEach((token) => {
      initialSelection[token.name] = true
    })
    setSelectedTokens(initialSelection)
  }

  const toggleToken = (tokenName: string) => {
    setSelectedTokens((prev) => ({
      ...prev,
      [tokenName]: !prev[tokenName],
    }))
  }

  const aggregateDust = () => {
    setIsAggregating(true)
    // Simulate the aggregation process
    setTimeout(() => {
      setIsAggregating(false)
      setIsComplete(true)
    }, 2000)
  }

  const reset = () => {
    setWalletConnected(false)
    setSelectedTokens({})
    setIsComplete(false)
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
                      onClick={connectWallet} title={""}                    >
                      <Wallet className="mr-2 h-5 w-5" />
                      Connect Ethereum Wallet
                    </Button>
                  ) : isComplete ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center mb-4 text-pink-600">
                        <Check className="h-12 w-12" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Success!</h3>
                      <p className="mb-4">Your dust tokens are now being staked on Polkadot.</p>
                      <Button onClick={reset} className="bg-pink-600 hover:bg-pink-700">
                        Start Over
                      </Button>
                    </div>
                  ) : (
                    <WalletContent
                      tokens={tokens}
                      selectedTokens={selectedTokens}
                      toggleToken={toggleToken}
                      totalValue={totalValue}
                      aggregateDust={aggregateDust}
                      isAggregating={isAggregating}
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
                    >
                      <Wallet className="mr-2 h-5 w-5" />
                      Connect Solana Wallet
                    </Button>
                  ) : isComplete ? (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center mb-4 text-pink-600">
                        <Check className="h-12 w-12" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Success!</h3>
                      <p className="mb-4">Your dust tokens are now being staked on Polkadot.</p>
                      <Button onClick={reset} className="bg-pink-600 hover:bg-pink-700">
                        Start Over
                      </Button>
                    </div>
                  ) : (
                    <WalletContent
                      tokens={tokens}
                      selectedTokens={selectedTokens}
                      toggleToken={toggleToken}
                      totalValue={totalValue}
                      aggregateDust={aggregateDust}
                      isAggregating={isAggregating}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 text-sm">
          <p>Dust Aggregator automatically detects small token balances and stakes them on Polkadot.</p>
        </div>
      </div>
    </main>
  )
}

interface WalletContentProps {
  tokens: { name: string; balance: number; value: number; isDust: boolean }[]
  selectedTokens: Record<string, boolean>
  toggleToken: (tokenName: string) => void
  totalValue: string
  aggregateDust: () => void
  isAggregating: boolean
}

function WalletContent({
  tokens,
  selectedTokens,
  toggleToken,
  totalValue,
  aggregateDust,
  isAggregating,
}: WalletContentProps) {
  return (
    <div>
      <h3 className="text-xl font-medium mb-4 text-left">Your Dust Tokens</h3>
      <p className="text-left text-gray-600 mb-4">Select which small balances you want to aggregate and stake:</p>

      <div className="space-y-3 mb-6">
        {tokens.map((token) => (
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
                <p className="text-sm text-gray-500">${token.value.toFixed(2)}</p>
              </div>
            </div>
            <Switch checked={selectedTokens[token.name] || false} onCheckedChange={() => toggleToken(token.name)} />
          </div>
        ))}
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
    </div>
  )
}