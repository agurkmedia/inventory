'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
  inventoryId: string;
  image: string | null;
  receiptItems: Array<{
    id: string;
    receiptId: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  }>;
}

interface ItemScraping {
  id: string;
  name: string;
  quantity: number;
  price: number | null;
  inventoryId: string;
  image: string | null;
  // ItemScraping doesn't have a direct relation to ReceiptItem
}

interface Inventory {
  id: string;
  name: string;
  items: Item[];
  itemScrapings: ItemScraping[];
}

interface ExpenseCategory {
  id: string;
  name: string;
  itemCount: number;
  totalCost: number;
  highlightedItemId?: string;
  items?: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    date: string;
    categoryId: string;
  }[];
}

function ItemCard({ item, onDelete, onViewCategory }: { item: Item, onDelete: (id: string) => void, onViewCategory: (categoryId: string, itemId: string) => void }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = () => {
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    onDelete(item.id);
    setShowConfirmDelete(false);
  };

  // Group categories to avoid duplicates
  const categories = Array.from(new Set(item.receiptItems.map(ri => ri.category.id))).map(categoryId => {
    return item.receiptItems.find(ri => ri.category.id === categoryId)?.category;
  }).filter(Boolean);

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md relative">
      <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-sm text-indigo-200 mb-1">Quantity: {item.quantity}</p>
      <p className="text-sm text-indigo-200 mb-1">Price: ${item.price.toFixed(2)}</p>
      <div className="text-sm text-indigo-200 mb-1">
        Categories: 
        {categories.map((category, index) => (
          <span key={category!.id} className="ml-1">
            {category!.name}
            {index < categories.length - 1 ? ',' : ''}
          </span>
        ))}
      </div>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image}`}
          alt={item.name}
          className="absolute top-2 right-2 w-12 h-12 object-cover rounded-full border-2 border-white"
        />
      )}
      <div className="flex justify-between items-center mt-2">
        <Link href={`/dashboard/items/${item.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          View Details
        </Link>
        {categories.map(category => (
          <button
            key={category!.id}
            onClick={() => onViewCategory(category!.id, item.id)}
            className="text-green-400 hover:text-green-300 text-sm"
          >
            View Category
          </button>
        ))}
        <Link href={`/dashboard/items/edit/${item.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
          Edit
        </Link>
        <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm">
          Delete
        </button>
      </div>
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-black mb-2">Are you sure you want to delete this item?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowConfirmDelete(false)} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmDelete} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemScrapingCard({ item, onDelete }: { item: ItemScraping, onDelete: (id: string) => void }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = () => {
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    onDelete(item.id);
    setShowConfirmDelete(false);
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md relative">
      <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
      <p className="text-sm text-indigo-200 mb-1">Quantity: {item.quantity}</p>
      <p className="text-sm text-indigo-200 mb-1">Price: ${item.price?.toFixed(2) || 'N/A'}</p>
      {item.image && (
        <img
          src={`data:image/jpeg;base64,${item.image}`}
          alt={item.name}
          className="absolute top-2 right-2 w-12 h-12 object-cover rounded-full border-2 border-white"
        />
      )}
      <div className="flex justify-between items-center mt-2">
        <Link href={`/dashboard/itemscrapings/${item.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          View Details
        </Link>
        <Link href={`/dashboard/itemscrapings/edit/${item.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
          Edit
        </Link>
        <button onClick={handleDelete} className="text-red-400 hover:text-red-300 text-sm">
          Delete
        </button>
      </div>
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-black mb-2">Are you sure you want to delete this item?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowConfirmDelete(false)} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmDelete} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewItemCard() {
  return (
    <Link href="/dashboard/items/new" className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-lg p-4 shadow-md flex items-center justify-center hover:bg-opacity-20 transition duration-150 ease-in-out">
      <span className="text-white text-lg">+ New Item</span>
    </Link>
  );
}

interface CategoryDetails {
  id: string;
  name: string;
  itemCount: number;
  totalCost: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    date: string;
    categoryId: string;
  }[];
}

export default function Items() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [displayMode, setDisplayMode] = useState<'all' | 'items' | 'scrapings'>('all');
  const [selectedInventories, setSelectedInventories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: session, status } = useSession();
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<CategoryDetails | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<{ name: string; price: number } | null>(null);
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>([]);
  const [itemCategoryChanges, setItemCategoryChanges] = useState<{[key: string]: string}>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInventories();
      fetchAllCategories();
    }
  }, [status]);

  const fetchInventories = async () => {
    try {
      const res = await fetch('/api/inventories-with-items');
      if (!res.ok) throw new Error('Failed to fetch inventories');
      const data = await res.json();
      setInventories(data);
      setSelectedInventories(data.map((inv: Inventory) => inv.id));
    } catch (err) {
      console.error('Failed to fetch inventories:', err);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setAllCategories(data);
    } catch (err) {
      console.error('Failed to fetch all categories:', err);
      setError('Failed to load all categories. Please try again.');
    }
  };

  const handleInventoryToggle = (inventoryId: string) => {
    setSelectedInventories(prev =>
      prev.includes(inventoryId)
        ? prev.filter(id => id !== inventoryId)
        : [...prev, inventoryId]
    );
  };

  const handleSelectAll = () => {
    setSelectedInventories(inventories.map(inv => inv.id));
  };

  const handleDeselectAll = () => {
    setSelectedInventories([]);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      fetchInventories(); // Refresh the items list
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleDeleteItemScraping = async (itemId: string) => {
    try {
      const res = await fetch(`/api/itemscrapings/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item scraping');
      fetchInventories(); // Refresh the items list
    } catch (err) {
      console.error('Failed to delete item scraping:', err);
    }
  };

  const handleViewCategory = async (categoryId: string, itemName: string, itemPrice: number) => {
    try {
      const res = await fetch(`/api/expense-categories/${categoryId}/details`);
      if (!res.ok) throw new Error('Failed to fetch category details');
      const details: CategoryDetails = await res.json();
      setSelectedCategoryDetails(details);
      setHighlightedItem({ name: itemName, price: itemPrice });
    } catch (error) {
      console.error('Error fetching category details:', error);
      setError('Failed to fetch category details. Please try again.');
    }
  };

  const handleCategoryChange = (itemId: string, newCategoryId: string) => {
    setItemCategoryChanges(prev => ({...prev, [itemId]: newCategoryId}));
  };

  const handleSaveCategoryChange = async (itemId: string) => {
    try {
      const newCategoryId = itemCategoryChanges[itemId];
      if (!newCategoryId) return;

      const res = await fetch(`/api/receipt-items/${itemId}/change-category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCategoryId }),
      });

      if (!res.ok) throw new Error('Failed to update item category');

      // Refresh the category details
      if (selectedCategoryDetails) {
        await handleViewCategory(selectedCategoryDetails.id, '', 0);
      }

      // Clear the change for this item
      setItemCategoryChanges(prev => {
        const newChanges = {...prev};
        delete newChanges[itemId];
        return newChanges;
      });

      setError('');
    } catch (err) {
      console.error('Failed to update item category:', err);
      setError('Failed to update item category. Please try again.');
    }
  };

  const filteredInventories = inventories.map(inventory => ({
    ...inventory,
    items: inventory.items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    itemScrapings: inventory.itemScrapings.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }));

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Items</h1>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded bg-white bg-opacity-10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-wrap space-x-4 mb-4">
        <button
          onClick={() => setDisplayMode('items')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'items' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show Items Only
        </button>
        <button
          onClick={() => setDisplayMode('scrapings')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'scrapings' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show ItemScrapings Only
        </button>
        <button
          onClick={() => setDisplayMode('all')}
          className={`px-4 py-2 rounded mb-2 ${displayMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-600 text-gray-200'}`}
        >
          Show Both
        </button>
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 rounded mb-2 bg-green-600 text-white"
        >
          Select All Inventories
        </button>
        <button
          onClick={handleDeselectAll}
          className="px-4 py-2 rounded mb-2 bg-red-600 text-white"
        >
          Deselect All Inventories
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {inventories.map(inventory => (
          <label key={inventory.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedInventories.includes(inventory.id)}
              onChange={() => handleInventoryToggle(inventory.id)}
              className="form-checkbox text-indigo-600"
            />
            <span className="text-white">{inventory.name}</span>
          </label>
        ))}
      </div>
      
      {filteredInventories.filter(inv => selectedInventories.includes(inv.id)).map(inventory => (
        <div key={inventory.id} className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">{inventory.name}</h2>
          
          {(displayMode === 'all' || displayMode === 'items') && inventory.items && inventory.items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Regular Items</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inventory.items.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onDelete={handleDeleteItem} 
                    onViewCategory={(categoryId) => handleViewCategory(categoryId, item.name, item.price)} 
                  />
                ))}
              </div>
            </div>
          )}

          {displayMode === 'all' && inventory.items && inventory.items.length > 0 && inventory.itemScrapings && inventory.itemScrapings.length > 0 && (
            <hr className="border-t border-indigo-300 my-4" />
          )}

          {(displayMode === 'all' || displayMode === 'scrapings') && inventory.itemScrapings && inventory.itemScrapings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Scraped Items</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inventory.itemScrapings.map(item => (
                  <ItemScrapingCard key={item.id} item={item} onDelete={handleDeleteItemScraping} />
                ))}
              </div>
            </div>
          )}

          {(!inventory.items || inventory.items.length === 0) && (!inventory.itemScrapings || inventory.itemScrapings.length === 0) && (
            <p className="text-white">No items in this inventory.</p>
          )}
        </div>
      ))}

      <NewItemCard />

      {/* Category Details Modal */}
      {selectedCategoryDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg w-11/12 max-w-6xl text-black max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{selectedCategoryDetails.name}</h2>
            <div className="flex justify-between mb-4">
              <p>Total Items: {selectedCategoryDetails.itemCount}</p>
              <p>Total Cost: {selectedCategoryDetails.totalCost.toFixed(2)} NOK</p>
            </div>
            <h3 className="text-xl font-semibold mt-4 mb-2">Items:</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-center p-2">Category</th>
                    <th className="text-center p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategoryDetails.items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border-b ${highlightedItem && item.name === highlightedItem.name && item.price === highlightedItem.price ? 'bg-green-100' : ''}`}
                    >
                      <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">{item.price.toFixed(2)} NOK</td>
                      <td className="text-center p-2">
                        <select
                          value={itemCategoryChanges[item.id] || item.categoryId}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                          className="border rounded p-1 text-sm w-full"
                        >
                          {allCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-center p-2">
                        {itemCategoryChanges[item.id] && (
                          <button
                            onClick={() => handleSaveCategoryChange(item.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                          >
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                setSelectedCategoryDetails(null);
                setHighlightedItem(null);
              }}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <style jsx global>{`
        @keyframes breathe {
          0%, 100% { background-color: rgba(0, 255, 0, 0.1); }
          50% { background-color: rgba(0, 255, 0, 0.2); }
        }
        .highlight-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}