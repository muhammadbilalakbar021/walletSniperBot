## Wallet Sniping Bot
This bot, built with NestJS, monitors tokens in the Radium ecosystem, performs liquidity checks, tracks account holders, and calculates Profit and Loss (PNL).

## Features
1. Token Monitoring: Fetches new tokens from Radium and tracks their liquidity.
2. Liquidity Detection: Listens for liquidity events and extracts token buy/sell transactions.
3. Account Holder Detection: Filters accounts and checks balances and Radium activity.
4. PNL Calculation: Fetches account information from Cielo to calculate the profit and loss.
5. Transaction Tracking: Retrieves wallet swap transactions using Helius API.

## Prerequisites
Before running the bot, make sure you have the following installed:

Node.js (v16 or later)
NestJS
PostgreSQL (or any other database of your choice if you modify the persistence layer)
API Keys/Access for Radium, Helius, and Cielo
A stable internet connection for external API calls


## ENV
-NODE_ENV=development
PORT=3000
MONGO_CLUSTER_URI=mongodb+srv://wallet_sniper?retryWrites=true&w=majority
JWT_TOKEN="xyz"
JWT_EXPIRY_TIME=0
SESSION_STORAGE_TOKEN=abc
MORALIS_PUB_KEY=''
AWS_ACCESS_KEY=""
AWS_SECRET_KEY=""
AWS_REGION=""
AWS_BUCKET=""
WALLET_PRIVATE_KEY=""
RPC_URL=""
CIELO_API_KEY=""
HELIUS_API_KEY=""


## Bot Workflow
1. Fetch New Tokens from Radium
The bot regularly fetches new tokens from Radium. Each token's liquidity is checked, and the bot waits for any significant liquidity change (e.g., when liquidity goes to zero).

2. Extract Buy/Sell Transactions
Once liquidity reaches zero for a token, the bot extracts all buy and sell transactions for that token. It tracks the wallet addresses involved and gathers transaction details, including amounts and timestamps.

3. Filter Account Holders
The bot filters the account holders from the buy/sell transactions and checks their balance on Radium. The goal is to understand which accounts are holding tokens and their trading activity.

4. PNL Calculation via Cielo
The bot uses the Cielo API to fetch wallet balances and transaction histories. It calculates the profit and loss (PNL) for each account holder based on their token holdings and transaction history.

5. Track Wallet Swap Transactions
The bot queries the Helius API to gather details about wallet swap transactions. This includes identifying swap pairs and tracking any arbitrage opportunities or unusual wallet activities.