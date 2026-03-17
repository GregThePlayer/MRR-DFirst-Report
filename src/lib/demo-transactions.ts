// Expanded demo data: raw transactions + full customer list
// Based on actual DFIRST.AI Stripe data patterns

export interface DemoTransaction {
  id: string
  date: string
  month: string
  email: string
  company: string
  amount: number
  plan: string
  status: 'succeeded' | 'failed' | 'refunded'
  source: 'stripe' | 'invoice'
  type: 'monthly' | 'annual' | 'one_time'
  isFirst: boolean
  invoiceNumber?: string
}

export interface DemoCustomerFull {
  id: string
  email: string
  company: string
  contact: string
  phone: string
  nip: string
  plan: string
  status: 'active' | 'churned' | 'trial'
  source: 'stripe' | 'invoice' | 'manual'
  firstPayment: string
  lastPayment: string
  totalRevenue: number
  transactions: number
  activeMonths: number
  tags: string[]
  monthlyData: Record<string, number> // month -> revenue
}

const PLANS = ['STARTER [1M]', 'Advanced [1m]', 'PRO [1M] / Team [1m]', 'ENTERPRISE [1M]', 'INNY', 'Vibe Marketing Academy', 'Starter [1y]']
const PLAN_PRICES: Record<string, number> = {
  'STARTER [1M]': 33, 'Advanced [1m]': 83, 'PRO [1M] / Team [1m]': 166, 'ENTERPRISE [1M]': 999,
  'INNY': 450, 'Vibe Marketing Academy': 225, 'Starter [1y]': 316,
}
const PLAN_TYPES: Record<string, 'monthly' | 'annual' | 'one_time'> = {
  'STARTER [1M]': 'monthly', 'Advanced [1m]': 'monthly', 'PRO [1M] / Team [1m]': 'monthly', 'ENTERPRISE [1M]': 'monthly',
  'INNY': 'annual', 'Vibe Marketing Academy': 'one_time', 'Starter [1y]': 'annual',
}

const COMPANIES = [
  'Digital Agency Pro', 'EUVIC', 'McCann Poland', 'ORT', 'StartupHQ', 'E-Commerce Hub',
  'Marketing Masters', 'Brand Studio', 'Social Ninja', 'Content Lab', 'DataDriven.pl',
  'Pixel Perfect', 'GrowthHack.io', 'AdVenture', 'MediaHouse', 'WebDev Studio',
  'CreativeMinds', 'SEO Wizards', 'Digital Nomads', 'Tech Solutions', 'Cloud9 Agency',
  'Viral Marketing', 'InboundPros', 'Conversion Kings', 'FunnelMasters', 'LeadGen Pro',
  'BrandForge', 'DesignThink', 'CodeCraft', 'AI Solutions PL', 'NeuraTech',
  'SmartAds', 'ClickBoost', 'ROI Masters', 'PPC Heroes', 'SocialPulse',
  'Influencer Hub', 'Video Factory', 'Audio Branding', 'Print Digital', 'EventPro',
  'TradeLink', 'ShopOptimize', 'CartGenius', 'ProductHunt PL', 'SaaS Metrics',
  'CRM Solutions', 'AutoPilot.io', 'ScaleUp PL', 'Venture Lab', 'Innovation Hub',
]

const CONTACTS = [
  'Marek Nowak', 'Anna Kowalska', 'Tomasz Wiśniewski', 'Katarzyna Lewandowska', 'Jan Kamiński',
  'Maria Zielińska', 'Krzysztof Szymański', 'Paweł Woźniak', 'Agnieszka Dąbrowska', 'Piotr Kozłowski',
  'Barbara Jankowska', 'Grzegorz Mazur', 'Ewa Krawczyk', 'Andrzej Piotrowski', 'Dorota Grabowska',
  'Michał Pawłowski', 'Monika Michalska', 'Rafał Zając', 'Joanna Król', 'Artur Wróbel',
  'Magdalena Stępień', 'Łukasz Adamczyk', 'Justyna Dudek', 'Marcin Pawlak', 'Karolina Sikora',
  'Sebastian Baran', 'Natalia Zawadzka', 'Robert Pietrzak', 'Aleksandra Szewczyk', 'Damian Górski',
  'Beata Rutkowska', 'Wojciech Michalak', 'Patrycja Jasińska', 'Kamil Walczak', 'Sylwia Stasiak',
  'Szymon Bąk', 'Weronika Chmielowska', 'Adrian Lis', 'Izabela Gajewska', 'Bartosz Mróz',
  'Teresa Kaczmarczyk', 'Dariusz Wieczorek', 'Marta Wasilewska', 'Przemysław Klimek', 'Alicja Kołodziej',
  'Filip Jaworski', 'Renata Sikorska', 'Jakub Błaszczyk', 'Olga Kwiatkowska', 'Konrad Sawicki',
]

// Deterministic pseudo-random
function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function generateTransactions(): DemoTransaction[] {
  const rng = seededRandom(42)
  const transactions: DemoTransaction[] = []
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  let id = 1

  // Generate ~50 customers with varying activity patterns
  for (let ci = 0; ci < 50; ci++) {
    const company = COMPANIES[ci]
    const email = `${CONTACTS[ci].toLowerCase().replace(/\s/g, '.').replace(/[ąćęłńóśźż]/g, c =>
      ({ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z'}[c] || c)
    )}@${company.toLowerCase().replace(/[\s.]/g, '').replace(/[^a-z0-9]/g, '')}.pl`

    const planIdx = Math.floor(rng() * PLANS.length)
    const plan = PLANS[planIdx]
    const price = PLAN_PRICES[plan] * (0.85 + rng() * 0.3) // some variance
    const startMonth = Math.floor(rng() * 3) // 0-2 = starts in Sep/Oct/Nov
    const endMonth = startMonth + 2 + Math.floor(rng() * (7 - startMonth - 2)) // at least 2 months
    const churns = rng() < 0.45 // 45% churn at some point

    let isFirst = true
    for (let mi = startMonth; mi < Math.min(endMonth, 7); mi++) {
      // Skip months randomly (churn/gap)
      if (mi > startMonth + 1 && churns && rng() < 0.3) continue

      const mo = months[mi]
      const day = 1 + Math.floor(rng() * 28)
      const date = `${mo}-${String(day).padStart(2, '0')}`

      // Sometimes payment fails
      const status = rng() < 0.12 ? 'failed' as const : 'succeeded' as const

      transactions.push({
        id: `tx_${String(id++).padStart(5, '0')}`,
        date,
        month: mo,
        email,
        company,
        amount: Math.round(price * 100) / 100,
        plan,
        status,
        source: rng() < 0.85 ? 'stripe' : 'invoice',
        type: PLAN_TYPES[plan],
        isFirst: isFirst && status === 'succeeded',
        invoiceNumber: rng() < 0.15 ? `FV ${String(Math.floor(rng() * 999)).padStart(5, '0')}/${mo.slice(5, 7)}/2025` : undefined,
      })
      if (status === 'succeeded') isFirst = false
    }
  }

  // Add some BF/annual one-time purchases in November
  for (let i = 0; i < 15; i++) {
    const ci = 50 - 15 + i
    if (ci < 0) continue
    const company = COMPANIES[ci % COMPANIES.length]
    const email = `bf.${i}@${company.toLowerCase().replace(/[\s.]/g, '')}.pl`
    transactions.push({
      id: `tx_${String(id++).padStart(5, '0')}`,
      date: `2025-11-${20 + Math.floor(rng() * 8)}`,
      month: '2025-11',
      email,
      company,
      amount: 300 + Math.round(rng() * 700),
      plan: 'INNY',
      status: 'succeeded',
      source: 'stripe',
      type: 'annual',
      isFirst: true,
    })
  }

  // Sort by date
  return transactions.sort((a, b) => a.date.localeCompare(b.date))
}

export const DEMO_TRANSACTIONS = generateTransactions()

// Build full customer list from transactions
function buildCustomers(): DemoCustomerFull[] {
  const custMap = new Map<string, DemoCustomerFull>()
  const rng = seededRandom(123)

  for (const tx of DEMO_TRANSACTIONS) {
    if (!custMap.has(tx.email)) {
      const ci = DEMO_TRANSACTIONS.filter(t => t.email === tx.email).length > 0 ?
        COMPANIES.indexOf(tx.company) : 0
      custMap.set(tx.email, {
        id: `cust_${custMap.size + 1}`,
        email: tx.email,
        company: tx.company,
        contact: CONTACTS[ci % CONTACTS.length] || 'Unknown',
        phone: `+48 ${500 + Math.floor(rng() * 499)} ${100 + Math.floor(rng() * 899)} ${100 + Math.floor(rng() * 899)}`,
        nip: `${Math.floor(1000000000 + rng() * 9000000000)}`,
        plan: tx.plan,
        status: 'active',
        source: tx.source,
        firstPayment: tx.date,
        lastPayment: tx.date,
        totalRevenue: 0,
        transactions: 0,
        activeMonths: 0,
        tags: [],
        monthlyData: {},
      })
    }
    const c = custMap.get(tx.email)!
    if (tx.status === 'succeeded') {
      c.totalRevenue += tx.amount
      c.transactions += 1
      c.lastPayment = tx.date > c.lastPayment ? tx.date : c.lastPayment
      c.monthlyData[tx.month] = (c.monthlyData[tx.month] || 0) + tx.amount
    }
    c.plan = tx.plan // latest plan
  }

  // Compute active months and status
  for (const c of custMap.values()) {
    c.activeMonths = Object.keys(c.monthlyData).length
    const lastMonth = c.lastPayment.slice(0, 7)
    c.status = lastMonth >= '2026-02' ? 'active' : 'churned'
    // Add tags
    if (c.totalRevenue > 1000) c.tags.push('high-value')
    if (c.plan.includes('ENTERPRISE') || c.plan === 'INNY') c.tags.push('enterprise')
    if (c.plan.includes('Academy') || c.plan.includes('Kurs')) c.tags.push('course')
    if (c.activeMonths >= 5) c.tags.push('loyal')
  }

  return Array.from(custMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export const DEMO_CUSTOMERS_FULL = buildCustomers()

// Monthly customer counts
export function getMonthlyCustomerCounts() {
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  return months.map(mo => {
    const active = new Set(DEMO_TRANSACTIONS.filter(t => t.month === mo && t.status === 'succeeded').map(t => t.email))
    const newCusts = DEMO_TRANSACTIONS.filter(t => t.month === mo && t.isFirst && t.status === 'succeeded')
    return {
      month: mo,
      label: mo.replace('2025-', 'Sep Oct Nov Dec'.split(' ')[parseInt(mo.slice(5)) - 9] ? '' : '').slice(0, 6),
      active: active.size,
      new: newCusts.length,
    }
  })
}
