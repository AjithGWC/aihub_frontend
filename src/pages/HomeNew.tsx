import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { DashboardMeta } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Crown,
  TrendingUp,
  Package,
  CircleDollarSign,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  Search,
  CheckCircle2,
  Shield,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface CategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  gradient: string;
  accentColor: string;
  badgeBg: string;
  dashboards: string[];
  metrics: { label: string; value: string }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'executive',
    title: 'Executive Strategy & Decision Suite',
    subtitle: 'C-Suite Analytics & High-Level Insights',
    description:
      'Empowers executive leadership with real-time decision engines, AI-driven anomaly signals, and high-impact macro KPI health indicators across the enterprise.',
    icon: Crown,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dashboards: ['ceo-decision', 'exec-ai-alerts', 'monthly-performance-overview', 'sample-overview'],
    metrics: [
      { label: 'Strategic Focus', value: 'Macro Growth & Risk' },
      { label: 'Update Cycle', value: 'Real-Time / Streamed' },
      { label: 'Target Roles', value: 'CEO, COO, VP Strategy' },
    ],
  },
  {
    id: 'sales',
    title: 'Retail Sales & Operations Hub',
    subtitle: 'Revenue, Store Trends & Channel Performance',
    description:
      'In-depth sales velocity analysis, multi-store WoW/MoM/YoY trend tracking, store-level performance metrics, and regional revenue distribution.',
    icon: TrendingUp,
    gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    dashboards: ['sales-dashboard', 'retail-sales-explorer', 'store-performance-trends', 'sample-sales-analysis'],
    metrics: [
      { label: 'Primary Metrics', value: 'GMV, Units, WoW Growth' },
      { label: 'Granularity', value: 'Store / City / Category' },
      { label: 'Target Roles', value: 'Sales Director, Retail Ops' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Supply Chain Intelligence',
    subtitle: 'Stock Health, Buying & Supplier Analytics',
    description:
      'Comprehensive monitoring of inventory turnover, stockout risks, deadstock prevention, buying cycles, and vendor reliability metrics.',
    icon: Package,
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dashboards: ['inventory-analysis', 'inventory-health', 'buying-supplier'],
    metrics: [
      { label: 'Key Indicators', value: 'Sell-Through, Days of Supply' },
      { label: 'Vendor Optimization', value: 'Supplier Lead Time' },
      { label: 'Target Roles', value: 'Supply Chain Mgr, Buyer' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance, Margins & Merchandising',
    subtitle: 'Profitability, Margins & Product Performance',
    description:
      'Detailed profitability breakdown across categories, pricing strategies, gross margin optimization, and assortment performance.',
    icon: CircleDollarSign,
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent border-purple-500/30',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    dashboards: ['finance-margin', 'merchandising'],
    metrics: [
      { label: 'Financial Focus', value: 'Gross Margin %, Net Profit' },
      { label: 'Product Mix', value: 'Category Contribution' },
      { label: 'Target Roles', value: 'CFO, Merchandise Planner' },
    ],
  },
];

export default function HomeNew() {
  const { user } = useAuth();
  const { dashboards } = useOutletContext<{ dashboards: DashboardMeta[] }>();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categoryDataMap = useMemo(() => {
    const map: Record<string, DashboardMeta[]> = {};

    CATEGORIES.forEach((cat) => {
      map[cat.id] = [];
    });

    dashboards.forEach((d) => {
      let matched = false;
      for (const cat of CATEGORIES) {
        if (
          cat.dashboards.includes(d.id) ||
          cat.dashboards.includes(d.component.toLowerCase()) ||
          cat.dashboards.some((k) => d.id.toLowerCase().includes(k))
        ) {
          map[cat.id].push(d);
          matched = true;
          break;
        }
      }
      if (!matched) {
        map['sales'].push(d);
      }
    });

    return map;
  }, [dashboards]);

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const activeDashboards = categoryDataMap[activeCategory.id] || [];

  const filteredDashboards = useMemo(() => {
    if (!searchQuery.trim()) return activeDashboards;
    const q = searchQuery.toLowerCase();
    return activeDashboards.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
    );
  }, [activeDashboards, searchQuery]);

  return (
    <div className="min-h-[calc(100vh-3rem)] p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-10 border border-slate-800 shadow-2xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Sparkles className="size-3.5" />
              <span>Next-Gen Analytics Hub</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Welcome, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{user?.username}</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-2xl">
              Explore your business intelligence dashboards organized into specialized operational domains. Click any category below to inspect metrics and launch dashboards.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 backdrop-blur-md">
            <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Layers className="size-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{dashboards.length}</div>
              <div className="text-xs text-slate-400 font-medium">Active Dashboards</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Selection Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="size-5 text-indigo-500" />
            Business Domains & Categories
          </h2>
          <span className="text-xs text-muted-foreground">Select a category to view details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = cat.id === selectedCategory;
            const count = categoryDataMap[cat.id]?.length || 0;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative group text-left transition-all duration-300 rounded-xl p-5 border text-card-foreground ${
                  isSelected
                    ? `bg-slate-900/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500`
                    : `bg-card/60 hover:bg-card border-border/60 hover:border-border`
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-secondary text-muted-foreground group-hover:text-foreground'}`}>
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="outline" className={isSelected ? cat.badgeBg : 'bg-secondary/50'}>
                    {count} {count === 1 ? 'Dashboard' : 'Dashboards'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-indigo-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{cat.subtitle}</p>

                {isSelected && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Elaborate Category Detail View */}
      <div className="relative rounded-2xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-xl">
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${activeCategory.gradient}`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-indigo-500/10 ${activeCategory.accentColor} border border-indigo-500/20 mt-1`}>
              <activeCategory.icon className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">{activeCategory.title}</h2>
                <Badge variant="outline" className={activeCategory.badgeBg}>
                  Active Domain
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                {activeCategory.description}
              </p>
            </div>
          </div>

          <div className="relative min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 h-9"
            />
          </div>
        </div>

        {/* Domain Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
          {activeCategory.metrics.map((m, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background text-muted-foreground">
                {idx === 0 ? <Zap className="size-4 text-amber-400" /> : idx === 1 ? <Shield className="size-4 text-emerald-400" /> : <LayoutDashboard className="size-4 text-indigo-400" />}
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium">{m.label}</div>
                <div className="text-sm font-semibold text-foreground">{m.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Grid inside selected Category */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-2">
              <span>Available Dashboards</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">
                {filteredDashboards.length}
              </span>
            </h3>
          </div>

          {filteredDashboards.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-background/40">
              <LayoutDashboard className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground">No dashboards found in this category</p>
              <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or select another category above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDashboards.map((dash) => (
                <Card
                  key={dash.id}
                  className="group relative overflow-hidden border-border/60 hover:border-indigo-500/50 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                        Dashboard Plugin
                      </Badge>
                      <CheckCircle2 className="size-4 text-emerald-500 opacity-80" />
                    </div>
                    <CardTitle className="text-base font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                      {dash.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 leading-relaxed mt-1 text-muted-foreground">
                      {dash.description || 'Comprehensive operational analytics and tile streams.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                      <span>Plugin Component</span>
                      <span className="font-mono">{dash.component}</span>
                    </div>

                    <Button
                      onClick={() => navigate(`/dashboards/${dash.id}`)}
                      className="w-full gap-2 bg-slate-900 hover:bg-indigo-600 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all duration-200"
                    >
                      <span>Launch Dashboard</span>
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
