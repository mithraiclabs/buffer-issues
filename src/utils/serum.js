import {
  Account,
  PublicKey,
} from '@solana/web3.js'

import { Market } from '@project-serum/serum'
import BN from 'bn.js'
import { Buffer } from 'buffer'


export class SerumMarket {
  /**
   *
   * @param {Connection} connection
   * @param {PublicKey} marketAddress
   * @param {PublicKey} dexProgramKey
   */
  constructor(connection, marketAddress, dexProgramKey) {
    this.connection = connection
    this.marketAddress = marketAddress
    this.dexProgramKey = dexProgramKey
  }

  async initMarket() {
    this.market = await this.getMarket()
  }

  /**
   * Returns the first available SerumMarket for specified assets
   *
   * @param {Connect} connection
   * @param {PublicKey} baseMintAddress
   * @param {PublicKey} quoteMintAddress
   * @param {PublicKey} dexProgramKey
   */
  static async findByAssets(
    connection,
    baseMintAddress,
    quoteMintAddress,
    dexProgramKey,
  ) {
    const availableMarkets = await SerumMarket.getMarketByAssetKeys(
      connection,
      baseMintAddress,
      quoteMintAddress,
      dexProgramKey,
    )
    if (availableMarkets.length) {
      const market = new SerumMarket(
        connection,
        availableMarkets[0].publicKey,
        dexProgramKey,
      )
      await market.initMarket()
      return market
    }
    return null
  }

  /**
   * Look up a Serum market via the Base and Quote mint addresses.
   * @param {PublicKey} baseMintAddress
   * @param {PublicKey} quoteMintAddress
   * @param {PublicKey} dexProgramId
   */
  static async getMarketByAssetKeys(
    connection,
    baseMintAddress,
    quoteMintAddress,
    dexProgramId,
  ) {
    const filters = [
      {
        memcmp: {
          offset: Market.getLayout(dexProgramId).offsetOf('baseMint'),
          bytes: baseMintAddress.toBase58(),
        },
      },
      {
        memcmp: {
          offset: Market.getLayout(dexProgramId).offsetOf('quoteMint'),
          bytes: quoteMintAddress.toBase58(),
        },
      },
    ]
    const resp = await connection._rpcRequest('getProgramAccounts', [
      dexProgramId.toBase58(),
      {
        commitment: connection.commitment,
        filters,
        encoding: 'base64',
      },
    ])
    if (resp.error) {
      throw new Error(resp.error.message)
    }
    return resp.result.map(
      ({ pubkey, account: { data, executable, owner, lamports } }) => ({
        publicKey: new PublicKey(pubkey),
        accountInfo: {
          data: Buffer.from(data[0], 'base64'),
          executable,
          owner: new PublicKey(owner),
          lamports,
        },
      }),
    )
  }

  /**
   *
   * @param {Connection} connection
   * @param {PublicKey} marketAddress
   */
  async getMarket() {
    return Market.load(
      this.connection,
      this.marketAddress,
      {},
      this.dexProgramKey,
    )
  }

  /**
   * Returns the highest bid price and lowest ask price for a market
   */
  async getBidAskSpread() {
    if (!this.market) {
      return { bid: null, ask: null }
    }
    const bidOrderbook = await this.market.loadBids(this.connection)
    const askOrderbook = await this.market.loadAsks(this.connection)

    const highestbid = bidOrderbook.getL2(1)[0]
    const lowestAsk = askOrderbook.getL2(1)[0]
    return { bid: highestbid[0], ask: lowestAsk[0] }
  }

  /**
   * Returns full orderbook up to specified depth
   * @param {number} depth
   * @param {number} roundTo -- TODO: merge orderbook rows by rounding the prices to a number of decimals
   * @returns {{ bids[[ price, size ]], asks[[ price, size ]]}}
   */
  async getOrderbook(depth = 20) {
    try {
      const [bidOrderbook, askOrderbook] = await Promise.all([
        this.market.loadBids(this.connection),
        this.market.loadAsks(this.connection),
      ])

      return {
        bids: !bidOrderbook
          ? []
          : bidOrderbook.getL2(depth).map(([price, size]) => ({ price, size })),
        asks: !askOrderbook
          ? []
          : askOrderbook.getL2(depth).map(([price, size]) => ({ price, size })),
      }
    } catch (err) {
      console.error(err);
      return {
        bids: [],
        asks: [],
      }
    }
  }

  async getPrice() {
    const { bid, ask } = await this.getBidAskSpread()
    return (ask - bid) / 2 + bid
  }

  /**
   * @typedef PlaceOrderOptions
   * @property {BN} clientId - (not 100% sure) The ID to collect commissions from serum
   * @property {PublicKey | undefined} openOrdersAddressKey - This account stores the following:
   *   How much of the base and quote currency that user has locked in open orders or settleableA
   *   list of open orders for that user on that market.
   *   This is an option because the Market#makePlaceOrderTransaction function will look up
   *   OpenOrder accounts by owner.
   * @property {Account | undefined} openOrdersAccount - See above as well
   * @property {PublicKey | undefined} feeDiscountPubkey -
   */

  /**
   *
   * @param {PublicKey} owner - the wallet's PublicKey
   * @param {PublicKey} payer - The account that will be putting up the asset. If the order side
   * is 'sell', this must be an account holding the Base currency. If the order side is 'buy',
   * this must be an account holding the Quote currency.
   * @param {'buy'|'sell'} side - buying or selling the asset
   * @param {number} price - price of asset relative to quote asset
   * @param {number} size - amount of asset
   * @param {'limit' | 'ioc' | 'postOnly' | undefined} orderType - type of order
   * @param {PlaceOrderOptions} opts
   * @return {{
   *  transaction: placeOrderTx,
   *  signers: placeOrderSigners
   * }}
   */
  async createPlaceOrderTx({
    connection,
    owner,
    payer,
    side,
    price,
    size,
    orderType,
    opts = {},
  }) {
    const {clientId, openOrdersAddressKey, openOrdersAccount, feeDiscountPubkey} = opts;

    return this.market.makePlaceOrderTransaction(connection, {
      owner,
      payer,
      side,
      price,
      size,
      orderType,
      clientId,
      openOrdersAddressKey,
      openOrdersAccount,
      feeDiscountPubkey,
    })
  }
}
