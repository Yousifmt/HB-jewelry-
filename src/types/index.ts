import type { Timestamp } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  buyPriceBHD: number;
  sold: boolean;
  soldPriceBHD?: number;
  createdAt: Timestamp;
  soldAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface Sale {
  id: string;
  productId: string;
  buyPriceBHD: number;
  soldPriceBHD: number;
  profitBHD: number;
  soldAt: Timestamp;
}

export interface Owner {
  id: string;
  name: string; // ✅ اسم حر
  contributionBHD: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
