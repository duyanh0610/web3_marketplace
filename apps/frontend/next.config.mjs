/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi/RainbowKit's WalletConnect + MetaMask SDK dependencies probe for
    // optional, non-web (React Native / Node-only) packages that don't exist
    // in a browser bundle; excluding them is the documented fix.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
