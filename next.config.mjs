/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'puppeteer'],
    },
};

export default nextConfig;
