import React from 'react';
import { Handle, Position } from 'reactflow';
import { UserCircle } from 'lucide-react';
import type { Seller } from '../types';

interface SellerNodeProps {
  data: Seller;
}

export default function SellerNode({ data }: SellerNodeProps) {
  return (
    <div className={`px-4 py-2 shadow-lg rounded-lg bg-white border-2 transition-all duration-200 ${
      data.highlighted 
        ? 'border-green-500 shadow-green-200 scale-110' 
        : 'border-gray-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <div className="flex items-center gap-2">
        <UserCircle className={`w-8 h-8 ${
          data.highlighted ? 'text-green-500' : 'text-blue-500'
        }`} />
        <div>
          <h3 className="text-sm font-semibold">{data.name}</h3>
          {data.visible ? (
            <>
              <div className="text-xs text-gray-500">
                Sales: ${data.sales.toLocaleString()}
              </div>
              <div className="text-xs text-green-600">
                Commission: ${data.commission.toLocaleString()}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400 italic">
              Stats not visible
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}