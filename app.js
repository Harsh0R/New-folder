window.process = {
    env: {
        NODE_ENV: 'production'
    }
};
import {
    EthereumClient,
    w3mConnectors,
    w3mProvider,
    WagmiCore,
    WagmiCoreChains,
    WagmiCoreConnectors
} from 'https://unpkg.com/@web3modal/ethereum'
import { Web3Modal } from 'https://unpkg.com/@web3modal/html'
import { parseEther } from 'https://esm.sh/viem'

document.addEventListener("DOMContentLoaded", async () => {
    const connectButton = document.getElementById('connectWallet');
    const walletAddressDisplay = document.getElementById('walletAddress');
    const walletBalanceDisplay = document.getElementById('walletBalance');
    const sendButton = document.getElementById('sendMatic');
    const recipientInput = document.getElementById('recipientAddress');
    const amountInput = document.getElementById('amount');
    const transactionStatus = document.getElementById('transactionStatus');

    let userAccount = null;
    let web3; // Declare Web3 instance

    // Connect Wallet & Fetch Balance
    connectButton.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask or Trust Wallet!");
            return;
        }

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum); // Initialize Web3 after provider is enabled
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];
            
            walletAddressDisplay.textContent = `Connected: ${userAccount}`;
            await fetchBalance();

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    userAccount = accounts[0];
                    walletAddressDisplay.textContent = `Connected: ${userAccount}`;
                    fetchBalance();
                } else {
                    userAccount = null;
                    walletAddressDisplay.textContent = 'Not Connected';
                    walletBalanceDisplay.textContent = 'Balance: 0 MATIC';
                }
            });

        } catch (error) {
            console.error("Wallet connection error:", error);
            alert(`Failed to connect wallet: ${error.message}`);
        }
    });

    // Fetch User Balance
    async function fetchBalance() {
        if (!userAccount || !web3) return;

        try {
            const balance = await web3.eth.getBalance(userAccount);
            const formattedBalance = web3.utils.fromWei(balance, "ether");
            walletBalanceDisplay.textContent = `Balance: ${formattedBalance} MATIC`;
        } catch (error) {
            console.error("Error fetching balance:", error);
            walletBalanceDisplay.textContent = 'Error fetching balance';
        }
    }

    // Send MATIC
    sendButton.addEventListener('click', async () => {
        if (!userAccount || !web3) {
            alert("Please connect your wallet first.");
            return;
        }

        const recipient = recipientInput.value.trim();
        const amount = amountInput.value.trim();

        if (!recipient || !amount) {
            alert("Please enter a valid recipient address and amount.");
            return;
        }

        if (!web3.utils.isAddress(recipient)) {
            alert("Invalid recipient address format.");
            return;
        }

        try {
            const amountWei = web3.utils.toWei(amount, 'ether');

            const transactionParameters = {
                to: recipient,
                from: userAccount,
                value: web3.utils.toHex(amountWei),
                chainId: '0x89', // Polygon Mainnet
            };

            transactionStatus.textContent = 'Initiating transaction...';

            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });

            transactionStatus.textContent = `Transaction sent: ${txHash}`;
            console.log("Transaction Hash:", txHash);

            // Check for confirmation
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
});
