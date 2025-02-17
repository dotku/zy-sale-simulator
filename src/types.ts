export interface Seller {
  id: string;
  name: string;
  sales: number;
  commission: number;
  parentId: string | null;
  highlighted: boolean;
  visible: boolean;
}

export interface Node {
  id: string;
  type: 'seller';
  position: { x: number; y: number };
  data: Seller;
}