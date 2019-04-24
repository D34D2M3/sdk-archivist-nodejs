/*
 * File: xyo-dynamo-archivist-repository.ts
 * Project: sdk-archivist-nodejs
 * File Created: Tuesday, 16th April 2019 2:04:07 pm
 * Author: XYO Development Team (support@xyo.network)
 * -----
 * Last Modified: Wednesday, 24th April 2019 11:15:14 am
 * Modified By: XYO Development Team (support@xyo.network>)
 * -----
 * Copyright 2017 - 2019 XY - The Persistent Company
 */

import {
  IXyoArchivistRepository
} from '..'

import { XyoBase } from '@xyo-network/base'

import _ from 'lodash'
import { XyoError } from '@xyo-network/errors'
import { BoundWitnessTable } from './table/boundwitness'
import { PublicKeyTable } from './table/publickey'
import crypto from 'crypto'
import { XyoBoundWitness } from '@xyo-network/sdk-core-nodejs'

// Note: We use Sha1 hashes in DynamoDB to save space!  All functions calling to the tables
// must use shortHashes (sha1)

export class XyoArchivistDynamoRepository extends XyoBase implements IXyoArchivistRepository {

  private boundWitnessTable: BoundWitnessTable
  private publicKeyTable: PublicKeyTable

  constructor(
    tablePrefix: string = 'xyo-archivist',
    region: string = 'us-east-1'
  ) {
    super()
    this.boundWitnessTable = new BoundWitnessTable(`${tablePrefix}-boundwitness`, region)
    this.publicKeyTable = new PublicKeyTable(`${tablePrefix}-publickey`, region)
  }

  public async initialize() {
    this.boundWitnessTable.initialize()
    this.publicKeyTable.initialize()
    return true
  }

  public async getOriginBlocksByPublicKey(publicKey: Buffer): Promise<{items: Buffer[], total: number}> {
    const shortKey = this.sha1(publicKey)
    const scanResult = await this.publicKeyTable.scanByKey(shortKey, 100)

    const result: Buffer[] = []

    for (const hash of scanResult.items) {
      const data = await this.boundWitnessTable.getItem(hash)
      result.push(data)
    }
    return { items: result, total:scanResult.total }
  }

  public async getIntersections(
    publicKeyA: Buffer,
    publicKeyB: Buffer,
    limit: number,
    cursor: Buffer | undefined
  ): Promise<Buffer[]> {
    throw new XyoError('getIntersections: Not Implemented')
    return []
  }

  public async getEntities(limit: number, offsetCursor?: Buffer | undefined): Promise<{items: Buffer[], total: number}> {
    throw new XyoError('getEntities: Not Implemented')
    return { items: [], total: 0 }
  }

  public async removeOriginBlock(hash: Buffer): Promise<void> {
    const shortHash = this.sha1(hash)
    return this.boundWitnessTable.deleteItem(shortHash)
  }

  public async containsOriginBlock(hash: Buffer): Promise<boolean> {
    const shortHash = this.sha1(hash)
    return this.boundWitnessTable.getItem(shortHash)
  }

  public async getAllOriginBlockHashes(): Promise<Buffer[]> {
    throw new XyoError('getAllOriginBlockHashes: Not Implemented')
    return []
  }

  public async addOriginBlock(
    hash: Buffer,
    originBlock: Buffer
  ): Promise<void> {
    try {
      const shortHash = this.sha1(hash)
      const bw = new XyoBoundWitness(originBlock)
      for (const pks of bw.getPublicKeys()) {
        for (const pk of pks) {
          const shortKey = this.sha1(pk.getValue().getContentsCopy())
          await this.publicKeyTable.putItem(shortKey, shortHash)
        }
      }
      return await this.boundWitnessTable.putItem(shortHash, originBlock)
    } catch (ex) {
      this.logError(ex)
      throw ex
    }
  }

  public async getOriginBlock(hash: Buffer): Promise < Buffer | undefined > {
    const shortHash = this.sha1(hash)
    const data = await this.boundWitnessTable.getItem(shortHash)
    if (data) {
      return data
    }
  }

  public async getOriginBlocks(limit: number, offsetHash ?: Buffer | undefined): Promise < Buffer[] > {
    const shortOffsetHash = offsetHash ? this.sha1(offsetHash) : undefined
    const items = await this.boundWitnessTable.scan(limit, shortOffsetHash)
    const result: Buffer[] = []
    for (const item of items) {
      result.push(item)
    }
    return result
  }

  private sha1(data: Buffer) {
    return crypto.createHash('sha1').update(data).digest()
  }
}
