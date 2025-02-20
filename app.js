window.process = {
    env: {
        NODE_ENV: 'production'
    }
};

import { Web3Modal } from 'https://unpkg.com/@web3modal/html';


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
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];

            walletAddressDisplay.textContent = `Connected: ${userAccount}`;
            await fetchBalance();
            await fetchUsdtBalance();
            await fetchUsdcBalance();

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    userAccount = accounts[0];
                    walletAddressDisplay.textContent = `Connected: ${userAccount}`;
                    fetchBalance();
                    fetchUsdtBalance();
                    fetchUsdcBalance();
                } else {
                    userAccount = null;
                    walletAddressDisplay.textContent = 'Not Connected';
                    walletBalanceDisplay.textContent = 'Balance: 0';
                }
            });
        } catch (error) {
            console.error("Wallet connection error:", error);
            // alert(`Failed to connect wallet: ${error.message}`);
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
            console.log("Chain ID:", chainId);
            
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

    async function fetchTokenBalance(contractAddress, displayElement) {
        if (!userAccount || !web3) return;
        const chainId = await web3.eth.getChainId();
        const network = Object.values(networks).find(net => parseInt(net.chainId, 16) === parseInt(chainId));

        if (!network || !contractAddress[network.name.toLowerCase()]) {
            displayElement.textContent = 'Balance: N/A';
            return;
        }

        const contract = new web3.eth.Contract(tokenAbi, contractAddress[network.name.toLowerCase()]);

        console.log("Using contract at:", contractAddress[network.name.toLowerCase()]);
        console.log("Contract instance:", contract);

        try {
            const balance = await contract.methods.balanceOf(userAccount).call();
            console.log("Fetched balance:", balance);
            displayElement.textContent = `Balance: ${web3.utils.fromWei(balance, 6)}`;
        } catch (error) {
            console.error("Error fetching balance:", error);
            displayElement.textContent = 'Error fetching balance';
        }
    }

    async function fetchUsdtBalance() {
        console.log("usdt -->> ", usdtContractAddress);
        await fetchTokenBalance(usdtContractAddress, usdtBalanceDisplay);
    }

    async function fetchUsdcBalance() {
        console.log("usdc -->> ", usdcContractAddress);

        await fetchTokenBalance(usdcContractAddress, usdcBalanceDisplay);
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
            console.log("chainID:", parseInt(chain.chainId));
            const amountWei = web3.utils.toWei(amount, 'ether');
            console.log("Amount in wei:", typeof(amountWei));
            
            const transactionParameters = {
                to: recipient,
                from: userAccount,
                value: web3.utils.toHex(amountWei),
                chainId: chain.chainId,
            };

            transactionStatus.textContent = 'Initiating transaction...';

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });

            transactionStatus.textContent = `Transaction sent: ${txHash}`;
            console.log("Transaction Hash:", txHash);

            const checkTransaction = async () => {
                try {
                    const receipt = await web3.eth.getTransactionReceipt(txHash);
                    if (receipt) {
                        transactionStatus.textContent = receipt.status
                            ? 'Transaction confirmed!'
                            : 'Transaction failed!';
                        await fetchBalance();
                        return;
                    }
                    setTimeout(checkTransaction, 2000);
                } catch (error) {
                    console.error("Error checking transaction:", error);
                }
            };
            setTimeout(checkTransaction, 2000);

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


});
