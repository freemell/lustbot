# 🤖 Lust Bot - Solana Wallet Analyzer

A powerful Telegram bot that provides comprehensive analysis of Solana wallet addresses. Built with Node.js and integrated with Solscan API for detailed wallet insights.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://telegram.org/)
[![Solana](https://img.shields.io/badge/Solana-Blockchain-purple.svg)](https://solana.com/)

## ✨ Features

- 🔍 **Comprehensive Wallet Analysis**: Get detailed information about any Solana wallet
- 💰 **Enhanced Balance Information**: SOL balance with USD value and token holdings
- 📊 **Advanced Transaction Data**: Transaction count, wallet age, activity level, and last activity
- 🪙 **Detailed Token Information**: List of tokens with tickers, names, USD values, and total portfolio value
- 🏦 **Staking Information**: Shows staked SOL amounts when available
- 📈 **Activity Analysis**: Determines wallet activity level (Very Low to Very High)
- ⏰ **Rate Limiting**: Built-in rate limiting to prevent API abuse
- 🔗 **Quick Actions**: Direct links to DM for jobs and view on Solscan
- 🛡️ **Error Handling**: Comprehensive error handling with specific error messages
- 🔄 **API Fallback**: Automatic fallback to Solana RPC if Solscan API fails
- 📡 **Data Source Indicator**: Shows which API was used for the data
- 🧭 **Smart Address Detection**: Ignores contracts/programs and reports only wallet addresses

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Bot Token**
   - The bot token is already configured in `config.js`
   - For production, consider using environment variables

3. **API Integration**
   - **Primary**: Solscan API for enhanced data (USD values, detailed token info)
   - **Fallback**: Solana RPC for basic wallet information
   - The bot automatically switches to fallback if Solscan API fails

4. **Start the Bot**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Usage

1. Start a conversation with your bot on Telegram
2. Send a message containing a Solana wallet address
3. The bot will automatically detect and analyze the wallet
4. Use the inline buttons to:
   - DM for job opportunities
   - View the wallet on Solscan

**Note:** The bot only responds when it detects a valid Solana wallet address in your message. Regular messages are ignored.

## Bot Commands

- `/start` - Welcome message and instructions
- `/help` - Help information
- Send any wallet address to get analysis

## Examples

**These messages will trigger the bot:**
- `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
- `Check this wallet: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
- `What about 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?`

**These messages will be ignored:**
- `Hello everyone!`
- `How are you?`
- `Good morning!`

The bot will respond with:
- SOL balance with USD value
- Token holdings with individual USD values
- Total token portfolio value
- Transaction count and activity level
- Wallet age and last activity time
- Staking information (if available)
- Account type (executable/non-executable)
- Quick action buttons for DM and Solscan

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/freemell/lustbot.git
   cd lustbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your bot**
   - Update `config.js` with your Telegram bot token
   - Add your Solscan API key (optional)

4. **Start the bot**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
lustbot/
├── bot.js              # Main bot application
├── config.js           # Configuration file
├── package.json        # Dependencies and scripts
├── test.js            # Address validation tests
├── test-api.js        # API integration tests
├── test-fallback.js   # Fallback API tests
├── start.bat          # Windows startup script
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## 🔧 Configuration

### Required
- **Telegram Bot Token**: Get from [@BotFather](https://t.me/botfather)

### Optional
- **Solscan API Key**: For enhanced data (USD values, detailed token info)

## 📊 API Integration

- **Primary**: Solscan API for enhanced data
- **Fallback**: Solana RPC for basic wallet information
- **Automatic**: Switches to fallback if Solscan API fails

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Milla**
- Telegram: [@millw14](https://t.me/millw14)
- GitHub: [@freemell](https://github.com/freemell)

## 🙏 Acknowledgments

- Solana Foundation for the amazing blockchain
- Solscan for providing comprehensive API
- Telegram for the bot platform
- Node.js community for excellent tools

---

⭐ **Star this repository if you found it helpful!**
