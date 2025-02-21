window.process = { env: { NODE_ENV: 'production' } };

import {
    EthereumClient,
    w3mConnectors,
    w3mProvider,
    WagmiCore,
    WagmiCoreChains
} from 'https://unpkg.com/@web3modal/ethereum';
import { Web3Modal } from 'https://unpkg.com/@web3modal/html';


class Web3Connector {
    constructor(projectId) {
        this.projectId = projectId;
        this.web3 = null;
        this.selectedAccount = null;
        this.isConnected = false;

        // Initialize Wagmi configuration
        const { configureChains, createConfig } = WagmiCore;
        const { polygon } = WagmiCoreChains;

        const { publicClient } = configureChains([polygon], [w3mProvider({ projectId })]);
        this.wagmiConfig = createConfig({
            autoConnect: true,
            connectors: w3mConnectors({ projectId, chains: [polygon] }),
            publicClient
        });

        this.ethereumClient = new EthereumClient(this.wagmiConfig, [polygon]);
        this.web3modal = new Web3Modal({ projectId }, this.ethereumClient);
    }


    async init() {
        const connectButton = document.getElementById('connectButton');
        if (connectButton) {
            connectButton.addEventListener('click', () => this.connect());
        }

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', () => this.handleAccountChange());
            window.ethereum.on('chainChanged', () => this.handleChainChange());
        }

        await this.checkConnection();
    }

    async connect() {
        try {
            document.getElementById('statusMessage').textContent = 'Connecting...';
            await this.web3modal.openModal();
            await this.checkConnection();
        } catch (error) {
            console.error('Error connecting wallet:', error);
            document.getElementById('statusMessage').textContent = 'Error connecting: ' + error.message;
        }
    }

    async checkConnection() {
        const { getAccount, getWalletClient } = WagmiCore;
        const account = getAccount();

        if (account.isConnected) {
            const walletClient = await getWalletClient();
            if (walletClient) {
                this.web3 = new Web3(walletClient.transport);
                this.selectedAccount = account.address;
                this.isConnected = true;

                document.getElementById('walletAddress').textContent = this.selectedAccount;
                document.getElementById('statusMessage').textContent = 'Wallet connected successfully!';

                // Ensure data is only shown after a successful connection
                // await fetchBalance();
                // await fetchUsdtBalance();
                // await fetchUsdcBalance();
            }
        } else {
            this.disconnect();
        }
    }


    async handleAccountChange() {
        await this.checkConnection();
    }

    async handleChainChange() {
        await this.checkConnection();
    }

    disconnect() {
        this.web3 = null;
        this.selectedAccount = null;
        this.isConnected = false;
        document.getElementById('walletAddress').textContent = 'Not connected';
        document.getElementById('statusMessage').textContent = 'Wallet disconnected';
    }
}

const connector = new Web3Connector('a2745039469e414ecfcf3a08f33b0e88');



document.addEventListener("DOMContentLoaded", async () => {
    const connectButton = document.getElementById('connectWallet');
    const walletAddressDisplay = document.getElementById('walletAddress');
    const walletBalanceDisplay = document.getElementById('walletBalance');
    const usdtBalanceDisplay = document.getElementById('usdtBalance');
    const usdcBalanceDisplay = document.getElementById('usdcBalance');
    const sendButton = document.getElementById('sendToken');
    const sendUsdtButton = document.getElementById('sendUsdtToken');
    const sendUsdcButton = document.getElementById('sendUsdcToken');
    const recipientInput = document.getElementById('recipientAddress');
    const amountInput = document.getElementById('amount');
    const usdtRecipientInput = document.getElementById('usdtRecipientAddress');
    const usdcRecipientInput = document.getElementById('usdcRecipientAddress');
    const usdtAmountInput = document.getElementById('usdtAmount');
    const usdcAmountInput = document.getElementById('usdcAmount');
    const transactionStatus = document.getElementById('transactionStatus');
    const networkSelect = document.getElementById('networkSelect');

    let userAccount = null;
    let web3;

    connectButton.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask or Trust Wallet!");
            return;
        }

        try {
            document.getElementById('statusMessage').textContent = 'Connecting...';

            await connector.connect(); // Wait for wallet connection

            if (connector.isConnected) {
                web3 = new Web3(window.ethereum);
                const accounts = await web3.eth.getAccounts();

                if (accounts.length === 0) {
                    alert("No accounts found. Please unlock your wallet.");
                    return;
                }

                userAccount = accounts[0];
                walletAddressDisplay.textContent = `Connected: ${userAccount}`;
                document.getElementById('statusMessage').textContent = 'Wallet connected successfully!';

                // Ensure all data fetches happen sequentially after connection
                await fetchBalance();
                await fetchUsdtBalance();
                await fetchUsdcBalance();

                // Handle account changes
                window.ethereum.on('accountsChanged', async (accounts) => {
                    if (accounts.length > 0) {
                        userAccount = accounts[0];
                        walletAddressDisplay.textContent = `Connected: ${userAccount}`;
                        await fetchBalance();
                        await fetchUsdtBalance();
                        await fetchUsdcBalance();
                    } else {
                        userAccount = null;
                        walletAddressDisplay.textContent = 'Not Connected';
                        walletBalanceDisplay.textContent = 'Balance: 0';
                    }
                });
            } else {
                document.getElementById('statusMessage').textContent = 'Wallet not connected.';
            }

        } catch (error) {
            console.error("Wallet connection error:", error);
            document.getElementById('statusMessage').textContent = 'Error connecting: ' + error.message;
        }
    });


    const networks = {
        sepolia: { chainId: '0xaa36a7', name: 'Sepolia', currency: 'Sepolia(ETH)' },
        ethereum: { chainId: '0x1', name: 'Ethereum', currency: 'ETH' },
        polygon: { chainId: '0x89', name: 'Polygon', currency: 'MATIC' },
        bsc: { chainId: '0x38', name: 'BSC', currency: 'BNB' },
        polygonAmoy: { chainId: '0x13882', name: 'Polygon Amoy Testnet', currency: 'Amoy(MATIC)' }
    };

    async function fetchBalance() {
        if (!userAccount || !web3) return;
        try {
            const chainId = await web3.eth.getChainId();
            const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));

            if (!network) {
                walletBalanceDisplay.textContent = 'Unknown network';
                return;
            }

            const balance = await web3.eth.getBalance(userAccount);
            const formattedBalance = web3.utils.fromWei(balance, 18);
            walletBalanceDisplay.textContent = `Balance: ${formattedBalance} ${network.currency}`;
        } catch (error) {
            console.error("Error fetching balance:", error);
            walletBalanceDisplay.textContent = 'Error fetching balance';
        }
    }

    async function fetchTokenBalance(contractAddress, displayElement, tokenName) {
        if (!userAccount || !web3) return;

        const chainId = await web3.eth.getChainId();
        const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));

        if (!network || !contractAddress[network.name.toLowerCase()]) {
            displayElement.textContent = `${tokenName} Balance: N/A`;
            return;
        }

        const contract = new web3.eth.Contract(tokenAbi, contractAddress[network.name.toLowerCase()]);

        try {
            const balance = await contract.methods.balanceOf(userAccount).call();
            // const decimals = await contract.methods.decimals().call();
            const formattedBalance = web3.utils.fromWei(balance, 6);
            displayElement.textContent = `${tokenName} Balance: ${formattedBalance}`;
        } catch (error) {
            console.error(`Error fetching ${tokenName} balance:`, error);
            displayElement.textContent = `${tokenName} Balance: Error`;
        }
    }

    async function fetchUsdtBalance() {
        console.log("Fetching USDT balance...");
        await fetchTokenBalance(usdtContractAddress, usdtBalanceDisplay, 'USDT');
    }

    async function fetchUsdcBalance() {
        console.log("Fetching USDC balance...");
        await fetchTokenBalance(usdcContractAddress, usdcBalanceDisplay, 'USDC');
    }

    document.getElementById('switchNetwork').addEventListener('click', async () => {
        const selectedChain = networks[document.getElementById('networkSelect').value];

        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: selectedChain.chainId }],
            });

            alert(`Switched to ${selectedChain.name}`);
            fetchBalance();
            fetchUsdtBalance();
            fetchUsdcBalance();
        } catch (error) {
            console.error(`Failed to switch network: ${error.message}`);
            if (error.code === 4902) {
                alert("Network not available in wallet. Add it manually.");
            }
        }
    });


    sendButton.addEventListener('click', async () => {
        if (!userAccount || !web3) {
            alert("Please connect your wallet first.");
            return;
        }

        const recipient = recipientInput.value.trim();
        const amount = amountInput.value.trim();
        const chain = networks[networkSelect.value];

        if (!recipient || !amount) {
            alert("Please enter a valid recipient address and amount.");
            return;
        }

        if (!web3.utils.isAddress(recipient)) {
            alert("Invalid recipient address format.");
            return;
        }

        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            console.log("Chain ID:", parseInt(chain.chainId));
            const amountWei = web3.utils.toWei(amount, 'ether');
            const amountHex = web3.utils.toHex(BigInt(amountWei));
            console.log("Amount in wei:", amountHex, amountWei);
            const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));
            console.log("Current Chain ID:", network.name);
            currentNetwork = network.name;
            const transactionParameters = {
                to: recipient,
                from: userAccount,
                value: amountHex,
                chainId: chain.chainId,
            };

            transactionStatus.textContent = 'Initiating transaction...';

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });

            transactionStatus.textContent = `Transaction sent: ${txHash}`;
            console.log("Transaction Hash:", txHash);

      
        } catch (error) {
            console.error("Transaction failed:", error);
            transactionStatus.textContent = `Transaction failed: ${error.message}`;
        }
    });


    const usdtContractAddress = {

        sepolia: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        polygon: '0x3b2e72e92540855d5f231bbf263fb5b043c5a1d0',
        bsc: '0x55d398326f99059ff775485246999027b3197955'
    };

    const usdcContractAddress = {
        sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        polygon: '0x3b2e72e92540855d5f231bbf263fb5b043c5a1d0',
        bsc: '0x55d398326f99059ff775485246999027b3197955'
    };

    const usdtAbi = [
        {
            "constant": true,
            "inputs": [{ "name": "", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "", "type": "uint256" }],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                { "name": "recipient", "type": "address" },
                { "name": "amount", "type": "uint256" }
            ],
            "name": "transfer",
            "outputs": [{ "name": "", "type": "bool" }],
            "type": "function"
        }
    ];

    const tokenAbi = [
        {
            "constant": true,
            "inputs": [{ "name": "who", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "", "type": "uint256" }],
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{ "name": "", "type": "uint8" }],
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                { "name": "_to", "type": "address" },
                { "name": "_value", "type": "uint256" }
            ],
            "name": "transfer",
            "outputs": [{ "name": "", "type": "bool" }],
            "type": "function"
        }
    ];

    sendUsdcButton.addEventListener('click', async () => {
        if (!userAccount || !web3) {
            alert("Please connect your wallet first.");
            return;
        }

        const recipient = usdcRecipientInput.value.trim();
        const amount = usdcAmountInput.value.trim();
        const chainId = await web3.eth.getChainId();
        console.log(chainId);
        const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));

        if (!network || !usdcContractAddress[network.name.toLowerCase()]) {
            alert("USDC not supported on this network.");
            return;
        }

        const contract = new web3.eth.Contract(tokenAbi, usdcContractAddress[network.name.toLowerCase()]);
        const amountWei = web3.utils.toWei(amount, 6);

        try {
            await contract.methods.transfer(recipient, amountWei).send({ from: userAccount });
            alert("USDC transaction successful!");
            await fetchUsdcBalance();
        } catch (error) {
            console.error("USDC transaction failed:", error);
            console.log("USDC transaction failed: " + error.message);
        }
    });

    sendUsdtButton.addEventListener('click', async () => {
        if (!userAccount || !web3) {
            alert("Please connect your wallet first.");
            return;
        }

        const recipient = usdtRecipientInput.value.trim();
        const amount = usdtAmountInput.value.trim();
        const chainId = await web3.eth.getChainId();
        const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));

        if (!network || !usdtContractAddress[network.name.toLowerCase()]) {
            alert("USDT not supported on this network.");
            return;
        }

        const contract = new web3.eth.Contract(usdtAbi, usdtContractAddress[network.name.toLowerCase()]);
        const amountWei = web3.utils.toWei(amount, 6);

        try {
            await contract.methods.transfer(recipient, amountWei).send({ from: userAccount });
            alert("USDT transaction successful!");
            await fetchUsdtBalance();
        } catch (error) {
            console.error("USDT transaction failed:", error);
            alert("USDT transaction failed: " + error.message);
        }
    });


    async function saveTransaction(hash, sender, recipient, amount, network, token) {
        try {
            await fetch("http://localhost:5000/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hash, sender, recipient, amount, network, token })
            });
        } catch (error) {
            console.error("Error saving transaction:", error);
        }
    }






});
