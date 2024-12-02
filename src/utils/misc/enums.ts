/**
 * these statuses are used in different crons;
 * for example pending_anchor with type=deposit in transaction tables processes asset tokenization and adding trust
 */
export enum PaymentStatusEnum {
  incomplete = 'incomplete',
  canceled = 'canceled',
  pending_user_transfer_start = 'pending_user_transfer_start',
  pending_deposit = 'pending_deposit',
  on_hold = 'on_hold',
  pending_external = 'pending_external',
  pending_anchor = 'pending_anchor',
  pending_anchor_trust_start = 'pending_anchor_trust_start',
  pending_anchor_transfer_start = 'pending_anchor_transfer_start',
  anchor_started_withdraw = 'anchor_started_withdraw',
  pending_user = 'pending_user',
  pending_trust = 'pending_trust',
  completed = 'completed',
  disputed = 'disputed',
  too_small = 'too_small',
  too_large = 'too_large',
  no_market = 'no_market',
  pending_refund = 'pending_refund',
  error = 'error',
  duplicate = 'duplicate',
  initialize_fee_account_update = 'initialize_fee_account_update', // used when user changes the fee account
  fee_account_updated = 'fee_account_updated', //used when funds from fee transfer are transferred
  transaction_under_review = 'transaction_under_review',
  pending_withdraw_token = 'pending_withdraw_token',
}

export enum memoTypeEnum {
  id = 'id',
  text = 'text',
  hash = 'hash',
}

export enum paymentTypeEnum {
  deposit = 'deposit',
  withdraw = 'withdraw',
  feeAccountChanged = 'feeAccountChanged',
  staking = 'staking',
}

export enum stackingTypeEnum {
  year = 'year',
  month = 'month',
}

export enum stackingCoinEnum {
  XRP = 'XRP',
  BisonArmy = 'BisonArmy',
}

export enum UserRoleEnum {
  user = 'user',
  admin = 'admin',
}

export enum TransactionType {
  deposit = 'deposit',
  withdraw = 'withdraw',
  trade = 'trade',
  feeAccountChanged = 'feeAccountChanged',
  staking = 'staking',
}

export enum KycStatus {
  init = 'init',
  inprogress = 'inprogress',
  approved = 'approved',
  rejected = 'rejected',
}

export enum rolesTypeEnum {
  user = 'user',
  guest = 'guest',
  admin = 'superadmin',
  subadmin = 'subadmin',
}

export enum adminRolesEnum {
  admin = 'superadmin',
  subadmin = 'subadmin',
}

export enum jwtTypeEnum {
  login = 'login',
  forgetPassword = 'forgetPassword',
  emailVerify = 'emailVerify',
  signup = 'signup',
}

export enum tokenLaunchTypeEnum {
  stealth = 'stealth',
  whitelist = 'whitelist',
}
