export const initialSubscriptions = [
  {
    id: 'netflix',
    name: 'Netflix',
    amount: 24.99,
    billingCycle: 'Monthly',
    nextPaymentDate: '2026-09-01',
    status: 'Active',
    paymentHistory: [
      { id: 'n1', date: '2026-08-01', amount: 24.99 },
      { id: 'n2', date: '2026-07-01', amount: 24.99 },
      { id: 'n3', date: '2026-06-01', amount: 24.99 },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    amount: 14.99,
    billingCycle: 'Monthly',
    nextPaymentDate: '2026-09-05',
    status: 'Active',
    paymentHistory: [
      { id: 's1', date: '2026-08-05', amount: 14.99 },
      { id: 's2', date: '2026-07-05', amount: 14.99 },
    ],
  },
]