import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native and model-loading packages stay outside the server bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
