export enum LedgerType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum LedgerSource {
  CLASS_PURCHASE = 'CLASS_PURCHASE',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum LedgerStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum WithdrawalStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
}