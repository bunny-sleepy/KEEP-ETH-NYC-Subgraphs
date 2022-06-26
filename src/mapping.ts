import { BigInt } from "@graphprotocol/graph-ts"

import {
    Deposit,
    Withdraw,
    Borrow,
    Repay,
    Pool,
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
    UsageAsCollateral as UsageAsCollateralAction,
    LiquidationCall as LiquidationCallAction,
    KTokenBalanceHistoryItem,
    DTokenBalanceHistoryItem,
    Reserve,
    UserReserve,
    User
} from "../generated/schema"
import {
    getOrInitReserve,
    getOrInitUser,
    getOrInitUserReserve,
    getHistoryEntityId,
    getPoolByContract,
    calculateGrowth
} from "./helper"

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

    deposit.save();
}

export function handleWithdraw(event: Withdraw): void {
    let toUser = getOrInitUser(event.params.to);
    let poolReserve = getOrInitReserve(event.params.reserve, event);
    let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
    let redeemedAmount = event.params.amount;
  
    let withdraw = new WithdrawAction(getHistoryEntityId(event));
    withdraw.pool = poolReserve.pool;
    withdraw.user = userReserve.user;
    withdraw.to = toUser.id;
    withdraw.userReserve = userReserve.id;
    withdraw.reserve = poolReserve.id;
    withdraw.amount = redeemedAmount;
    withdraw.timestamp = event.block.timestamp.toI32();
    withdraw.save();
}

export const BORROW_MODE_STABLE = 'Stable';
export const BORROW_MODE_VARIABLE = 'Variable';
export const BORROW_MODE_NONE = 'None';

export function getBorrowRateMode(_mode: BigInt): string {
  let mode = _mode.toI32();
  if (mode == 0) {
    return BORROW_MODE_NONE;
  } else if (mode == 1) {
    return BORROW_MODE_STABLE;
  } else if (mode == 2) {
    return BORROW_MODE_VARIABLE;
  }
  throw new Error('invalid borrow rate mode');
}

export function handleBorrow(event: Borrow): void {
    let caller = event.params.user;
    let user = event.params.onBehalfOf;
    let userReserve = getOrInitUserReserve(user, event.params.reserve, event);
    let poolReserve = getOrInitReserve(event.params.reserve, event);
  
    let borrow = new BorrowAction(getHistoryEntityId(event));
    borrow.pool = poolReserve.pool;
    borrow.user = userReserve.user;
    borrow.caller = getOrInitUser(caller).id;
    borrow.userReserve = userReserve.id;
    borrow.reserve = poolReserve.id;
    borrow.amount = event.params.amount;
    borrow.variableTokenDebt = userReserve.scaledVariableDebt;
    borrow.borrowRate = event.params.borrowRate;
    borrow.borrowRateMode = getBorrowRateMode(event.params.borrowRateMode);
    borrow.timestamp = event.block.timestamp.toI32();

    borrow.save();
}

export function handlePaused(event: Paused): void {
    let poolId = getPoolByContract(event);
    let lendingPool = Pool.load(poolId);
    if (lendingPool) {
      lendingPool.paused = true;
      lendingPool.save();
    }
}

export function handleUnpaused(event: Unpaused): void {
    let poolId = getPoolByContract(event);
    let lendingPool = Pool.load(poolId);
  
    if (lendingPool) {
        lendingPool.paused = false;
        lendingPool.save();
    }
}

export function handleRepay(event: Repay): void {
    let repayer = getOrInitUser(event.params.repayer);
    let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
    let poolReserve = getOrInitReserve(event.params.reserve, event);
  
    poolReserve.save();
  
    let repay = new RepayAction(getHistoryEntityId(event));
    repay.pool = poolReserve.pool;
    repay.user = userReserve.user;
    repay.repayer = repayer.id;
    repay.userReserve = userReserve.id;
    repay.reserve = poolReserve.id;
    repay.amount = event.params.amount;
    repay.timestamp = event.block.timestamp.toI32();
    repay.save();
}

export function handleLiquidationCall(event: LiquidationCall): void {
    let user = getOrInitUser(event.params.user);
  
    let collateralPoolReserve = getOrInitReserve(event.params.collateralAsset, event);
    let collateralUserReserve = getOrInitUserReserve(
      event.params.user,
      event.params.collateralAsset,
      event
    );
    let liquidatedCollateralAmount = event.params.liquidatedCollateralAmount;
  
    collateralPoolReserve.lifetimeLiquidated = collateralPoolReserve.lifetimeLiquidated.plus(
      liquidatedCollateralAmount
    );
  
    collateralPoolReserve.save();
  
    let principalUserReserve = getOrInitUserReserve(event.params.user, event.params.debtAsset, event);
    let principalPoolReserve = getOrInitReserve(event.params.debtAsset, event);
  
    principalPoolReserve.save();
  
    let liquidationCall = new LiquidationCallAction(getHistoryEntityId(event));
    liquidationCall.pool = collateralPoolReserve.pool;
    liquidationCall.user = user.id;
    liquidationCall.collateralReserve = collateralPoolReserve.id;
    liquidationCall.collateralUserReserve = collateralUserReserve.id;
    liquidationCall.collateralAmount = liquidatedCollateralAmount;
    liquidationCall.principalReserve = principalPoolReserve.id;
    liquidationCall.principalUserReserve = principalUserReserve.id;
    liquidationCall.principalAmount = event.params.debtToCover;
    liquidationCall.liquidator = event.params.liquidator;
    liquidationCall.timestamp = event.block.timestamp.toI32();
    liquidationCall.save();
}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {
    let poolReserve = getOrInitReserve(event.params.reserve, event);
    let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
    let timestamp = event.block.timestamp.toI32();
  
    let usageAsCollateral = new UsageAsCollateralAction(getHistoryEntityId(event));
    usageAsCollateral.pool = poolReserve.pool;
    usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
    usageAsCollateral.toState = true;
    usageAsCollateral.user = userReserve.user;
    usageAsCollateral.userReserve = userReserve.id;
    usageAsCollateral.reserve = poolReserve.id;
    usageAsCollateral.timestamp = timestamp;
    usageAsCollateral.save();
  
    userReserve.lastUpdateTimestamp = timestamp;
    userReserve.usageAsCollateralEnabledOnUser = true;
    userReserve.save();
}


export function handleReserveUsedAsCollateralDisabled(
    event: ReserveUsedAsCollateralDisabled
  ): void {
    let poolReserve = getOrInitReserve(event.params.reserve, event);
    let userReserve = getOrInitUserReserve(event.params.user, event.params.reserve, event);
    let timestamp = event.block.timestamp.toI32();
  
    let usageAsCollateral = new UsageAsCollateralAction(getHistoryEntityId(event));
    usageAsCollateral.pool = poolReserve.pool;
    usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
    usageAsCollateral.toState = false;
    usageAsCollateral.user = userReserve.user;
    usageAsCollateral.userReserve = userReserve.id;
    usageAsCollateral.reserve = poolReserve.id;
    usageAsCollateral.timestamp = timestamp;
    usageAsCollateral.save();
  
    userReserve.lastUpdateTimestamp = timestamp;
    userReserve.usageAsCollateralEnabledOnUser = false;
    userReserve.save();
}

export function handleReserveDataUpdated(event: ReserveDataUpdated): void {
    let reserve = getOrInitReserve(event.params.reserve, event);
    reserve.stableBorrowRate = event.params.stableBorrowRate;
    reserve.variableBorrowRate = event.params.variableBorrowRate;
    reserve.variableBorrowIndex = event.params.variableBorrowIndex;
    let timestamp = event.block.timestamp;
    let prevTimestamp = BigInt.fromI32(reserve.lastUpdateTimestamp);
    if (timestamp.gt(prevTimestamp)) {
      let growth = calculateGrowth(
        reserve.totalATokenSupply,
        reserve.liquidityRate,
        prevTimestamp,
        timestamp
      );
      reserve.totalATokenSupply = reserve.totalATokenSupply.plus(growth);
      reserve.lifetimeDepositorsInterestEarned = reserve.lifetimeDepositorsInterestEarned.plus(
        growth
      );
    }
    reserve.liquidityRate = event.params.liquidityRate;
    reserve.liquidityIndex = event.params.liquidityIndex;
    reserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  
    reserve.save();
}