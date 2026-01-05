import type { NextConfig } from "next";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  experimental:{
    serverActions:{
      allowedOrigins:[
        'localhost:3000',
        '192.168.10.5',
      ],
    },

    
  }

};


export default nextConfig;
