import withBundleAnalyzer from '@next/bundle-analyzer';
const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ['@svgr/webpack'],
        });
        return config;
    },
    async rewrites() {
        return [
          {
            source: '/socket.io/:path*',
            destination: '/api/seedlink',
          },
        ];
      },
};


export default bundleAnalyzer(nextConfig);
