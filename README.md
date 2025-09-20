# Mail818 SDK

Open-source email collection SDK for static websites. Part of the [Mail818](https://mail818.com) platform.

## 🔍 Transparency & Security

This SDK is **fully open source** for transparency and security. We believe users should be able to:
- Verify exactly what code runs on their websites
- Audit the SDK for security vulnerabilities
- Understand how their data is handled
- Contribute improvements and bug fixes

## 📦 Installation

### Option 1: CDN (Recommended)

Add this single line to your website:

```html
<script async mail818-id="YOUR_ORGANIZATION_KEY" src="https://cdn.mail818.com/collect.js"></script>
```

This automatically:
- Loads the SDK
- Finds all Mail818 forms on your page
- Handles email collection for your organization

### Option 2: NPM

```bash
npm install @mail818/sdk
# or
yarn add @mail818/sdk
```

```javascript
import { Mail818 } from '@mail818/sdk'

// Initialize with your configuration
Mail818.init({
  organizationKey: 'YOUR_ORGANIZATION_KEY'
})
```

## 🚀 Features

- **Lightweight**: ~7KB gzipped
- **No Dependencies**: Pure JavaScript, works everywhere
- **Privacy-First**: No tracking, no cookies, just email collection
- **Offline Support**: Queues submissions when offline
- **Flexible**: Works with any HTML form
- **Secure**: HTTPS only, rate limiting, CORS protection

## 📖 How It Works

1. **Loader Script** (`collect.js`):
   - Tiny 1KB script that loads on your page
   - Fetches configuration for your organization
   - Loads the main SDK

2. **Main SDK** (`mail818.min.js`):
   - Enhances forms with AJAX submission
   - Handles validation and error states
   - Manages offline queue
   - Provides success feedback

## 🔒 Security

### Data Handling
- Emails are sent directly to Mail818's API
- No data is stored locally (except offline queue)
- All submissions use HTTPS
- Rate limiting prevents abuse

### Content Security Policy
The SDK is CSP-friendly. Add to your CSP:
```
script-src https://cdn.mail818.com;
connect-src https://api.mail818.com;
```

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/mail818/mail818-sdk.git
cd mail818-sdk

# Install dependencies
yarn install

# Build the SDK
yarn build

# Run tests
yarn test
```

### File Structure

```
src/
├── loader.js       # Lightweight loader script
├── index.ts        # Main SDK entry point
├── form.ts         # Form enhancement logic
├── api-client.ts   # API communication
└── stats.ts        # Statistics display
```

## 🤝 Contributing

We welcome contributions! Security issues should be reported to security@mail818.com.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.mail818.com)
- [API Reference](https://api.mail818.com/docs)
- [Main Platform](https://mail818.com)
---

_This is a public mirror of the Mail818 SDK. The main development happens in a private repository._
