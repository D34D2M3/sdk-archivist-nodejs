/*
 * @Author: XY | The Findables Company <xyo-network>
 * @Date:   Thursday, 14th February 2019 2:25:39 pm
 * @Email:  developer@xyfindables.com
 * @Filename: entities.ts

 * @Last modified time: Thursday, 14th February 2019 2:26:54 pm
 * @License: All Rights Reserved
 * @Copyright: Copyright XY | The Findables Company
 */

import { IXyoDataResolver } from '../../graphql-server'
import { GraphQLResolveInfo } from 'graphql'
import { IXyoArchivistRepository } from '../../repository'

export const serviceDependencies = ['archivistRepository']

export class GetEntitiesResolver implements IXyoDataResolver<any, any, any, any> {

  public static query = 'entities(limit: Int!, cursor: String): XyoEntitiesList!'
  public static dependsOnTypes = ['XyoEntitiesList']

  constructor(private readonly archivistRepository: IXyoArchivistRepository) {}

  public async resolve(obj: any, args: any, context: any, info: GraphQLResolveInfo): Promise<any> {
    const result = await this.archivistRepository.getEntities(
      args.limit as number,
      args.cursor || undefined
    )

    return {
      meta: {
        totalCount: result.total,
        hasNextPage: result.items.length === args.limit,
        endCursor: result.items.length > 0 ? result.items[result.items.length - 1] : undefined
      },
      items: result.items.map((listItem: any) => {
        return {
          firstKnownPublicKey: listItem.firstKnownPublicKey.serializeHex(),
          allPublicKeys: (listItem.allPublicKeys || []).map((pk: any) => pk.serializeHex()),
          type: listItem.type,
          mostRecentIndex: listItem.mostRecentIndex
        }
      })
    }
  }
}
