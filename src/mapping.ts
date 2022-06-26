import { BigInt } from "@graphprotocol/graph-ts"

import {
    Deposit,
    Withdraw,
    Borrow,
    Repay,
    ReserveUsedAsCollateralEnabled,
    ReserveUsedAsCollateralDisabled,
    LiquidationCall,
    Paused,
    Unpaused,
    ReserveDataUpdated
} from "../generated/LendingPool/LendingPool"
import {
    Deposit as DepositAction,
    Withdraw as WithdrawAction,
    Borrow as BorrowAction,
    Repay as RepayAction,
    UsageAsCollateral,
    LiquidationCall as LiquidationCallAction,
    KTokenBalanceHistoryItem,
    DTokenBalanceHistoryItem,
    Reserve,
    UserReserve,
    User
} from "../generated/schema"

export function handleDeposit(event: Deposit): void {
    let caller = event.params.user;
    let user = event.params.onBehalfOf;
    let poolReserve = getOrInitReserve(event.params.reserve, event);
    let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
    let depositedAmount = event.params.amount;
  
    let deposit = new DepositAction(getHistoryEntityId(event));
    deposit.pool = poolReserve.pool;
    deposit.user = userReserve.user;
    deposit.caller = getOrInitUser(caller).id;
    deposit.userReserve = userReserve.id;
    deposit.reserve = poolReserve.id;
    deposit.amount = depositedAmount;
    deposit.timestamp = event.block.timestamp.toI32();
    if (event.params.referral) {
        let referrer = getOrInitReferrer(event.params.referral);
        deposit.referrer = referrer.id;
    }
    deposit.save();
}