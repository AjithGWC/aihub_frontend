import { lazy, LazyExoticComponent, ComponentType } from 'react';

/**
 * Plugin loader: every .tsx file in this folder is a dashboard plugin.
 * AI-generated dashboards are dropped here and referenced by their
 * `component` name in backend/data/dashboards.json — no core app changes needed.
 */
const modules = import.meta.glob('./*.tsx');

export function loadDashboard(component: string): LazyExoticComponent<ComponentType> | null {
  const loader = modules[`./${component}.tsx`];
  if (!loader) return null;
  return lazy(loader as () => Promise<{ default: ComponentType }>);
}
