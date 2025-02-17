import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  NodeTypes,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import SellerNode from './components/SellerNode';
import type { Node, Seller } from './types';

const nodeTypes: NodeTypes = {
  seller: SellerNode,
};

const initialSeller: Seller = {
  id: 'root',
  name: 'Root Seller',
  sales: 0,
  commission: 0,
  parentId: null,
  highlighted: false,
  visible: true,
};

const initialNodes: Node[] = [
  {
    id: initialSeller.id,
    type: 'seller',
    position: { x: 400, y: 100 },
    data: initialSeller,
  },
];

function App() {
  const [sellers, setSellers] = useState<Record<string, Seller>>({
    [initialSeller.id]: initialSeller,
  });
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [saleAmount, setSaleAmount] = useState<number>(1000);
  const [actingAs, setActingAs] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Edge | any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedSellerId(node.id);
    
    // Reset all highlights and highlight only the clicked node
    setSellers((currentSellers) => 
      Object.entries(currentSellers).reduce(
        (acc, [id, seller]) => ({
          ...acc,
          [id]: { 
            ...seller, 
            highlighted: id === node.id 
          },
        }),
        {}
      )
    );
  }, []);

  const addSeller = useCallback(() => {
    if (!selectedSellerId) {
      alert('Please select a parent seller first by clicking on their node');
      return;
    }

    const newSellerId = uuidv4();
    const parentNode = nodes.find(node => node.id === selectedSellerId);

    if (!parentNode) return;

    const newSeller: Seller = {
      id: newSellerId,
      name: `Seller ${Object.keys(sellers).length + 1}`,
      sales: 0,
      commission: 0,
      parentId: selectedSellerId,
      highlighted: false,
      visible: true,
    };

    // Add new seller to the sellers state
    setSellers((prev) => ({ ...prev, [newSellerId]: newSeller }));

    // Calculate position relative to parent
    const parentPos = parentNode.position;
    const siblingCount = edges.filter(edge => edge.source === selectedSellerId).length;
    const angle = (siblingCount * Math.PI) / 3; // Distribute children in a semi-circle
    const radius = 150; // Distance from parent
    
    const newPos = {
      x: parentPos.x + Math.cos(angle) * radius,
      y: parentPos.y + Math.sin(angle) * radius + 100,
    };

    // Add new node
    const newNode: Node = {
      id: newSellerId,
      type: 'seller',
      position: newPos,
      data: newSeller,
    };

    setNodes((nds) => [...nds, newNode]);

    // Add edge from parent to new seller
    setEdges((eds) => [
      ...eds,
      {
        id: `${selectedSellerId}-${newSellerId}`,
        source: selectedSellerId,
        target: newSellerId,
      },
    ]);
  }, [selectedSellerId, nodes, edges, sellers, setNodes, setEdges]);

  const simulateSale = useCallback(() => {
    if (!selectedSellerId) {
      alert('Please select a seller first by clicking on their node');
      return;
    }

    setSellers((currentSellers) => {
      // Reset all highlights first
      const resetSellers = Object.entries(currentSellers).reduce(
        (acc, [id, seller]) => ({
          ...acc,
          [id]: { ...seller, highlighted: false },
        }),
        {}
      );

      const updatedSellers = { ...resetSellers };

      const processCommission = (id: string, level: number = 0) => {
        const seller = updatedSellers[id];
        if (!seller) return;

        // Calculate commission based on level
        let commissionRate = 0;
        if (level === 0) commissionRate = 0.03; // 3% for current seller
        else if (level <= 2) commissionRate = 0.01; // 1% for parent and grandparent

        const commission = saleAmount * commissionRate;
        
        // Update seller's stats and highlight
        updatedSellers[id] = {
          ...seller,
          sales: seller.sales + (level === 0 ? saleAmount : 0),
          commission: seller.commission + commission,
          highlighted: true, // Highlight nodes involved in the sale
        };

        // Process parent's commission if exists and within 2 levels
        if (seller.parentId && level < 2) {
          processCommission(seller.parentId, level + 1);
        }
      };

      // Start commission calculation from the selected seller
      processCommission(selectedSellerId);

      // Clear highlights after 2 seconds
      setTimeout(() => {
        setSellers((current) =>
          Object.entries(current).reduce(
            (acc, [id, seller]) => ({
              ...acc,
              [id]: { ...seller, highlighted: false },
            }),
            {}
          )
        );
      }, 2000);

      return updatedSellers;
    });
  }, [selectedSellerId, saleAmount]);

  // Function to check if a seller is a descendant of the acting seller
  const isDescendantOf = useCallback((sellerId: string, ancestorId: string): boolean => {
    let current = sellers[sellerId];
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = sellers[current.parentId];
    }
    return false;
  }, [sellers]);

  // Get visible sellers based on who we're acting as
  const getVisibleSellers = useCallback(() => {
    if (!actingAs) return sellers;

    return Object.entries(sellers).reduce((acc, [id, seller]) => {
      // Include the seller we're acting as and their descendants
      if (id === actingAs || isDescendantOf(id, actingAs)) {
        return {
          ...acc,
          [id]: {
            ...seller,
            // Only show sales and commission for acting seller and direct descendants
            visible: id === actingAs || seller.parentId === actingAs,
          },
        };
      }
      // For all other sellers, mark as not visible
      return {
        ...acc,
        [id]: { ...seller, visible: false },
      };
    }, {});
  }, [sellers, actingAs, isDescendantOf]);

  // Update nodes whenever sellers state or actingAs changes
  React.useEffect(() => {
    const visibleSellers = getVisibleSellers();
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: visibleSellers[node.id],
      }))
    );
  }, [sellers, actingAs, getVisibleSellers, setNodes]);

  return (
    <div className="w-full h-screen">
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="flex items-center space-x-2 bg-white p-2 rounded shadow-md">
          <button
            onClick={addSeller}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!selectedSellerId}
          >
            Add Seller Under Selected
          </button>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={saleAmount}
              onChange={(e) => setSaleAmount(Math.max(0, Number(e.target.value)))}
              className="w-24 px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              min="0"
              step="100"
            />
            <button
              onClick={simulateSale}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!selectedSellerId}
            >
              Simulate Sale
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white p-2 rounded shadow-md">
          <span className="text-sm text-gray-600">Acting as:</span>
          <select
            value={actingAs || ''}
            onChange={(e) => setActingAs(e.target.value || null)}
            className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">View All</option>
            {Object.values(sellers).map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default App