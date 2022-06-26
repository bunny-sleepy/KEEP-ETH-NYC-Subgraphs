import { ethereum, BigInt, BigDecimal, Bytes, ByteArray, crypto, log } from '@graphprotocol/graph-ts';
import {
  KToken,
  DToken,
  Reserve,
  User,
  UserReserve,
  ReserveParamsHistoryItem,
  ReserveConfigurationHistoryItem,
  ContractToPoolMapping
} from '../../generated/schema';

export function getHistoryEntityId(event: ethereum.Event): string {
    return (
      event.block.number.toString() +
      ':' +
      event.transaction.index.toString() +
      ':' +
      event.transaction.hash.toHexString() +
      ':' +
      event.logIndex.toString() +
      ':' +
      event.transactionLogIndex.toString()
    );
  }
  
  export function getReserveId(underlyingAsset: Bytes, poolId: string): string {
    return underlyingAsset.toHexString() + poolId;
  }
  
  export function getUserReserveId(
    userAddress: Bytes,
    underlyingAssetAddress: Bytes,
    poolId: string
  ): string {
    return userAddress.toHexString() + underlyingAssetAddress.toHexString() + poolId;
  }
  
  export function getAtokenId(kTokenAddress: Bytes): string {
    return kTokenAddress.toHexString();
  }
  

export function zeroBD(): BigDecimal {
  return BigDecimal.fromString('0');
}

export function zeroBI(): BigInt {
  return BigInt.fromI32(0);
}

export function zeroAddress(): Bytes {
  return Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
}

// @ts-ignore
export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString('1');
  let bd10 = BigDecimal.fromString('10');
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(bd10);
  }
  return bd;
}

// @ts-ignore
export function exponentToBigInt(decimals: i32): BigInt {
  let bi = BigInt.fromI32(1);
  let bi10 = BigInt.fromI32(10);
  for (let i = 0; i < decimals; i++) {
    bi = bi.times(bi10);
  }
  return bi;
}
// @ts-ignore
export function convertTokenAmountToDecimals(amount: BigInt, decimals: i32): BigDecimal {
  return amount.toBigDecimal().div(exponentToBigDecimal(decimals));
}

export function convertValueFromRay(value: BigInt): BigDecimal {
  return convertTokenAmountToDecimals(value, 27);
}

export function format18(price: BigInt): BigInt {
  // IF the price is 0
  if (price == BigInt.fromI32(0)) return price;
  return exponentToBigInt(18).div(price);
}

export function formatUsdEthChainlinkPrice(price: BigInt): BigInt {
  // IF the price is 0
  if (price == BigInt.fromI32(0)) return price;
  return exponentToBigInt(18 + 8).div(price);
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

export function getPoolByContract(event: ethereum.Event): string {
    let contractAddress = event.address.toHexString();
    let contractToPoolMapping = ContractToPoolMapping.load(contractAddress);
    if (contractToPoolMapping === null) {
      throw new Error(contractAddress + 'is not registered in ContractToPoolMapping');
    }
    return contractToPoolMapping.pool;
}

export function getBorrowRateModeFromString(_mode: string): BigInt {
  if (_mode == BORROW_MODE_NONE) {
    return zeroBI();
  } else if (_mode == BORROW_MODE_STABLE) {
    return BigInt.fromI32(1);
  } else if (_mode == BORROW_MODE_VARIABLE) {
    return BigInt.fromI32(2);
  }
  throw new Error('invalid borrow rate mode');
}

export const PRICE_ORACLE_ASSET_TYPE_SIMPLE = 'Simple';
export const PRICE_ORACLE_ASSET_TYPE_COMPOSITE = 'Composite';

export function getPriceOracleAssetType(_type: BigInt): string {
  let type = _type.toI32();

  if (type == 1) {
    return PRICE_ORACLE_ASSET_TYPE_SIMPLE;
  } else if (type == 2) {
    return PRICE_ORACLE_ASSET_TYPE_COMPOSITE;
  }
  throw new Error('invalid price oracle asset type');
}

export const PRICE_ORACLE_ASSET_PLATFORM_SIMPLE = 'Simple';
export const PRICE_ORACLE_ASSET_PLATFORM_UNISWAP = 'Uniswap';
export const PRICE_ORACLE_ASSET_PLATFORM_BALANCER = 'Balancer';
export const PRICE_ORACLE_ASSET_PLATFORM_GELATO = 'Gelato';
export const PRICE_ORACLE_ASSET_PLATFORM_ERROR = 'Error';

export function getPriceOracleAssetPlatform(_type: BigInt): string {
  let type = _type.toI32();

  if (type == 1) {
    return PRICE_ORACLE_ASSET_PLATFORM_SIMPLE;
  } else if (type == 2) {
    return PRICE_ORACLE_ASSET_PLATFORM_UNISWAP;
  } else if (type == 3) {
    return PRICE_ORACLE_ASSET_PLATFORM_BALANCER;
  } else if (type == 4) {
    return PRICE_ORACLE_ASSET_PLATFORM_GELATO;
  } else {
    // other untraked types:
    log.error('This type is not tracked:: {}', [type.toString()]);
    return PRICE_ORACLE_ASSET_PLATFORM_ERROR;
  }
  // throw new Error('invalid price oracle asset platform');
}

// Helper for concatenating two byte arrays
export function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i];
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j];
  }

  let bytes = Bytes.fromUint8Array(out);
  let hex = bytes.toHexString();
  return ByteArray.fromHexString(hex);
}

const Zeros = new ByteArray(32);
Zeros.fill(0);

export function namehash(partition: Array<string>): string {
  let result: ByteArray = Zeros;
  while (partition.length > 0) {
    let data = partition[partition.length - 1];
    let label = ByteArray.fromUTF8(data);

    result = crypto.keccak256(concat(result, crypto.keccak256(label)));

    partition.pop();
  }

  return result.toHexString();
}

export function convertToLowerCase(str: string): string {
  // create a result variable
  let result = '';

  for (let i = 0; i < str.length; i++) {
    // get the code of the current character
    let code = str.charCodeAt(i);

    // check if it's within the range of capital letters
    if (code > 64 && code < 91) {
      // if so, add a new character to the result string
      // of the character from our code, plus 32
      result += String.fromCharCode(code + 32);
    } else {
      // otherwise, just add the current character
      result += str.charAt(i);
    }
  }

  // return the result
  return result;
}

export function generateSymbol(description: string): string {
  let symbolArr = description.split(' / ');
  return convertToLowerCase(symbolArr[0] + '-' + symbolArr[1]);
}

export function getOrInitUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  if (!user) {
    user = new User(address.toHexString());
    user.borrowedReservesCount = 0;
    user.save();
  }
  return user as User;
}

function initUserReserve(
  underlyingAssetAddress: Bytes,
  userAddress: Bytes,
  poolId: string,
  reserveId: string
): UserReserve {
  let userReserveId = getUserReserveId(userAddress, underlyingAssetAddress, poolId);
  let userReserve = UserReserve.load(userReserveId);
  if (userReserve === null) {
    userReserve = new UserReserve(userReserveId);
    userReserve.pool = poolId;
    userReserve.usageAsCollateralEnabledOnUser = false;
    userReserve.scaledATokenBalance = zeroBI();
    userReserve.scaledVariableDebt = zeroBI();
    userReserve.principalStableDebt = zeroBI();
    userReserve.currentKTokenBalance = zeroBI();
    userReserve.currentVariableDebt = zeroBI();
    userReserve.currentTotalDebt = zeroBI();
    userReserve.variableBorrowIndex = zeroBI();
    userReserve.lastUpdateTimestamp = 0;
    userReserve.liquidityRate = zeroBI();

    // incentives
    userReserve.kTokenincentivesUserIndex = zeroBI();
    userReserve.dTokenincentivesUserIndex = zeroBI();

    let user = getOrInitUser(userAddress);
    userReserve.user = user.id;

    userReserve.reserve = reserveId;
  }
  return userReserve as UserReserve;
}

export function getOrInitUserReserveWithIds(
  userAddress: Bytes,
  underlyingAssetAddress: Bytes,
  pool: string
): UserReserve {
  let reserveId = getReserveId(underlyingAssetAddress, pool);
  return initUserReserve(underlyingAssetAddress, userAddress, pool, reserveId);
}

export function getOrInitReserve(underlyingAsset: Bytes, event: ethereum.Event): Reserve {
  let poolId = getPoolByContract(event);
  let reserveId = getReserveId(underlyingAsset, poolId);
  let reserve = Reserve.load(reserveId);

  if (reserve === null) {
    reserve = new Reserve(reserveId);
    reserve.underlyingAsset = underlyingAsset;
    reserve.pool = poolId;
    reserve.symbol = '';
    reserve.name = '';
    reserve.decimals = 0;
    reserve.usageAsCollateralEnabled = false;
    reserve.borrowingEnabled = false;
    reserve.isActive = false;
    reserve.isFrozen = false;
    reserve.baseLTVasCollateral = zeroBI();
    reserve.reserveLiquidationThreshold = zeroBI();
    reserve.reserveLiquidationBonus = zeroBI();
    reserve.reserveInterestRateStrategy = new Bytes(1);
    reserve.baseVariableBorrowRate = zeroBI();
    reserve.optimalUtilisationRate = zeroBI();
    reserve.variableRateSlope1 = zeroBI();
    reserve.variableRateSlope2 = zeroBI();
    reserve.utilizationRate = zeroBD();
    reserve.totalLiquidity = zeroBI();
    reserve.totalKTokenSupply = zeroBI();
    reserve.totalLiquidityAsCollateral = zeroBI();
    reserve.availableLiquidity = zeroBI();
    reserve.liquidityRate = zeroBI();
    reserve.variableBorrowRate = zeroBI();
    reserve.liquidityIndex = zeroBI();
    reserve.variableBorrowIndex = zeroBI();
    reserve.reserveFactor = zeroBI(); // TODO: is default 0?
    reserve.kToken = zeroAddress().toHexString();
    reserve.dToken = zeroAddress().toHexString();

    reserve.totalScaledVariableDebt = zeroBI();
    reserve.totalCurrentVariableDebt = zeroBI();
    reserve.totalDeposits = zeroBI();

    reserve.lifetimeScaledVariableDebt = zeroBI();
    reserve.lifetimeCurrentVariableDebt = zeroBI();

    reserve.lifetimeLiquidity = zeroBI();
    reserve.lifetimeBorrows = zeroBI();
    reserve.lifetimeRepayments = zeroBI();
    reserve.lifetimeWithdrawals = zeroBI();
    reserve.lifetimeLiquidated = zeroBI();

    reserve.lastUpdateTimestamp = 0;

    reserve.lifetimeReserveFactorAccrued = zeroBI();
    reserve.lifetimeDepositorsInterestEarned = zeroBI();
  }
  return reserve as Reserve;
}

export function getOrInitUserReserve(
  _user: Bytes,
  _underlyingAsset: Bytes,
  event: ethereum.Event
): UserReserve {
  let poolId = getPoolByContract(event);
  let reserve = getOrInitReserve(_underlyingAsset, event);
  return initUserReserve(_underlyingAsset, _user, poolId, reserve.id);
}

export function getOrInitDToken(dTokenAddress: Bytes): DToken {
  let dTokenId = getAtokenId(dTokenAddress);
  let dToken = DToken.load(dTokenId);
  if (!dToken) {
    dToken = new DToken(dTokenId);
    dToken.underlyingAssetAddress = new Bytes(1);
    dToken.pool = '';
    dToken.underlyingAssetDecimals = 18;
  }
  return dToken as DToken;
}

export function getOrInitKToken(kTokenAddress: Bytes): KToken {
  let kTokenId = getAtokenId(kTokenAddress);
  let kToken = KToken.load(kTokenId);
  if (!kToken) {
    kToken = new KToken(kTokenId);
    kToken.underlyingAssetAddress = new Bytes(1);
    kToken.pool = '';
    kToken.underlyingAssetDecimals = 18;
  }
  return kToken as KToken;
}

export function getOrInitReserveParamsHistoryItem(
  id: Bytes,
  reserve: Reserve
): ReserveParamsHistoryItem {
  let itemId = id.toHexString() + reserve.id;
  let reserveParamsHistoryItem = ReserveParamsHistoryItem.load(itemId);
  if (!reserveParamsHistoryItem) {
    reserveParamsHistoryItem = new ReserveParamsHistoryItem(itemId);
    reserveParamsHistoryItem.variableBorrowRate = zeroBI();
    reserveParamsHistoryItem.variableBorrowIndex = zeroBI();
    reserveParamsHistoryItem.utilizationRate = zeroBD();
    reserveParamsHistoryItem.liquidityIndex = zeroBI();
    reserveParamsHistoryItem.liquidityRate = zeroBI();
    reserveParamsHistoryItem.totalLiquidity = zeroBI();
    reserveParamsHistoryItem.totalKTokenSupply = zeroBI();
    reserveParamsHistoryItem.availableLiquidity = zeroBI();
    reserveParamsHistoryItem.totalLiquidityAsCollateral = zeroBI();
    reserveParamsHistoryItem.priceInEth = zeroBI();
    reserveParamsHistoryItem.priceInUsd = zeroBD();
    reserveParamsHistoryItem.reserve = reserve.id;
    reserveParamsHistoryItem.totalScaledVariableDebt = zeroBI();
    reserveParamsHistoryItem.totalCurrentVariableDebt = zeroBI();

    reserveParamsHistoryItem.lifetimeScaledVariableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimeCurrentVariableDebt = zeroBI();
    reserveParamsHistoryItem.lifetimeLiquidity = zeroBI();
    reserveParamsHistoryItem.lifetimeBorrows = zeroBI();
    reserveParamsHistoryItem.lifetimeRepayments = zeroBI();
    reserveParamsHistoryItem.lifetimeWithdrawals = zeroBI();
    reserveParamsHistoryItem.lifetimeLiquidated = zeroBI();

    reserveParamsHistoryItem.lifetimeReserveFactorAccrued = zeroBI();
    reserveParamsHistoryItem.lifetimeDepositorsInterestEarned = zeroBI();
  }
  return reserveParamsHistoryItem as ReserveParamsHistoryItem;
}

export function getOrInitReserveConfigurationHistoryItem(
  id: Bytes,
  reserve: Reserve
): ReserveConfigurationHistoryItem {
  let reserveConfigurationHistoryItem = ReserveConfigurationHistoryItem.load(id.toHexString());
  if (!reserveConfigurationHistoryItem) {
    reserveConfigurationHistoryItem = new ReserveConfigurationHistoryItem(id.toHexString());
    reserveConfigurationHistoryItem.usageAsCollateralEnabled = false;
    reserveConfigurationHistoryItem.borrowingEnabled = false;
    reserveConfigurationHistoryItem.isActive = false;
    reserveConfigurationHistoryItem.reserveInterestRateStrategy = new Bytes(1);
    reserveConfigurationHistoryItem.baseLTVasCollateral = zeroBI();
    reserveConfigurationHistoryItem.reserveLiquidationThreshold = zeroBI();
    reserveConfigurationHistoryItem.reserveLiquidationBonus = zeroBI();
    reserveConfigurationHistoryItem.reserve = reserve.id;
  }
  return reserveConfigurationHistoryItem as ReserveConfigurationHistoryItem;
}

export function calculateGrowth(
    amount: BigInt,
    rate: BigInt,
    lastUpdatedTimestamp: BigInt,
    nowTimestamp: BigInt
  ): BigInt {
    let growthRate = calculateLinearInterest(rate, lastUpdatedTimestamp, nowTimestamp);
  
    let growth = rayMul(wadToRay(amount), growthRate);
  
    return rayToWad(growth);
}