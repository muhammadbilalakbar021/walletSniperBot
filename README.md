## Meme Token Sniping Bot
This bot, built with NestJS, monitors tokens in the Radium ecosystem, performs liquidity checks, and tracks tokens.

## Features
1. Token Monitoring: Fetches new tokens from Radium and tracks their liquidity.
2. Liquidity Detection: Listens for liquidity events and extracts token buy/sell transactions.
3. Find gainers from shit tokens

## Prerequisites
Before running the bot, make sure you have the following installed:

Node.js (v16 or later)
NestJS
MongoDB
API Keys/Access for RPC
A stable internet connection for external API calls


## ENV
-NODE_ENV=development
PORT=3000
MONGO_CLUSTER_URI=mongodb+srv://?retryWrites=true&w=majority
JWT_TOKEN=""
JWT_EXPIRY_TIME=600000000
SESSION_STORAGE_TOKEN=dyrekt
MORALIS_PUB_KEY=""
AWS_ACCESS_KEY=""
AWS_SECRET_KEY=""
AWS_REGION=""
AWS_BUCKET=""
WALLET_PRIVATE_KEY=""
BUMPER_WALLET_PRIVATE_KEY=""
PFUN_WALLET_PRIVATE_KEY=""
VOLUME_WALLET_PRIVATE_KEY=""
RPC_URL=""
PINATA_API_KEY=""
PINATA_SECRET_KEY=""
PINATA_GATEWAY_TOKEN=""
PINATA_JWT_KEY=""
