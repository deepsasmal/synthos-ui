import { useState, useEffect } from "react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { ChatSidebar } from "../chat/ChatSidebar";
import { cn } from "@/src/lib/utils";

const tables = ["users", "orders", "products", "order_items"];

const mockData = {
  users: [
    { id: "550e8400-e29b-41d4-a716-446655440000", email: "alice@example.com", full_name: "Alice Smith", created_at: "2023-10-01T10:00:00Z", is_active: "true" },
    { id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", email: "bob@example.com", full_name: "Bob Jones", created_at: "2023-10-02T11:30:00Z", is_active: "true" },
    { id: "7c9e6679-7425-40de-944b-e07fc1f90ae7", email: "charlie@example.com", full_name: "Charlie Brown", created_at: "2023-10-03T09:15:00Z", is_active: "false" },
    { id: "8d123456-7890-1234-5678-123456789012", email: "diana@example.com", full_name: "Diana Prince", created_at: "2023-10-04T14:20:00Z", is_active: "true" },
    { id: "9e234567-8901-2345-6789-234567890123", email: "evan@example.com", full_name: "Evan Wright", created_at: "2023-10-05T16:45:00Z", is_active: "true" },
    { id: "a0345678-9012-3456-7890-345678901234", email: "fiona@example.com", full_name: "Fiona Gallagher", created_at: "2023-10-06T08:10:00Z", is_active: "false" },
    { id: "b1456789-0123-4567-8901-456789012345", email: "george@example.com", full_name: "George Costanza", created_at: "2023-10-07T12:05:00Z", is_active: "true" },
    { id: "c2567890-1234-5678-9012-567890123456", email: "hannah@example.com", full_name: "Hannah Abbott", created_at: "2023-10-08T15:30:00Z", is_active: "true" },
  ],
  orders: [
    { id: "o-1001", user_id: "550e8400-e29b-41d4...", status: "DELIVERED", total_amount: "129.99", created_at: "2023-10-10T10:00:00Z" },
    { id: "o-1002", user_id: "6ba7b810-9dad-11d1...", status: "SHIPPED", total_amount: "49.50", created_at: "2023-10-11T11:30:00Z" },
    { id: "o-1003", user_id: "550e8400-e29b-41d4...", status: "PENDING", total_amount: "299.00", created_at: "2023-10-12T09:15:00Z" },
    { id: "o-1004", user_id: "8d123456-7890-1234...", status: "DELIVERED", total_amount: "15.99", created_at: "2023-10-13T14:20:00Z" },
    { id: "o-1005", user_id: "9e234567-8901-2345...", status: "PENDING", total_amount: "89.95", created_at: "2023-10-14T16:45:00Z" },
    { id: "o-1006", user_id: "b1456789-0123-4567...", status: "SHIPPED", total_amount: "210.00", created_at: "2023-10-15T08:10:00Z" },
    { id: "o-1007", user_id: "c2567890-1234-5678...", status: "DELIVERED", total_amount: "34.50", created_at: "2023-10-16T12:05:00Z" },
    { id: "o-1008", user_id: "550e8400-e29b-41d4...", status: "PENDING", total_amount: "112.25", created_at: "2023-10-17T15:30:00Z" },
  ],
  products: [
    { id: "p-001", name: "Wireless Earbuds", category: "Electronics", price: "89.99", stock_qty: "150", sku: "WE-001" },
    { id: "p-002", name: "Coffee Maker", category: "Home", price: "129.50", stock_qty: "45", sku: "CM-002" },
    { id: "p-003", name: "Running Shoes", category: "Apparel", price: "110.00", stock_qty: "80", sku: "RS-003" },
    { id: "p-004", name: "Yoga Mat", category: "Fitness", price: "29.99", stock_qty: "200", sku: "YM-004" },
    { id: "p-005", name: "Desk Lamp", category: "Home", price: "45.00", stock_qty: "120", sku: "DL-005" },
    { id: "p-006", name: "Mechanical Keyboard", category: "Electronics", price: "159.99", stock_qty: "60", sku: "MK-006" },
    { id: "p-007", name: "Water Bottle", category: "Fitness", price: "18.50", stock_qty: "300", sku: "WB-007" },
    { id: "p-008", name: "Backpack", category: "Apparel", price: "65.00", stock_qty: "90", sku: "BP-008" },
  ],
  order_items: [
    { id: "oi-001", order_id: "o-1001", product_id: "p-002", quantity: "1", unit_price: "129.50" },
    { id: "oi-002", order_id: "o-1002", product_id: "p-004", quantity: "1", unit_price: "29.99" },
    { id: "oi-003", order_id: "o-1002", product_id: "p-007", quantity: "1", unit_price: "18.50" },
    { id: "oi-004", order_id: "o-1003", product_id: "p-006", quantity: "1", unit_price: "159.99" },
    { id: "oi-005", order_id: "o-1003", product_id: "p-001", quantity: "1", unit_price: "89.99" },
    { id: "oi-006", order_id: "o-1004", product_id: "p-007", quantity: "1", unit_price: "15.99" },
    { id: "oi-007", order_id: "o-1005", product_id: "p-001", quantity: "1", unit_price: "89.95" },
    { id: "oi-008", order_id: "o-1006", product_id: "p-003", quantity: "2", unit_price: "105.00" },
  ]
};

const chatMessages = [
  { role: "user" as const, content: "Generate 100 rows per table with realistic e-commerce data" },
  { role: "ai" as const, content: "Generated 400 rows across 4 tables. FK integrity maintained. Used Faker distributions for names/emails, realistic price ranges $10-$299.99, order dates within last 90 days." },
];

export function Step2Data({ onNext }: { onNext: () => void }) {
  const [activeTab, setActiveTab] = useState(tables[0]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isInitialLoading) return;
    const timer = setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeTab, isInitialLoading]);

  const currentData = mockData[activeTab as keyof typeof mockData];
  const columns = Object.keys(currentData[0]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Data Grid */}
      <div className="flex-1 flex flex-col bg-base overflow-hidden relative">
        {isInitialLoading && (
          <div className="absolute inset-0 z-50 bg-base flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-accent animate-spin mb-6" />
            <h2 className="font-display text-2xl font-semibold mb-2">Seed data generation in progress</h2>
            <p className="text-muted text-sm font-mono animate-pulse">Generating realistic mock data for your schema...</p>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex items-center border-b border-border px-4 pt-2">
          {tables.map(table => (
            <button
              key={table}
              onClick={() => {
                setActiveTab(table);
                setIsGenerating(true);
              }}
              className={cn(
                "px-4 py-2 text-sm font-mono transition-colors border-b-2",
                activeTab === table 
                  ? "border-accent text-[color:var(--text-color)]" 
                  : "border-transparent text-muted hover:text-[color:var(--text-color)]"
              )}
            >
              {table}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted font-mono bg-surface px-2 py-1 rounded">
              Showing 8 of 100 rows
            </span>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-lg border border-border overflow-hidden bg-surface">
            <table className="w-full text-left text-sm font-mono whitespace-nowrap">
              <thead className="bg-base border-b border-border">
                <tr>
                  {columns.map(col => {
                    const isFk = col.endsWith("_id");
                    return (
                      <th key={col} className="px-4 py-3 font-medium text-muted">
                        <div className="flex items-center gap-1.5">
                          {isFk && <LinkIcon className="h-3 w-3 text-blue-400" />}
                          {col}
                          <span className="text-[10px] text-muted/50 uppercase">
                            {col === "id" ? "UUID" : col.includes("price") || col.includes("amount") ? "DEC" : col.includes("qty") ? "INT" : "STR"}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border relative">
                {isGenerating && (
                  <tr className="absolute inset-0 bg-surface/80 backdrop-blur-sm z-10 flex items-center justify-center">
                    <td colSpan={columns.length} className="h-full w-full">
                      <div className="w-full h-full animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent bg-[length:200%_100%] animate-shimmer" />
                    </td>
                  </tr>
                )}
                {currentData.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-hover transition-colors">
                    {columns.map(col => {
                      const val = row[col as keyof typeof row];
                      const isFk = col.endsWith("_id");
                      const isStatus = col === "status";
                      
                      return (
                        <td key={col} className={cn(
                          "px-4 py-2.5 text-xs",
                          isFk ? "text-blue-400" : "text-[color:var(--text-color)]"
                        )}>
                          {isStatus ? (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
                              val === "DELIVERED" ? "bg-green-500/10 text-green-400" :
                              val === "SHIPPED" ? "bg-blue-500/10 text-blue-400" :
                              "bg-yellow-500/10 text-yellow-400"
                            )}>
                              {val}
                            </span>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-border bg-surface px-6 py-3 flex items-center gap-6 text-xs font-mono text-muted">
          <div>Total Rows: <span className="text-[color:var(--text-color)]">400</span></div>
          <div className="w-px h-3 bg-border" />
          <div>Tables: <span className="text-[color:var(--text-color)]">4</span></div>
          <div className="w-px h-3 bg-border" />
          <div>Relationships: <span className="text-[color:var(--text-color)]">3</span></div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <ChatSidebar 
        title="Generation Config"
        messages={chatMessages}
        disabled={isInitialLoading}
        configPanel={
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted">Row Count (per table)</label>
                <span className="font-mono text-xs">100</span>
              </div>
              <input type="range" min="10" max="1000" defaultValue="100" className="accent-accent" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Locale</label>
              <select className="bg-surface border border-border rounded px-2 py-1.5 text-[color:var(--text-color)] font-mono text-xs focus:outline-none focus:border-muted">
                <option>en_US</option>
                <option>en_GB</option>
                <option>fr_FR</option>
                <option>de_DE</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs text-muted">Seed Value</label>
                <input type="number" defaultValue="42" className="w-full bg-surface border border-border rounded px-2 py-1.5 text-[color:var(--text-color)] font-mono text-xs focus:outline-none focus:border-muted" />
              </div>
            </div>
          </div>
        }
        bottomAction={
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="w-full" disabled={isInitialLoading}>
              Regenerate Sample
            </Button>
            <Button variant="primary" className="w-full" onClick={onNext} disabled={isInitialLoading}>
              Looks good, continue &rarr;
            </Button>
          </div>
        }
      />
    </div>
  );
}
