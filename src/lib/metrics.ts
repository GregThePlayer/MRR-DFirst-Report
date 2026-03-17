import type { Transaction, MarketingMetrics, MonthlyMetrics } from '@/types/database'

const PLN_USD = 0.25

export function computeMonthlyMetrics(
  transactions: Transaction[],
  marketing: MarketingMetrics[]
): MonthlyMetrics[] {
  const paid = transactions.filter(t => t.status === 'succeeded' && t.amount_usd > 0)
  const allTx = transactions

  // Get unique months sorted
  const monthSet = new Set(paid.map(t => t.month))
  const months = Array.from(monthSet).sort()
  if (months.length === 0) return []

  const marketingByMonth = new Map(marketing.map(m => [m.month, m]))

  // Per-month aggregates
  const mRev = new Map<string, number>()
  const mCusts = new Map<string, Set<string>>()
  const mNew = new Map<string, number>()
  const mTx = new Map<string, number>()
  const mAnnualRev = new Map<string, number>()
  const mMonthlyRev = new Map<string, number>()
  const mSucceeded = new Map<string, number>()
  const mFailed = new Map<string, number>()

  for (const mo of months) {
    mRev.set(mo, 0)
    mCusts.set(mo, new Set())
    mNew.set(mo, 0)
    mTx.set(mo, 0)
    mAnnualRev.set(mo, 0)
    mMonthlyRev.set(mo, 0)
    mSucceeded.set(mo, 0)
    mFailed.set(mo, 0)
  }

  for (const t of paid) {
    const mo = t.month
    if (!mRev.has(mo)) continue
    mRev.set(mo, (mRev.get(mo) || 0) + t.amount_usd)
    mCusts.get(mo)!.add(t.customer_id || t.source_id || '')
    mTx.set(mo, (mTx.get(mo) || 0) + 1)
    if (t.is_first_payment) mNew.set(mo, (mNew.get(mo) || 0) + 1)
    if (t.billing_type === 'annual' || t.billing_type === 'one_time') {
      mAnnualRev.set(mo, (mAnnualRev.get(mo) || 0) + t.amount_usd)
    } else {
      mMonthlyRev.set(mo, (mMonthlyRev.get(mo) || 0) + t.amount_usd)
    }
  }

  for (const t of allTx) {
    const mo = t.month
    if (t.status === 'succeeded') mSucceeded.set(mo, (mSucceeded.get(mo) || 0) + 1)
    if (t.status === 'failed') mFailed.set(mo, (mFailed.get(mo) || 0) + 1)
  }

  // Per-customer monthly spend
  const custMonthlySpend = new Map<string, Map<string, number>>()
  for (const t of paid) {
    const custId = t.customer_id || t.source_id || ''
    if (!custMonthlySpend.has(custId)) custMonthlySpend.set(custId, new Map())
    const cm = custMonthlySpend.get(custId)!
    cm.set(t.month, (cm.get(t.month) || 0) + t.amount_usd)
  }

  // Customer total LTV
  const custLtv = new Map<string, number>()
  for (const t of paid) {
    const custId = t.customer_id || t.source_id || ''
    custLtv.set(custId, (custLtv.get(custId) || 0) + t.amount_usd)
  }

  // Build monthly metrics
  const results: MonthlyMetrics[] = []
  let prevEndingMrr = 0

  for (let i = 0; i < months.length; i++) {
    const mo = months[i]
    const prevMo = i > 0 ? months[i - 1] : null
    const currCusts = mCusts.get(mo)!
    const prevCusts = prevMo ? mCusts.get(prevMo)! : new Set<string>()
    const rev = mRev.get(mo) || 0
    const newCount = mNew.get(mo) || 0
    const mk = marketingByMonth.get(mo)

    // Churn
    const retained = new Set([...currCusts].filter(c => prevCusts.has(c)))
    const churned = new Set([...prevCusts].filter(c => !currCusts.has(c)))
    const churnRate = prevCusts.size > 0 ? churned.size / prevCusts.size : 0
    const retentionRate = prevCusts.size > 0 ? retained.size / prevCusts.size : 0

    // MRR Waterfall
    let newMrr = 0, expansionMrr = 0, contractionMrr = 0, churnedMrr = 0, reactivationMrr = 0
    const allPrevMonths = new Set<string>()
    for (let j = 0; j < i - 1; j++) {
      const pmCusts = mCusts.get(months[j])
      if (pmCusts) pmCusts.forEach(c => allPrevMonths.add(c))
    }

    if (i === 0) {
      newMrr = rev
    } else {
      for (const custId of currCusts) {
        const spendNow = custMonthlySpend.get(custId)?.get(mo) || 0
        const spendPrev = custMonthlySpend.get(custId)?.get(prevMo!) || 0
        if (!prevCusts.has(custId)) {
          if (allPrevMonths.has(custId)) reactivationMrr += spendNow
          else newMrr += spendNow
        } else {
          if (spendNow > spendPrev) expansionMrr += (spendNow - spendPrev)
          else if (spendNow < spendPrev) contractionMrr += (spendPrev - spendNow)
        }
      }
      for (const custId of prevCusts) {
        if (!currCusts.has(custId)) {
          churnedMrr += custMonthlySpend.get(custId)?.get(prevMo!) || 0
        }
      }
    }

    const netNewMrr = newMrr + expansionMrr + reactivationMrr - contractionMrr - churnedMrr
    const endingMrr = prevEndingMrr + netNewMrr
    const mrrGrowth = prevEndingMrr > 0 ? (endingMrr - prevEndingMrr) / prevEndingMrr : 0

    // ARPU & LTV
    const arpu = currCusts.size > 0 ? rev / currCusts.size : 0
    const activeLtvs = [...currCusts].map(c => custLtv.get(c) || 0).sort((a, b) => a - b)
    const ltvAvg = activeLtvs.length > 0 ? activeLtvs.reduce((a, b) => a + b, 0) / activeLtvs.length : 0
    const ltvMedian = activeLtvs.length > 0 ? activeLtvs[Math.floor(activeLtvs.length / 2)] : 0

    // CAC
    const adSpend = mk ? (mk.ad_spend_pln || 0) * PLN_USD : 0
    const cac = newCount > 0 ? adSpend / newCount : 0
    const ltvCacRatio = cac > 0 ? ltvAvg / cac : 0
    const paybackMonths = arpu > 0 ? cac / arpu : 0

    // Payment health
    const succ = mSucceeded.get(mo) || 0
    const fail = mFailed.get(mo) || 0
    const failRate = (succ + fail) > 0 ? fail / (succ + fail) : 0

    // Revenue churn & NRR
    const beginningMrr = prevEndingMrr
    const revenueChurnRate = beginningMrr > 0 ? churnedMrr / beginningMrr : 0
    const nrr = beginningMrr > 0 ? (beginningMrr + expansionMrr - contractionMrr - churnedMrr) / beginningMrr : 0

    // Month label
    const [y, m] = mo.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const label = `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`

    results.push({
      month: mo,
      label,
      revenue: rev,
      customers: currCusts.size,
      newCustomers: newCount,
      churnedCustomers: churned.size,
      retainedCustomers: retained.size,
      churnRate,
      retentionRate,
      arpu,
      beginningMrr,
      newMrr,
      expansionMrr,
      reactivationMrr,
      contractionMrr,
      churnedMrr,
      netNewMrr,
      endingMrr,
      mrrGrowth,
      annualRevenue: mAnnualRev.get(mo) || 0,
      monthlyRevenue: mMonthlyRev.get(mo) || 0,
      ltvAvg,
      ltvMedian,
      cac,
      ltvCacRatio,
      paybackMonths,
      paymentFailureRate: failRate,
      revenueChurnRate,
      nrr,
    })

    prevEndingMrr = endingMrr
  }

  return results
}

export function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}
