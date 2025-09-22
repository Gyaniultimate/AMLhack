<div align="center">

🛡️ Aegis Protocol: On-Chain AML Compliance Oracle
A real-time, on-chain AML risk assessment solution for non-custodial wallets built on the Cosmos SDK.

</div>

<p align="center">
<img alt="Cosmos SDK" src="https://www.google.com/search?q=https://img.shields.io/badge/Cosmos_SDK-%25235064FB.svg%3Fstyle%3Dfor-the-badge%26logo%3Dcosmos%26logoColor%3Dwhite">
<img alt="CosmWasm" src="https://www.google.com/search?q=https://img.shields.io/badge/CosmWasm-grey%3Fstyle%3Dfor-the-badge%26logo%3Drust%26logoColor%3Dwhite">
<img alt="Rust" src="https://www.google.com/search?q=https://img.shields.io/badge/rust-%2523000000.svg%3Fstyle%3Dfor-the-badge%26logo%3Drust%26logoColor%3Dwhite">
<img alt="Node.js" src="https://www.google.com/search?q=https://img.shields.io/badge/node.js-6DA55F%3Fstyle%3Dfor-the-badge%26logo%3Dnode.js%26logoColor%3Dwhite">
<img alt="TypeScript" src="https://www.google.com/search?q=https://img.shields.io/badge/typescript-%2523007ACC.svg%3Fstyle%3Dfor-the-badge%26logo%3Dtypescript%26logoColor%3Dwhite">
<img alt="Docker" src="https://www.google.com/search?q=https://img.shields.io/badge/docker-%25230db7ed.svg%3Fstyle%3Dfor-the-badge%26logo%3Ddocker%26logoColor%3Dwhite">
<img alt="License: MIT" src="https://www.google.com/search?q=https://img.shields.io/badge/License-MIT-yellow.svg%3Fstyle%3Dfor-the-badge">
</p>

📋 Table of Contents
💡 Inspiration

🚀 What It Does

💻 How It's Built

🧠 Prospective AML Logic

⚙️ Setup and Installation

🧗 Challenges We Ran Into

🎉 Accomplishments & What's Next

👥 Team

🎬 Demo & Presentation

💡 Inspiration
Non-custodial wallets empower users with full control over their assets, but this autonomy presents a significant challenge for regulatory compliance. Financial institutions and decentralized applications lack visibility into the historical activity of these wallets, creating risks related to Anti-Money Laundering (AML). Our project was inspired by the need for a decentralized, trust-minimized solution that allows smart contracts to assess the risk profile of interacting wallets in real-time, fostering a safer and more compliant on-chain environment.

🚀 What It Does
Aegis Protocol introduces an on-chain/off-chain system to flag suspicious non-custodial wallets. The workflow is as follows:

Request: A user interacts with a smart contract, which triggers an AML check for a specific wallet address.

Event Emission: The smart contract stores the request as pending and emits an on-chain event with the wallet address and a unique request ID.

Oracle Listener: A dedicated off-chain oracle service continuously listens for these events.

Data Analysis: Upon hearing an event, the oracle queries its historical transaction dataset (derived from Google BigQuery's public Bitcoin and Ethereum data) to analyze the wallet's past activity.

Risk Scoring: The oracle uses a configurable AML logic engine to calculate a risk score and determine a compliance status (e.g., Compliant / Non-Compliant).

Callback: The oracle submits the result back to the smart contract, referencing the unique request ID.

State Update: The smart contract verifies the oracle's signature, updates the request status to complete, and stores the AML result on-chain, making it available for other smart contracts to query.

💻 How It's Built (Tech Stack)
Category

Technology

Blockchain

<img src="https://www.google.com/search?q=https://img.shields.io/badge/Cosmos_SDK-%25235064FB.svg%3Fstyle%3Dflat%26logo%3Dcosmos%26logoColor%3Dwhite" alt="Cosmos SDK">

Smart Contracts

<img src="https://www.google.com/search?q=https://img.shields.io/badge/CosmWasm-grey%3Fstyle%3Dflat%26logo%3Drust%26logoColor%3Dwhite" alt="CosmWasm"> & <img src="https://www.google.com/search?q=https://img.shields.io/badge/rust-%2523000000.svg%3Fstyle%3Dflat%26logo%3Drust%26logoColor%3Dwhite" alt="Rust">

Oracle Service

<img src="https://www.google.com/search?q=https://img.shields.io/badge/node.js-6DA55F%3Fstyle%3Dflat%26logo%3Dnode.js%26logoColor%3Dwhite" alt="Node.js">, <img src="https://www.google.com/search?q=https://img.shields.io/badge/typescript-%2523007ACC.svg%3Fstyle%3Dflat%26logo%3Dtypescript%26logoColor%3Dwhite" alt="TypeScript">

Data Source

Google BigQuery Public Datasets (Bitcoin & Ethereum)

Environment

<img src="https://www.google.com/search?q=https://img.shields.io/badge/docker-%25230db7ed.svg%3Fstyle%3Dflat%26logo%3Ddocker%26logoColor%3Dwhite" alt="Docker">

🧠 Prospective AML Logic (The Solution)
The core of the oracle is its AML logic engine. We designed a multi-layered approach that can be implemented to achieve varying degrees of accuracy and complexity.

Tier 1: Rule-Based Heuristics (MVP)
This model uses a simple, weighted scoring system based on predefined rules. It's fast, transparent, and effective for identifying basic red flags.

Transaction Value Threshold:

Logic: Assign risk points for transactions exceeding a certain fiat value (e.g., >$10,000).

Data Points: btc-transactions.value, eth-transactions.value.

Transaction Velocity & Volume:

Logic: Flag addresses that suddenly receive and send large volumes of funds in a short period (e.g., within 24 hours), which can be indicative of mixing or tumbling services.

Data Points: block_timestamp.

Interaction with High-Risk Entities:

Logic: Maintain and check against static lists of known sanctioned addresses, darknet market wallets, or mixer contracts. An interaction results in a maximum risk score.

Data Points: btc-inputs.spent_transaction_hash, eth-traces.to_address.

Address "Freshness":

Logic: Apply a higher baseline risk to new wallets that immediately engage in high-value or high-velocity transactions without a prior history.

Data Points: block_timestamp of the first transaction.

Tier 2: Graph Analysis (Advanced)
This approach models the transaction history as a graph, where addresses are nodes and transactions are edges. It allows for the discovery of complex, indirect relationships.

Sybil Detection: Identify clusters of wallets that are likely controlled by a single entity by analyzing transaction flows and timing.

Pathfinding to Illicit Sources: Trace funds back multiple hops to see if they originate from or pass through known high-risk addresses.

Centrality Analysis: Identify wallets that act as critical hubs or intermediaries in the flow of funds, which could indicate an unregistered exchange or a large-scale tumbler.

Tier 3: Machine Learning (Future Scope)
Anomaly Detection: Train an unsupervised model (e.g., Isolation Forest) on the entire dataset to identify transactions or address behaviors that are statistically significant outliers from the norm.

Supervised Classification: Build a labeled dataset of "illicit" vs. "licit" addresses and train a classifier (e.g., Random Forest, XGBoost) to predict the risk of a new address based on features engineered from its transaction history.

⚙️ Setup and Installation
Follow these steps to set up and run the project locally.

Clone the Repository

git clone [LINK_TO_YOUR_REPO]
cd [REPO_NAME]

Download & Prepare Data

Download the dataset: curl -o hackathon.zip https://storage.googleapis.com/blockchain-hackathon/hackathon.zip

Unzip the main file: unzip hackathon.zip

Navigate to the data folder and unzip all data files using the provided script:

cd data/hackathon
chmod +x unzip_all.sh
./unzip_all.sh
cd ../.. 

Run the Local Blockchain

cd docker
./setup_and_run.sh

Compile & Deploy the Smart Contract

Compile: From the project root, run the rust-optimizer:

docker run --rm -v "$(pwd)/sample-contract":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.12.13

Deploy: Enter the running docker container to execute deployment commands:

docker exec -it wasmd /bin/sh

# Inside the container, run the following:
# 1. Store the contract
CODE_ID=$(wasmd tx wasm store "/root/contract/artifacts/sample_contract.wasm" --from wallet --chain-id "testing" -y --node "http://localhost:26657" --gas-prices "0.025stake" --gas "auto" --gas-adjustment 1.2 --output json | jq -r '.logs[0].events[-1].attributes[0].value')

# 2. Instantiate the contract and echo the address
wasmd tx wasm instantiate $CODE_ID '{"oracle_pubkey":"A316E25B575924296805721F53532F473615A832168955171165A2890F385813"}' --from wallet --label "aml-oracle" --admin $(wasmd keys show wallet -a) --chain-id "testing" -y --node "http://localhost:26657" --gas-prices "0.025stake" --gas "auto" --gas-adjustment 1.2 --output json | jq -r '.logs[0].events[0].attributes[0].value'

# Copy the output contract address and then 'exit' the container.
exit

Configure and Run the Oracle Service

Generate Client: From the sample-contract directory:

cosmwasm-ts-codegen generate \
  --plugin client \
  --schema ./schema \
  --out ../oracle-service/src/sdk \
  --name oracle

Configure: Create a .env file in the oracle-service directory and add the contract address:

CONTRACT_ADDRESS="<paste-your-contract-address-here>"

Run:

cd oracle-service
npm install
npx ts-node src/app.ts

🧗 Challenges We Ran Into
Data Volume: The full dataset is massive. We had to develop efficient data parsing and querying strategies to ensure the oracle could respond in a timely manner.

On-Chain/Off-Chain Synchronization: Ensuring the oracle reliably listens to and responds to events from the smart contract required careful state management and robust error handling.

Defining "Risk": Quantifying AML risk is subjective. Developing a heuristic model that is both fair and effective was a significant challenge and required iterative tuning.

🎉 Accomplishments & What's Next
Accomplishments: We successfully built a fully functional end-to-end prototype, demonstrating a viable model for on-chain compliance checks.

What's Next:

➡️ Implement the advanced Graph Analysis and Machine Learning models for risk scoring.

➡️ Integrate more data sources (e.g., other blockchains, public sanctions lists).

➡️ Build a user-friendly front-end for interacting with the smart contract and viewing wallet risk profiles.

➡️ Decentralize the oracle service further by using a network of oracle nodes.

👥 Team
Name

Role

Contact

[Your Name]

Blockchain Dev

[Link to your GitHub/LinkedIn]

[Teammate's Name]

Oracle Dev

[Link to their GitHub/LinkedIn]

🎬 Demo & Presentation
Demo Video: [Link to Demo Video - e.g., YouTube, Loom]

Presentation Slides: [Link to Presentation - e.g., Google Slides, PDF]
