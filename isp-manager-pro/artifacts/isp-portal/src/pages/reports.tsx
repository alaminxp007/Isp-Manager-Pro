import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const REPORT_LINKS = [
  { category: "Financial", links: ["Cash In Hand Statement", "Income Statement", "Expense", "Collection", "Collection Summary", "Due Bills", "Due Bill Summary", "Invoice (Due Bills)", "Revenue"] },
  { category: "Clients", links: ["Clients", "New Clients", "Deactivation Clients", "Client Ledger", "Clients Support"] },
  { category: "Reseller", links: ["Reseller Collection", "Mac Reseller Ledger"] },
  { category: "Store", links: ["Store (Instrument)", "Store (Cable)"] },
  { category: "Other", links: ["Others Collection", "Agent Ledger", "Vendor Ledger", "Loan Ledger", "BTRC Report"] },
];

const CHART_DATA = [
  { zone: "Zone A", bills: 450000, collections: 420000, discounts: 10000, dues: 20000 },
  { zone: "Zone B", bills: 520000, collections: 480000, discounts: 15000, dues: 25000 },
  { zone: "Zone C", bills: 280000, collections: 260000, discounts: 5000, dues: 15000 },
  { zone: "Zone D", bills: 600000, collections: 550000, discounts: 20000, dues: 30000 },
  { zone: "Zone E", bills: 320000, collections: 300000, discounts: 8000, dues: 12000 },
];

export default function Reports() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Left Column - Report Links */}
      <Card className="bg-white border-slate-200 lg:w-[28%] flex-shrink-0 flex flex-col h-[calc(100vh-8rem)]">
        <CardHeader className="pb-3 border-b border-slate-200">
          <CardTitle className="text-lg text-slate-900">Report Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {REPORT_LINKS.map((group, idx) => (
            <div key={group.category} className={idx !== 0 ? "border-t border-slate-100" : ""}>
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                {group.category}
              </div>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link}>
                    <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left group">
                      <span className="font-medium">{link}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Right Column - Chart */}
      <Card className="bg-white border-slate-200 lg:w-[72%] flex-shrink-0 flex flex-col h-[calc(100vh-8rem)]">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
          <CardTitle className="text-lg text-slate-900">Bills, Collections, Discounts & Dues (Zone Wise)</CardTitle>
          <Select defaultValue="current">
            <SelectTrigger className="w-[180px] bg-white border-slate-200 text-slate-800">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 text-slate-800">
              <SelectItem value="current" className="focus:bg-slate-100 focus:text-slate-900">Current Month</SelectItem>
              <SelectItem value="1" className="focus:bg-slate-100 focus:text-slate-900">Last Month</SelectItem>
              <SelectItem value="3" className="focus:bg-slate-100 focus:text-slate-900">Last 3 Months</SelectItem>
              <SelectItem value="6" className="focus:bg-slate-100 focus:text-slate-900">Last 6 Months</SelectItem>
              <SelectItem value="12" className="focus:bg-slate-100 focus:text-slate-900">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6 flex-1 min-h-0">
          <div className="w-full h-full min-h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="zone" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000)}k`} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="bills" name="Bills" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="collections" name="Collections" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="discounts" name="Discounts" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="dues" name="Dues" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
