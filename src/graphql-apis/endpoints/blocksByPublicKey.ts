/*
 * @Author: XY | The Findables Company <xyo-network>
 * @Date:   Thursday, 14th February 2019 2:50:26 pm
 * @Email:  developer@xyfindables.com
 * @Filename: blocksByPublicKey.ts

 * @Last modified time: Thursday, 14th February 2019 2:53:21 pm
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { IXyoDataResolver } from '../../graphql-server'
import { XyoBase } from '@xyo-network/sdk-base-nodejs'
import { IXyoArchivistRepository } from '../../repository'
import bs58 from 'bs58'
import { bufferToGraphQlBlock } from './buffer-to-graphql-block'

export const serviceDependencies = ['archivistRepository', 'hashProvider', 'serializationService']

export class XyoGetBlocksByPublicKeyResolver extends XyoBase implements IXyoDataResolver<any, any, any, any> {

  public static query = 'blocksByPublicKey(publicKey: String!, limit: Int, cursor: String): [XyoBlockCollection]'
  public static dependsOnTypes = ['XyoBlockCollection']

  constructor(
    private readonly archivistRepository: IXyoArchivistRepository
  ) {
    super()
  }

  public async resolve(obj: any, args: any, context: any, info: any): Promise<any> {
    if (!args || !args.publicKey || !args.publicKeys.length) {
      return []
    }

    const innerBlocks = await this.getBlockCollectionForPublicKey(args.publicKey, args.limit, args.cursor)

    return innerBlocks
  }

  private getCursor(string: string | undefined): Buffer | undefined {
    if (string && string !== '') {
      return bs58.decode(string)
    }

    return undefined
  }

  private async getBlockCollectionForPublicKey(publicKey: string, limit: number | undefined, cursor: string | undefined) {
    try {
      const blocksByPublicKeySet = await this.archivistRepository.getOriginBlocksByPublicKey(bs58.decode(publicKey), this.getCursor(cursor), limit)

      const serializedBoundWitnesses = await Promise.all(blocksByPublicKeySet.items.map(async(block: Buffer) => {
        return bufferToGraphQlBlock(block)
      }))

      return {
        blocks: serializedBoundWitnesses
      }

    } catch (e) {
      this.logError(`There was an error getting block-collection from public-key ${e}`)
      return {
        blocks: [],
        keySet: [publicKey]
      }
    }
  }
}
