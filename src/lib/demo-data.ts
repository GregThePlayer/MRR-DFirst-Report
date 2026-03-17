// Demo data for development before Supabase is connected
// Based on actual DFIRST.AI Stripe data (Sep 2025 - Mar 2026)
import type { MonthlyMetrics } from '@/types/database'

export const DEMO_METRICS: MonthlyMetrics[] = [
  {
    month: '2025-09', label: 'Sep 25',
    revenue: 9498, customers: 119, newCustomers: 114, churnedCustomers: 0, retainedCustomers: 0,
    churnRate: 0, retentionRate: 0, arpu: 79.8,
    beginningMrr: 0, newMrr: 9498, expansionMrr: 0, reactivationMrr: 0,
    contractionMrr: 0, churnedMrr: 0, netNewMrr: 9498, endingMrr: 9498, mrrGrowth: 0,
    annualRevenue: 2890, monthlyRevenue: 6608, ltvAvg: 192, ltvMedian: 99, cac: 35, ltvCacRatio: 5.5, paybackMonths: 0.4,
    paymentFailureRate: 0.31, revenueChurnRate: 0, nrr: 0,
  },
  {
    month: '2025-10', label: 'Oct 25',
    revenue: 7789, customers: 96, newCustomers: 68, churnedCustomers: 66, retainedCustomers: 53,
    churnRate: 0.555, retentionRate: 0.445, arpu: 81.1,
    beginningMrr: 9498, newMrr: 4122, expansionMrr: 312, reactivationMrr: 0,
    contractionMrr: 156, churnedMrr: 5987, netNewMrr: -1709, endingMrr: 7789, mrrGrowth: -0.18,
    annualRevenue: 1200, monthlyRevenue: 6589, ltvAvg: 225, ltvMedian: 117, cac: 36, ltvCacRatio: 6.3, paybackMonths: 0.4,
    paymentFailureRate: 0.29, revenueChurnRate: 0.63, nrr: 0.37,
  },
  {
    month: '2025-11', label: 'Nov 25',
    revenue: 17822, customers: 104, newCustomers: 47, churnedCustomers: 48, retainedCustomers: 48,
    churnRate: 0.50, retentionRate: 0.50, arpu: 171.4,
    beginningMrr: 7789, newMrr: 12244, expansionMrr: 533, reactivationMrr: 456,
    contractionMrr: 112, churnedMrr: 3088, netNewMrr: 10033, endingMrr: 17822, mrrGrowth: 1.29,
    annualRevenue: 13400, monthlyRevenue: 4422, ltvAvg: 341, ltvMedian: 132, cac: 28, ltvCacRatio: 12.2, paybackMonths: 0.2,
    paymentFailureRate: 0.28, revenueChurnRate: 0.40, nrr: 0.60,
  },
  {
    month: '2025-12', label: 'Dec 25',
    revenue: 11433, customers: 88, newCustomers: 38, churnedCustomers: 56, retainedCustomers: 48,
    churnRate: 0.538, retentionRate: 0.462, arpu: 129.9,
    beginningMrr: 17822, newMrr: 3877, expansionMrr: 200, reactivationMrr: 323,
    contractionMrr: 189, churnedMrr: 10600, netNewMrr: -6389, endingMrr: 11433, mrrGrowth: -0.36,
    annualRevenue: 5600, monthlyRevenue: 5833, ltvAvg: 378, ltvMedian: 166, cac: 38, ltvCacRatio: 9.9, paybackMonths: 0.3,
    paymentFailureRate: 0.34, revenueChurnRate: 0.59, nrr: 0.41,
  },
  {
    month: '2026-01', label: 'Jan 26',
    revenue: 12988, customers: 101, newCustomers: 52, churnedCustomers: 43, retainedCustomers: 45,
    churnRate: 0.489, retentionRate: 0.511, arpu: 128.6,
    beginningMrr: 11433, newMrr: 5667, expansionMrr: 445, reactivationMrr: 889,
    contractionMrr: 234, churnedMrr: 5212, netNewMrr: 1555, endingMrr: 12988, mrrGrowth: 0.14,
    annualRevenue: 6200, monthlyRevenue: 6788, ltvAvg: 355, ltvMedian: 149, cac: 42, ltvCacRatio: 8.5, paybackMonths: 0.3,
    paymentFailureRate: 0.30, revenueChurnRate: 0.46, nrr: 0.54,
  },
  {
    month: '2026-02', label: 'Feb 26',
    revenue: 15344, customers: 137, newCustomers: 89, churnedCustomers: 57, retainedCustomers: 44,
    churnRate: 0.564, retentionRate: 0.436, arpu: 112.0,
    beginningMrr: 12988, newMrr: 8456, expansionMrr: 567, reactivationMrr: 1233,
    contractionMrr: 322, churnedMrr: 7578, netNewMrr: 2356, endingMrr: 15344, mrrGrowth: 0.18,
    annualRevenue: 5800, monthlyRevenue: 9544, ltvAvg: 298, ltvMedian: 112, cac: 60, ltvCacRatio: 5.0, paybackMonths: 0.5,
    paymentFailureRate: 0.33, revenueChurnRate: 0.58, nrr: 0.42,
  },
  {
    month: '2026-03', label: 'Mar 26*',
    revenue: 8240, customers: 75, newCustomers: 41, churnedCustomers: 112, retainedCustomers: 25,
    churnRate: 0.818, retentionRate: 0.182, arpu: 109.9,
    beginningMrr: 15344, newMrr: 3890, expansionMrr: 178, reactivationMrr: 522,
    contractionMrr: 145, churnedMrr: 11549, netNewMrr: -7104, endingMrr: 8240, mrrGrowth: -0.46,
    annualRevenue: 7909, monthlyRevenue: 331, ltvAvg: 412, ltvMedian: 166, cac: 67, ltvCacRatio: 6.1, paybackMonths: 0.6,
    paymentFailureRate: 0.35, revenueChurnRate: 0.75, nrr: 0.25,
  },
]

export const DEMO_CUSTOMERS = [
  { id: '1', email: 'mark***@agency.com', company_name: 'Digital Agency Pro', revenue: 2847, months: 7, plan: 'PRO / Team Monthly', status: 'active' },
  { id: '2', email: 'anna***@euvic.com', company_name: 'EUVIC', revenue: 2499, months: 5, plan: 'Enterprise Custom', status: 'active' },
  { id: '3', email: 'tom@***mccann.pl', company_name: 'McCann Poland', revenue: 1998, months: 6, plan: 'Advanced Monthly', status: 'active' },
  { id: '4', email: 'kate***@ort.pl', company_name: 'ORT', revenue: 1847, months: 5, plan: 'Enterprise Monthly', status: 'active' },
  { id: '5', email: 'jan.***@startup.io', company_name: 'StartupHQ', revenue: 1233, months: 4, plan: 'Advanced Monthly', status: 'churned' },
  { id: '6', email: 'mar***@ecom.pl', company_name: 'E-Commerce Hub', revenue: 998, months: 3, plan: 'Starter Monthly', status: 'active' },
  { id: '7', email: 'kry***@mkt.com', company_name: 'Marketing Masters', revenue: 899, months: 2, plan: 'Vibe Marketing Academy', status: 'active' },
  { id: '8', email: 'paw***@brand.pl', company_name: 'Brand Studio', revenue: 792, months: 3, plan: 'Advanced Monthly', status: 'active' },
]

export const DEMO_PRODUCTS = [
  { id: '1', name: 'Starter Monthly', category: 'subscription', billing_type: 'monthly', base_price_usd: 33, aliases: ['STARTER [1M]'], customers: 89, revenue: 12430 },
  { id: '2', name: 'Advanced Monthly', category: 'subscription', billing_type: 'monthly', base_price_usd: 83, aliases: ['Advanced [1m]'], customers: 45, revenue: 18740 },
  { id: '3', name: 'PRO / Team Monthly', category: 'subscription', billing_type: 'monthly', base_price_usd: 166, aliases: ['PRO [1M] / Team [1m]'], customers: 12, revenue: 9960 },
  { id: '4', name: 'Enterprise Monthly', category: 'subscription', billing_type: 'monthly', base_price_usd: 999, aliases: ['ENTERPRISE [1M]'], customers: 3, revenue: 5994 },
  { id: '5', name: 'Starter Annual', category: 'subscription', billing_type: 'annual', base_price_usd: 316, aliases: ['STARTER [1R]', 'Starter [1y]'], customers: 15, revenue: 4740 },
  { id: '6', name: 'Enterprise Custom / BF Deal', category: 'enterprise', billing_type: 'annual', base_price_usd: null, aliases: ['INNY'], customers: 28, revenue: 22500 },
  { id: '7', name: 'Vibe Marketing Academy', category: 'course', billing_type: 'one_time', base_price_usd: null, aliases: ['Vibe Marketing Academy - Strategia', 'Vibe Marketing Academy - Research', 'Vibe Marketing Academy - Kreacja', 'Vibe Marketing Academy - Cały Kurs'], customers: 35, revenue: 18500 },
]
